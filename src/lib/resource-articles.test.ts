import { describe, expect, it } from "vitest";
import { resourceArticles } from "./resource-articles";

describe("resource article catalog", () => {
  it("keeps one unique primary keyword and slug per SKAG page", () => {
    expect(resourceArticles).toHaveLength(15);
    expect(new Set(resourceArticles.map((article) => article.slug)).size).toBe(resourceArticles.length);
    expect(new Set(resourceArticles.map((article) => article.primaryKeyword.toLowerCase())).size).toBe(resourceArticles.length);
  });

  it("ships each article with substantive evidence and SERP references", () => {
    for (const article of resourceArticles) {
      expect(article.title.toLowerCase()).toContain(article.primaryKeyword.split(" ")[0].toLowerCase());
      expect(article.description.length).toBeGreaterThanOrEqual(120);
      expect(article.sections.length).toBeGreaterThanOrEqual(5);
      expect(article.faq.length).toBeGreaterThanOrEqual(3);
      expect(article.sources.length).toBeGreaterThanOrEqual(9);
      expect(article.sources.every((source) => source.url.startsWith("https://"))).toBe(true);
    }
  });
});
