import { z } from "zod";

const accountSummariesSchema = z.object({
  accountSummaries: z.array(z.object({
    account: z.string(),
    displayName: z.string().optional(),
    propertySummaries: z.array(z.object({
      property: z.string(),
      displayName: z.string(),
    })).optional(),
  })).optional(),
  nextPageToken: z.string().optional(),
});

async function adminJson(response: Response) {
  const json = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    const nested = json?.error as Record<string, unknown> | undefined;
    const detail = typeof nested?.message === "string" ? nested.message : `${response.status} ${response.statusText}`;
    throw new Error(`Analytics property listing failed: ${detail}`);
  }
  return json;
}

export async function listGoogleAnalyticsProperties(accessToken: string) {
  const properties: Array<{ accountId: string; propertyId: string; displayName: string }> = [];
  let pageToken = "";
  do {
    const url = new URL("https://analyticsadmin.googleapis.com/v1beta/accountSummaries");
    url.searchParams.set("pageSize", "200");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const parsed = accountSummariesSchema.parse(await adminJson(response));
    for (const account of parsed.accountSummaries ?? []) {
      for (const property of account.propertySummaries ?? []) {
        properties.push({
          accountId: account.account.replace(/^accounts\//, ""),
          propertyId: property.property.replace(/^properties\//, ""),
          displayName: property.displayName,
        });
      }
    }
    pageToken = parsed.nextPageToken || "";
  } while (pageToken);
  return properties;
}
