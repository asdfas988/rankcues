import { cookies } from "next/headers";

export const SESSION_COOKIE = "rankcues_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type RankCuesSession = {
  email: string;
  googleSubject: string;
  workspaceId: string;
  issuedAt: number;
  expiresAt: number;
};

function sessionSecret() {
  const secret = process.env.SESSION_SECRET || process.env.APP_ENCRYPTION_KEY;
  if (!secret) throw new Error("The application session secret is not configured.");
  return secret;
}

function encode(value: string | Uint8Array) {
  return Buffer.from(value).toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url");
}

async function signingKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionToken(input: {
  email: string;
  googleSubject: string;
  workspaceId: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  const payload: RankCuesSession = {
    email: input.email.trim().toLowerCase(),
    googleSubject: input.googleSubject,
    workspaceId: input.workspaceId,
    issuedAt: now,
    expiresAt: now + SESSION_MAX_AGE,
  };
  const encodedPayload = encode(JSON.stringify(payload));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(),
    new TextEncoder().encode(encodedPayload),
  );
  return `${encodedPayload}.${encode(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string | null | undefined) {
  if (!token) return null;
  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(),
      decode(encodedSignature),
      new TextEncoder().encode(encodedPayload),
    );
    if (!valid) return null;
    const payload = JSON.parse(decode(encodedPayload).toString("utf8")) as RankCuesSession;
    if (
      !payload.email ||
      !payload.googleSubject ||
      !payload.workspaceId ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt <= Math.floor(Date.now() / 1000)
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionTokenFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(value.join("="));
  }
  return null;
}

export async function getCurrentSession() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function getRequestSession(request: Request) {
  return verifySessionToken(sessionTokenFromRequest(request));
}

export async function authorizeApiRequest(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return Response.json(
      { status: "unauthorized", message: "Sign in with your approved Google account." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      return Response.json(
        { status: "forbidden", message: "Cross-site requests are not allowed." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }
  }
  return session;
}

export function isAuthFailure(value: RankCuesSession | Response): value is Response {
  return value instanceof Response;
}
