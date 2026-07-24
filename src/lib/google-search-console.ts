import { z } from "zod";

export const googleSearchConsoleScopes = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

const googleRequestTimeoutMs = 15_000;

const tokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().optional(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
  token_type: z.string().optional(),
});

const userInfoSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
});

const sitesSchema = z.object({
  siteEntry: z
    .array(
      z.object({
        siteUrl: z.string().min(1),
        permissionLevel: z.string().min(1),
      }),
    )
    .optional(),
});

const analyticsSchema = z.object({
  rows: z
    .array(
      z.object({
        keys: z.array(z.string()),
        clicks: z.number(),
        impressions: z.number(),
        ctr: z.number(),
        position: z.number(),
      }),
    )
    .optional(),
  responseAggregationType: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type GoogleTokenResponse = z.infer<typeof tokenSchema>;
export type GscSiteEntry = NonNullable<z.infer<typeof sitesSchema>["siteEntry"]>[number];
export type GscMetricRow = {
  date: string;
  page: string;
  query: string;
  device: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI are required.",
    );
  }

  return { clientId, clientSecret, redirectUri };
}

export function getGooglePublicStatus() {
  return {
    configured: Boolean(
      process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.GOOGLE_REDIRECT_URI,
    ),
    redirectUri: process.env.GOOGLE_REDIRECT_URI || null,
    scopes: googleSearchConsoleScopes,
  };
}

async function parseGoogleResponse(response: Response, label: string) {
  const json = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (!response.ok) {
    const detail =
      typeof json?.error_description === "string"
        ? json.error_description
        : typeof json?.error === "string"
          ? json.error
          : `${response.status} ${response.statusText}`;
    throw new Error(`${label} failed: ${detail}`);
  }
  return json;
}

export async function exchangeGoogleCode(code: string) {
  const config = getGoogleConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(googleRequestTimeoutMs),
  });

  return tokenSchema.parse(await parseGoogleResponse(response, "Token exchange"));
}

export async function refreshGoogleToken(refreshToken: string) {
  const config = getGoogleConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(googleRequestTimeoutMs),
  });

  return tokenSchema.parse(await parseGoogleResponse(response, "Token refresh"));
}

export async function getGoogleUserInfo(accessToken: string) {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(googleRequestTimeoutMs),
    },
  );

  const user = userInfoSchema.parse(
    await parseGoogleResponse(response, "Google user lookup"),
  );
  return { sub: user.id, email: user.email };
}

export async function listGoogleSearchConsoleSites(accessToken: string) {
  const response = await fetch(
    "https://www.googleapis.com/webmasters/v3/sites",
    {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(googleRequestTimeoutMs),
    },
  );
  const parsed = sitesSchema.parse(
    await parseGoogleResponse(response, "Search Console site listing"),
  );
  return parsed.siteEntry ?? [];
}

export async function queryGoogleSearchAnalytics(input: {
  accessToken: string;
  siteUrl: string;
  startDate: string;
  endDate: string;
  rowLimit?: number;
  maxRows?: number;
}) {
  const maxRows = Math.min(Math.max(input.maxRows ?? 50_000, 1), 50_000);
  const rowLimit = Math.min(
    Math.max(input.rowLimit ?? Math.min(maxRows, 5_000), 1),
    25_000,
    maxRows,
  );
  const rows: GscMetricRow[] = [];
  let startRow = 0;
  let metadata: Record<string, unknown> | undefined;

  while (rows.length < maxRows) {
    const response = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(input.siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          startDate: input.startDate,
          endDate: input.endDate,
          dimensions: ["date", "page", "query", "device"],
          type: "web",
          dataState: "final",
          aggregationType: "byPage",
          rowLimit,
          startRow,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(googleRequestTimeoutMs),
      },
    );
    const parsed = analyticsSchema.parse(
      await parseGoogleResponse(response, "Search Analytics query"),
    );
    const pageRows = parsed.rows ?? [];
    metadata = parsed.metadata;

    rows.push(
      ...pageRows.map((row) => ({
        date: row.keys[0] || input.startDate,
        page: row.keys[1] || input.siteUrl,
        query: row.keys[2] || "",
        device: row.keys[3] || "UNKNOWN",
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      })),
    );

    if (pageRows.length < rowLimit || rows.length >= maxRows) break;
    startRow += rowLimit;
  }

  return {
    rows: rows.slice(0, maxRows),
    truncated: rows.length >= maxRows,
    metadata,
  };
}
