import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth-session";
import {
  exchangeGoogleCode,
  getGoogleUserInfo,
  listGoogleSearchConsoleSites,
} from "@/lib/google-search-console";
import { listGoogleAnalyticsProperties } from "@/lib/google-analytics";
import { classifyGa4DiscoveryError } from "@/lib/google-analytics-errors";
import { authorizeGoogleIdentity, updateGa4DiscoveryStatus, upsertGa4Properties, upsertGoogleConnection, upsertGscSites } from "@/lib/data-store";

export const runtime = "nodejs";

function matchesState(received: string | null, expected: string | undefined) {
  if (!received || !expected) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

function cookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") || "";
  return cookieHeader
    .split(";")
    .map((part) => part.trim().split("="))
    .find(([cookieName]) => cookieName === name)?.slice(1).join("=");
}

function redirectWithStatus(request: Request, status: string, extra?: Record<string, string>) {
  const returnTo = decodeURIComponent(cookieValue(request, "rankcues_auth_return_to") || "/app/connect");
  const safeReturnTo = returnTo.startsWith("/app") && !returnTo.startsWith("//") ? returnTo : "/app/connect";
  const url = new URL(status === "connected" ? safeReturnTo : "/login", request.url);
  url.searchParams.set("google", status);
  for (const [key, value] of Object.entries(extra ?? {})) {
    url.searchParams.set(key, value);
  }
  const response = NextResponse.redirect(url);
  response.cookies.set("rankcues_google_oauth_state", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  response.cookies.set("rankcues_auth_return_to", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}

function failureStage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Token exchange")) return "token-exchange";
  if (message.includes("Search Console site listing")) return "search-console-api";
  if (message.includes("Google user lookup")) return "google-user-api";
  if (message.includes("required")) return "configuration";
  if (message.includes("database") || message.includes("relation") || message.includes("postgres")) return "database";
  return "callback";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("error")) {
    return redirectWithStatus(request, "denied");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = cookieValue(request, "rankcues_google_oauth_state");

  if (!code || !matchesState(state, expectedState)) {
    return redirectWithStatus(request, "invalid-state");
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    const [user, sites] = await Promise.all([
      getGoogleUserInfo(tokens.access_token),
      listGoogleSearchConsoleSites(tokens.access_token),
    ]);
    const access = await authorizeGoogleIdentity(user.email);
    if (!access) {
      return redirectWithStatus(request, "not-invited");
    }
    const connection = await upsertGoogleConnection({
      workspaceId: access.workspaceId,
      googleSubject: user.sub,
      email: user.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : undefined,
      scopes: tokens.scope?.split(/\s+/).filter(Boolean) ?? [],
    });
    await upsertGscSites(connection.id, sites, { workspaceId: access.workspaceId });
    let ga4Count = 0;
    let ga4Status = "connected";
    try {
      const properties = await listGoogleAnalyticsProperties(tokens.access_token);
      await upsertGa4Properties(connection.id, properties, { workspaceId: access.workspaceId });
      ga4Count = properties.length;
      ga4Status = properties.length ? "ready" : "empty";
      await updateGa4DiscoveryStatus({
        connectionId: connection.id,
        workspaceId: access.workspaceId,
        status: properties.length ? "ready" : "empty",
      });
    } catch (error) {
      const issue = classifyGa4DiscoveryError(error);
      ga4Status = issue.code;
      await updateGa4DiscoveryStatus({
        connectionId: connection.id,
        workspaceId: access.workspaceId,
        status: "failed",
        errorCode: issue.code,
        error: issue.message,
      });
      console.warn("Google OAuth completed but GA4 discovery was unavailable", issue.code);
    }
    const response = redirectWithStatus(request, "connected", {
      sites: String(sites.length),
      ga4: String(ga4Count),
      ga4Status,
    });
    response.cookies.set(SESSION_COOKIE, await createSessionToken({
      email: user.email,
      googleSubject: user.sub,
      workspaceId: access.workspaceId,
    }), {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Google OAuth callback failed", error);
    return redirectWithStatus(request, "error", { reason: failureStage(error) });
  }
}
