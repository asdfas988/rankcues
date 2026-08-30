export type ArticleSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: { columns: string[]; rows: string[][] };
};

export type ResourceArticle = {
  slug: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  category: string;
  title: string;
  description: string;
  dek: string;
  takeaway: string;
  readingMinutes: number;
  published: string;
  updated: string;
  sections: ArticleSection[];
  faq: Array<{ question: string; answer: string }>;
  sources: Array<{ title: string; url: string }>;
};
