import { describe, expect, it } from "vitest";
import { classifyGa4DiscoveryError } from "./google-analytics-errors";

describe("classifyGa4DiscoveryError", () => {
  it("identifies a disabled Analytics Admin API", () => {
    const issue = classifyGa4DiscoveryError(new Error(
      "Analytics property listing failed: Google Analytics Admin API has not been used in project 123 before or it is disabled. Enable it by visiting the API console.",
    ));
    expect(issue.code).toBe("api_disabled");
    expect(issue.reconnectRequired).toBe(false);
  });

  it("distinguishes missing OAuth scope from property permissions", () => {
    expect(classifyGa4DiscoveryError(new Error("ACCESS_TOKEN_SCOPE_INSUFFICIENT")).code).toBe("scope_missing");
    expect(classifyGa4DiscoveryError(new Error("403 PERMISSION_DENIED")).code).toBe("permission_denied");
  });

  it("returns safe messages without exposing Google's raw response", () => {
    const issue = classifyGa4DiscoveryError(new Error("unexpected project-specific response 8675309"));
    expect(issue).toEqual({
      code: "discovery_failed",
      message: "GA4 property discovery failed. Retry once; if it continues, reconnect the Google account.",
      reconnectRequired: false,
    });
  });
});
