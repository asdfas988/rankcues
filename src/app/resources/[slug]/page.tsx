import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResourceArticle } from "@/components/resource-article";
import { getResourceArticle, resourceArticles } from "@/lib/resource-articles";

export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return resourceArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getResourceArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.description,
    keywords: [article.primaryKeyword, ...article.secondaryKeywords],
    alternates: { canonical: `/resources/${article.slug}` },
    openGraph: { type: "article", title: article.title, description: article.description, publishedTime: article.published, modifiedTime: article.updated },
  };
}

export default async function ResourceArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getResourceArticle(slug);
  if (!article) notFound();
  return <ResourceArticle article={article} />;
}
