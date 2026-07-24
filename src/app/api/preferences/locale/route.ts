import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { normalizeLocale } from "@/lib/i18n";
import { setWorkspaceLocale } from "@/lib/data-store";
import { readRequestData } from "@/lib/request-data";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const body = await readRequestData(request);
  const locale = normalizeLocale(body.locale);
  await setWorkspaceLocale(locale);
  const store = await cookies();
  store.set("rankcues_locale", locale, {
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  const referer = request.headers.get("referer");
  const destination = referer && new URL(referer).origin === new URL(request.url).origin
    ? referer
    : new URL("/app/overview", request.url).toString();
  return NextResponse.redirect(destination, 303);
}
