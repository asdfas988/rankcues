import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth-session";

const publicApiPaths = new Set([
  "/api/auth/google",
  "/api/auth/google/callback",
  "/api/auth/logout",
  "/api/health",
]);

const privateResponseHeaders = {
  "Content-Security-Policy":
    "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; upgrade-insecure-requests",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

function applyPrivateResponseHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(privateResponseHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApp = pathname === "/app" || pathname.startsWith("/app/");
  const isApi = pathname === "/api" || pathname.startsWith("/api/");
  const isCron = pathname.startsWith("/api/cron/");
  const isPublicApi = publicApiPaths.has(pathname) || isCron;
  const responseHeaders = new Headers(privateResponseHeaders);

  if ((isApp || (isApi && !isPublicApi))) {
    const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      if (isApi) {
        return NextResponse.json(
          { status: "unauthorized", message: "Sign in with your approved Google account." },
          { status: 401, headers: responseHeaders },
        );
      }
      const login = new URL("/login", request.url);
      login.searchParams.set("returnTo", `${pathname}${request.nextUrl.search}`);
      return applyPrivateResponseHeaders(NextResponse.redirect(login));
    }
  }

  const response = NextResponse.next();
  if (isApp || isApi) applyPrivateResponseHeaders(response);
  return response;
}

export const config = {
  matcher: ["/app/:path*", "/api/:path*"],
};
