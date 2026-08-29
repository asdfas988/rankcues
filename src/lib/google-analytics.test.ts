import { afterEach, describe, expect, it, vi } from "vitest";
import { listGoogleAnalyticsProperties } from "./google-analytics-admin";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listGoogleAnalyticsProperties", () => {
  it("loads every account-summary page from the stable Admin API", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({
        accountSummaries: [{
          account: "accounts/100",
          propertySummaries: [{ property: "properties/200", displayName: "Main site" }],
        }],
        nextPageToken: "next-page",
      }))
      .mockResolvedValueOnce(Response.json({
        accountSummaries: [{
          account: "accounts/101",
          propertySummaries: [{ property: "properties/201", displayName: "Store" }],
        }],
      }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listGoogleAnalyticsProperties("access-token")).resolves.toEqual([
      { accountId: "100", propertyId: "200", displayName: "Main site" },
      { accountId: "101", propertyId: "201", displayName: "Store" },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/v1beta/accountSummaries");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("pageToken=next-page");
  });

  it("treats an authorized account with no visible properties as a successful empty result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ accountSummaries: [] })));
    await expect(listGoogleAnalyticsProperties("access-token")).resolves.toEqual([]);
  });
});
