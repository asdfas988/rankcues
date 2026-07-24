import { createSign } from "node:crypto";
import { z } from "zod";
import { upsertGoogleConnection, upsertGscSites } from "@/lib/data-store";
import { listGoogleSearchConsoleSites } from "@/lib/google-search-console";

const readonlyScope = "https://www.googleapis.com/auth/webmasters.readonly";
const defaultTokenUri = "https://oauth2.googleapis.com/token";
const requestTimeoutMs = 15_000;

const serviceAccountSchema = z.object({
  client_email: z.string().email(),
  private_key: z.string().min(1),
  token_uri: z.string().url().optional().default(defaultTokenUri),
});

const serviceTokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive().optional().default(3600),
});

type CachedToken = {
  clientEmail: string;
  accessToken: string;
  expiresAt: Date;
};

let cachedToken: CachedToken | undefined;

function getServiceAccountConfig() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is required.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }
  return serviceAccountSchema.parse(parsed);
}

function encodeJson(value: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function getGoogleServiceAccountPublicStatus() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return { configured: false, email: null };

  try {
    const config = serviceAccountSchema.parse(JSON.parse(raw));
    return { configured: true, email: config.client_email };
  } catch {
    return { configured: false, email: null };
  }
}

export function isGoogleServiceAccountSubject(subject: string) {
  return subject.startsWith("service-account:");
}

export async function getGoogleServiceAccountAccessToken() {
  const config = getServiceAccountConfig();
  if (
    cachedToken?.clientEmail === config.client_email &&
    cachedToken.expiresAt.getTime() > Date.now() + 5 * 60_000
  ) {
    return cachedToken;
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const unsignedJwt = `${encodeJson({ alg: "RS256", typ: "JWT" })}.${encodeJson({
    iss: config.client_email,
    scope: readonlyScope,
    aud: config.token_uri,
    iat: issuedAt,
    exp: issuedAt + 3600,
  })}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedJwt);
  signer.end();
  const assertion = `${unsignedJwt}.${signer.sign(config.private_key).toString("base64url")}`;

  const response = await fetch(config.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  const json = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    const detail =
      typeof json?.error_description === "string"
        ? json.error_description
        : typeof json?.error === "string"
          ? json.error
          : `${response.status} ${response.statusText}`;
    throw new Error(`Google service-account token exchange failed: ${detail}`);
  }

  const token = serviceTokenSchema.parse(json);
  cachedToken = {
    clientEmail: config.client_email,
    accessToken: token.access_token,
    expiresAt: new Date(Date.now() + token.expires_in * 1000),
  };
  return cachedToken;
}

export async function ensureGoogleServiceAccountConnection() {
  const config = getServiceAccountConfig();
  const token = await getGoogleServiceAccountAccessToken();
  const sites = await listGoogleSearchConsoleSites(token.accessToken);
  const connection = await upsertGoogleConnection({
    googleSubject: `service-account:${config.client_email}`,
    email: config.client_email,
    accessToken: token.accessToken,
    expiresAt: token.expiresAt,
    scopes: [readonlyScope],
  });
  await upsertGscSites(connection.id, sites, { preserveExistingConnection: true });
  return { connection, sites };
}
