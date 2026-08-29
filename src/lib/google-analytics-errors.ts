export type Ga4DiscoveryErrorCode =
  | "api_disabled"
  | "permission_denied"
  | "scope_missing"
  | "reauthorization_required"
  | "rate_limited"
  | "timeout"
  | "temporary_error"
  | "discovery_failed";

export type Ga4DiscoveryIssue = {
  code: Ga4DiscoveryErrorCode;
  message: string;
  reconnectRequired: boolean;
};

export function classifyGa4DiscoveryError(error: unknown): Ga4DiscoveryIssue {
  const detail = error instanceof Error ? error.message : String(error || "");
  const normalized = detail.toLowerCase();

  if (
    normalized.includes("insufficient authentication scopes")
    || normalized.includes("access_token_scope_insufficient")
    || normalized.includes("insufficient_scope")
  ) {
    return {
      code: "scope_missing",
      message: "Google authorization is missing Analytics read access. Reconnect Google and approve the Analytics permission.",
      reconnectRequired: true,
    };
  }

  if (
    normalized.includes("invalid_grant")
    || normalized.includes("token has been expired")
    || normalized.includes("token has been revoked")
    || normalized.includes("reconnect google")
  ) {
    return {
      code: "reauthorization_required",
      message: "The Google authorization has expired or was revoked. Reconnect the Google account, then discover GA4 properties again.",
      reconnectRequired: true,
    };
  }

  if (
    normalized.includes("service_disabled")
    || normalized.includes("api has not been used")
    || normalized.includes("it is disabled")
    || normalized.includes("api is disabled")
    || normalized.includes("enable it by visiting")
  ) {
    return {
      code: "api_disabled",
      message: "Google Analytics Admin API is not enabled for this OAuth project. Enable it in Google Cloud, wait a few minutes, then retry discovery.",
      reconnectRequired: false,
    };
  }

  if (
    normalized.includes("permission_denied")
    || normalized.includes("permission denied")
    || normalized.includes("403 forbidden")
  ) {
    return {
      code: "permission_denied",
      message: "Google denied access to Analytics resources. Confirm that this Google account has access to the GA4 property, then retry.",
      reconnectRequired: false,
    };
  }

  if (normalized.includes("429") || normalized.includes("rate limit") || normalized.includes("quota")) {
    return {
      code: "rate_limited",
      message: "Google Analytics discovery is temporarily rate limited. Wait a moment, then retry.",
      reconnectRequired: false,
    };
  }

  if (
    normalized.includes("timeout")
    || normalized.includes("timed out")
    || normalized.includes("aborterror")
    || normalized.includes("timeouterror")
  ) {
    return {
      code: "timeout",
      message: "Google Analytics discovery timed out. Check again in a moment.",
      reconnectRequired: false,
    };
  }

  if (
    normalized.includes("500")
    || normalized.includes("502")
    || normalized.includes("503")
    || normalized.includes("unavailable")
  ) {
    return {
      code: "temporary_error",
      message: "Google Analytics is temporarily unavailable. Try discovery again shortly.",
      reconnectRequired: false,
    };
  }

  return {
    code: "discovery_failed",
    message: "GA4 property discovery failed. Retry once; if it continues, reconnect the Google account.",
    reconnectRequired: false,
  };
}
