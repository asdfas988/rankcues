import type { MetadataRoute } from "next";
import { resourceArticles } from "@/lib/resource-articles";
import { publicSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicSiteUrl;
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/features/automated-seo-reports`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/resources`, changeFrequency: "weekly", priority: 0.8 },
    ...resourceArticles.map((article) => ({
      url: `${base}/resources/${article.slug}`,
      lastModified: article.updated,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
