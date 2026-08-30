import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, ExternalLink, ShieldCheck } from "lucide-react";
import { MarketingHeader } from "@/components/rankcues-ui";
import type { ResourceArticle as ResourceArticleData } from "@/lib/resource-articles";
import { resourceArticles } from "@/lib/resource-articles";
import { publicSiteUrl } from "@/lib/site-url";

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function ResourceArticle({ article }: { article: ResourceArticleData }) {
  const related = resourceArticles.filter((item) => item.slug !== article.slug).slice(0, 3);
  const articleUrl = `${publicSiteUrl}/resources/${article.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.published,
    dateModified: article.updated,
    mainEntityOfPage: articleUrl,
    author: { "@type": "Organization", name: "RankCues Research Desk", url: `${publicSiteUrl}/about` },
    publisher: { "@type": "Organization", name: "RankCues", url: publicSiteUrl },
    keywords: [article.primaryKeyword, ...article.secondaryKeywords].join(", "),
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: article.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <main className="min-h-screen bg-[#fafbfc] text-[#0f1223]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(faqJsonLd) }} />
      <MarketingHeader variant="light" />

      <header className="border-b border-[#0f1223]/8 bg-white px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-[1120px]">
          <Link href="/resources" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4f46e5]">RankCues resources / {article.category}</Link>
          <h1 className="mt-5 max-w-[980px] text-[clamp(2.65rem,6vw,5.25rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-[#111318]">{article.title}</h1>
          <p className="mt-7 max-w-[820px] text-base leading-8 text-[#5f6675] sm:text-lg">{article.dek}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#0f1223]/8 pt-5 text-[11px] text-[#667085]">
            <span className="inline-flex items-center gap-2 font-semibold text-[#344054]"><ShieldCheck size={14} className="text-[#247c6c]" /> Reviewed by RankCues Research Desk</span>
            <span className="inline-flex items-center gap-2"><CalendarDays size={13} /> Updated Aug 30, 2026</span>
            <span className="inline-flex items-center gap-2"><Clock3 size={13} /> {article.readingMinutes} min read</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1120px] gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[220px_minmax(0,720px)] lg:px-12 lg:py-16">
        <aside className="h-fit lg:sticky lg:top-24">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#98a2b3]">In this guide</p>
          <nav className="mt-4 grid border-l border-[#dfe3eb]">
            {article.sections.map((section) => <a key={section.id} href={`#${section.id}`} className="border-l-2 border-transparent px-4 py-2 text-[11px] leading-5 text-[#667085] hover:border-[#6177f2] hover:text-[#111827]">{section.title}</a>)}
            <a href="#faq" className="border-l-2 border-transparent px-4 py-2 text-[11px] text-[#667085] hover:border-[#6177f2] hover:text-[#111827]">Frequently asked questions</a>
            <a href="#sources" className="border-l-2 border-transparent px-4 py-2 text-[11px] text-[#667085] hover:border-[#6177f2] hover:text-[#111827]">Sources and method</a>
          </nav>
        </aside>

        <article className="min-w-0">
          <section className="border-y border-[#cbd5e1] py-6">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#4f46e5]">The short answer</p>
            <p className="mt-3 text-lg font-semibold leading-8 tracking-[-0.02em] text-[#1d2939]">{article.takeaway}</p>
          </section>

          {article.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24 border-b border-[#e3e7ef] py-10 first:pt-12">
              <h2 className="text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#111318] sm:text-[2.15rem]">{section.title}</h2>
              <div className="mt-5 grid gap-4 text-[15px] leading-8 text-[#4b5565]">
                {(section.paragraphs ?? []).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              {section.bullets ? <ul className="mt-6 grid gap-3">{section.bullets.map((item) => <li key={item} className="flex gap-3 text-sm leading-7 text-[#4b5565]"><CheckCircle2 size={16} className="mt-1.5 shrink-0 text-[#247c6c]" />{item}</li>)}</ul> : null}
              {section.table ? (
                <div className="mt-7 overflow-x-auto border-y border-[#dfe3eb]">
                  <table className="w-full min-w-[640px] border-collapse text-left text-[11px] leading-5">
                    <thead className="bg-[#f2f4f7] font-mono text-[9px] uppercase tracking-[0.08em] text-[#667085]"><tr>{section.table.columns.map((column) => <th key={column} className="border-r border-[#dfe3eb] px-4 py-3 font-semibold last:border-r-0">{column}</th>)}</tr></thead>
                    <tbody className="divide-y divide-[#e3e7ef]">{section.table.rows.map((row) => <tr key={row.join("")}>{row.map((cell, index) => <td key={`${cell}-${index}`} className="border-r border-[#edf0f5] bg-white px-4 py-3 align-top text-[#475467] last:border-r-0">{cell}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ))}

          <section id="faq" className="scroll-mt-24 border-b border-[#e3e7ef] py-10">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#4f46e5]">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Frequently asked questions</h2>
            <div className="mt-6 divide-y divide-[#e3e7ef] border-y border-[#e3e7ef]">{article.faq.map((item) => <div key={item.question} className="py-5"><h3 className="text-sm font-semibold text-[#1d2939]">{item.question}</h3><p className="mt-2 text-sm leading-7 text-[#5f6675]">{item.answer}</p></div>)}</div>
          </section>

          <section id="sources" className="scroll-mt-24 py-10">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#4f46e5]">Sources and method</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em]">How this guide was prepared</h2>
            <p className="mt-4 text-sm leading-7 text-[#5f6675]">We reviewed the current US Google results for <strong className="text-[#344054]">{article.primaryKeyword}</strong>, inspected the recurring page structures and checked the source pages below. Product claims are described as claims, not independent validation. The guidance is also constrained by RankCues&apos; evidence model: detected facts, correlations and hypotheses remain separate.</p>
            <ol className="mt-5 grid gap-2 sm:grid-cols-2">{article.sources.map((source, index) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="group flex gap-3 border-t border-[#e3e7ef] py-3 text-[11px] leading-5 text-[#5f6675] hover:text-[#111827]"><span className="font-mono text-[9px] text-[#98a2b3]">{String(index + 1).padStart(2, "0")}</span><span className="flex-1">{source.title}</span><ExternalLink size={11} className="mt-1 shrink-0 opacity-40 group-hover:opacity-100" /></a></li>)}</ol>
          </section>
        </article>
      </div>

      <section className="border-y border-[#0f1223]/8 bg-[#101714] px-5 py-14 text-white sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1120px] gap-8 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#d8bb89]">Put the method to work</p><h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em]">Connect search movement to the changes that preceded it.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">RankCues combines GSC, GA4, crawl snapshots and a durable change ledger in reviewable investigations.</p></div><Link href="/login" className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-xs font-semibold text-[#111318]">Open private beta <ArrowRight size={14} /></Link></div>
      </section>

      <section className="px-5 py-14 sm:px-8 lg:px-12"><div className="mx-auto max-w-[1120px]"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#98a2b3]">Continue reading</p><div className="mt-5 grid gap-4 md:grid-cols-3">{related.map((item) => <Link key={item.slug} href={`/resources/${item.slug}`} className="group border-t border-[#cbd5e1] py-5"><p className="text-[10px] text-[#667085]">{item.category}</p><h3 className="mt-2 text-base font-semibold leading-6 tracking-[-0.025em] group-hover:text-[#4f46e5]">{item.title}</h3><span className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-semibold">Read guide <ArrowRight size={11} /></span></Link>)}</div></div></section>
    </main>
  );
}
