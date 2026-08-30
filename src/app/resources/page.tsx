import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays } from "lucide-react";
import { MarketingHeader } from "@/components/rankcues-ui";
import { resourceArticles } from "@/lib/resource-articles";

export const metadata: Metadata = {
  title: "SEO Investigation Resources",
  description: "Evidence-first guides for content decay, cannibalization, internal links, analytics discrepancies and SEO change tracking.",
  alternates: { canonical: "/resources" },
};

export default function ResourcesPage() {
  const [featured, ...articles] = resourceArticles;
  return (
    <main className="min-h-screen bg-[#fafbfc] text-[#0f1223]">
      <MarketingHeader variant="light" />
      <header className="border-b border-[#0f1223]/8 bg-white px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-[1180px]"><p className="section-kicker">Research library</p><h1 className="mt-5 max-w-[900px] text-[clamp(3.25rem,7vw,6.5rem)] font-semibold leading-[0.92] tracking-[-0.055em]">Practical SEO diagnosis, with the evidence left in.</h1><p className="mt-7 max-w-2xl text-base leading-8 text-[#667085]">Field guides for separating detection, correlation and causation. Each page is built from a focused US SERP review, source-page inspection and RankCues&apos; measurement methodology.</p></div>
      </header>
      <section className="px-5 py-12 sm:px-8 lg:px-12 lg:py-16"><div className="mx-auto max-w-[1180px]">
        <Link href={`/resources/${featured.slug}`} className="group grid overflow-hidden border-y border-[#cbd5e1] py-7 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14 lg:py-10"><div><span className="flex size-11 items-center justify-center rounded-lg bg-[#111318] text-white"><BookOpen size={18} /></span><p className="mt-5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#4f46e5]">Featured / {featured.category}</p></div><div><h2 className="text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">{featured.title}</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-[#667085]">{featured.dek}</p><span className="mt-6 inline-flex items-center gap-2 text-xs font-semibold group-hover:text-[#4f46e5]">Read the guide <ArrowRight size={13} /></span></div></Link>
        <div className="mt-10 grid gap-x-6 gap-y-10 md:grid-cols-2">{articles.map((article) => <article key={article.slug} className="border-t border-[#cbd5e1] pt-5"><div className="flex items-center justify-between gap-4 font-mono text-[9px] uppercase tracking-[0.1em] text-[#98a2b3]"><span>{article.category}</span><span className="inline-flex items-center gap-1.5"><CalendarDays size={11} /> Aug 30, 2026</span></div><h2 className="mt-4 text-2xl font-semibold leading-8 tracking-[-0.035em]"><Link href={`/resources/${article.slug}`} className="hover:text-[#4f46e5]">{article.title}</Link></h2><p className="mt-3 text-sm leading-7 text-[#667085]">{article.dek}</p><div className="mt-5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[8px] uppercase text-[#667085]">{[article.primaryKeyword, ...article.secondaryKeywords.slice(0, 1)].map((keyword) => <span key={keyword}>{keyword}</span>)}</div><Link href={`/resources/${article.slug}`} className="mt-5 inline-flex items-center gap-2 text-[11px] font-semibold">Read {article.readingMinutes} min guide <ArrowRight size={12} /></Link></article>)}</div>
      </div></section>
    </main>
  );
}
