import { describe, expect, it } from "vitest";
import {
  canTransitionLinkStatus,
  linkMatchesTarget,
  normalizePublicHttpsUrl,
  parseOpportunityImport,
  type LinkOpportunityStatus,
} from "./link-campaign-model";

describe("normalizePublicHttpsUrl", () => {
  it("normalizes a public HTTPS URL and removes its fragment", () => {
    expect(normalizePublicHttpsUrl("  https://Example.com/path?q=1#section  "))
      .toBe("https://example.com/path?q=1");
  });

  it.each([
    "http://example.com",
    "https://user:password@example.com",
    "https://example.com:8443/path",
    "https://localhost/path",
    "https://service.internal/path",
    "https://10.0.0.1/path",
    "https://127.0.0.1/path",
    "https://169.254.1.2/path",
    "https://192.168.1.10/path",
    "https://[::1]/path",
    "https://[fd00::1]/path",
  ])("rejects an unsafe URL: %s", (url) => {
    expect(normalizePublicHttpsUrl(url)).toBeNull();
  });

  it("accepts public IP addresses and the default HTTPS port", () => {
    expect(normalizePublicHttpsUrl("https://8.8.8.8:443/path"))
      .toBe("https://8.8.8.8/path");
  });
});

describe("parseOpportunityImport", () => {
  it("deduplicates normalized source/submission pairs", () => {
    const result = parseOpportunityImport([
      "# source | submission | name | policy",
      "https://directory.example/listing#top | https://directory.example/submit | Directory | https://directory.example/policy",
      "https://directory.example/listing | https://directory.example/submit | Duplicate",
      "https://second.example/page\thttps://second.example/apply\tSecond directory",
    ].join("\n"));

    expect(result.accepted).toHaveLength(2);
    expect(result.accepted[0]).toEqual({
      sourceUrl: "https://directory.example/listing",
      submissionUrl: "https://directory.example/submit",
      destinationName: "Directory",
      policyEvidenceUrl: "https://directory.example/policy",
    });
    expect(result.accepted[1].destinationName).toBe("Second directory");
    expect(result.errors).toEqual([]);
    expect(result.truncated).toBe(false);
  });

  it("reports unsafe rows without discarding valid rows", () => {
    const result = parseOpportunityImport([
      "http://unsafe.example | https://unsafe.example/submit",
      "https://valid.example/listing | https://valid.example/submit",
    ].join("\n"));

    expect(result.accepted).toHaveLength(1);
    expect(result.errors).toEqual([
      { line: 1, message: "Use public HTTPS URLs for the source and submission page." },
    ]);
  });

  it("enforces the import maximum", () => {
    const result = parseOpportunityImport([
      "https://one.example | https://one.example/submit",
      "https://two.example | https://two.example/submit",
      "https://three.example | https://three.example/submit",
    ].join("\n"), 2);

    expect(result.accepted).toHaveLength(2);
    expect(result.truncated).toBe(true);
  });
});

describe("canTransitionLinkStatus", () => {
  const allowed: Array<[LinkOpportunityStatus, LinkOpportunityStatus]> = [
    ["discovered", "approved"],
    ["approved", "submitted"],
    ["submitted", "pending_review"],
    ["pending_review", "published"],
    ["published", "verified"],
    ["verified", "removed"],
    ["needs_action", "approved"],
    ["rejected", "discovered"],
    ["removed", "published"],
  ];

  it.each(allowed)("allows %s -> %s", (from, to) => {
    expect(canTransitionLinkStatus(from, to)).toBe(true);
  });

  it("allows an idempotent transition", () => {
    expect(canTransitionLinkStatus("approved", "approved")).toBe(true);
  });

  it.each([
    ["discovered", "verified"],
    ["approved", "published"],
    ["submitted", "verified"],
    ["verified", "submitted"],
  ] satisfies Array<[LinkOpportunityStatus, LinkOpportunityStatus]>)
  ("rejects %s -> %s", (from, to) => {
    expect(canTransitionLinkStatus(from, to)).toBe(false);
  });
});

describe("linkMatchesTarget", () => {
  it("matches www aliases, trailing slashes, and additional tracking query strings", () => {
    expect(linkMatchesTarget(
      "https://www.example.com/product/?utm_source=directory",
      "https://example.com/product",
    )).toBe(true);
  });

  it.each([
    ["https://other.example/product", "https://example.com/product"],
    ["https://sub.example.com/product", "https://example.com/product"],
    ["https://example.com/other", "https://example.com/product"],
    ["https://example.com/Product", "https://example.com/product"],
    ["https://example.com/product?id=2", "https://example.com/product?id=1"],
    ["http://example.com/product", "https://example.com/product"],
  ])("does not match %s against %s", (candidate, target) => {
    expect(linkMatchesTarget(candidate, target)).toBe(false);
  });
});
