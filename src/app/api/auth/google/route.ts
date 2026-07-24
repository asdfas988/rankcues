import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  getGooglePublicStatus,
  googleSearchConsoleScopes,
} from "@/lib/google-search-console";
import { getPersistencePublicStatus } from "@/lib/data-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const google = getGooglePublicStatus();
  const persistence = getPersistencePublicStatus();
  if (!google.configured || !persistence.ready) {
    return Response.json(
      {
        status: "missing_configuration",
        message: !google.configured
          ? "Configure the Google OAuth environment variables first."
          : "Configure DATABASE_URL and APP_ENCRYPTION_KEY before storing OAuth tokens.",
        google,
        persistence,
      },
      { status: 503 },
    );
  }

  const state = randomBytes(32).toString("base64url");
  const requestedReturnTo = new URL(request.url).searchParams.get("returnTo") || "/app/overview";
  const returnTo = requestedReturnTo.startsWith("/app") && !requestedReturnTo.startsWith("//")
    ? requestedReturnTo
    : "/app/overview";
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", process.env.GOOGLE_REDIRECT_URI!);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent select_account");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("scope", googleSearchConsoleScopes.join(" "));
  url.searchParams.set("state", state);

  const response = NextResponse.redirect(url);
  response.cookies.set("rankcues_google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });
  response.cookies.set("rankcues_auth_return_to", returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });
  return response;
}
