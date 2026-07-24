import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, RefreshCw, ScanSearch } from "lucide-react";
import { AppShell, MetricCard, PageHeader } from "@/components/rankcues-ui";
import { getSiteAnalytics, getSiteByIdOrUrl, getWeeklyEvidence } from "@/lib/data-store";
import { getLocale, pick } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: pick(locale, "Site performance", "网站表现", "Rendimiento del sitio") };
}
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

function number(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function propertyName(value: string) {
  return value.replace(/^sc-domain:/, "").replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function change(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function MiniTrend({ values }: { values: number[] }) {
  if (!values.length) return <div className="flex h-36 items-center justify-center text-[11px] text-[#98a2b3]">No daily data yet</div>;
  const max = Math.max(...values, 1);
  return <div className="flex h-36 items-end gap-1.5">{values.map((value, index) => <span key={index} className="min-w-0 flex-1 rounded-t-sm bg-[#7185ee] transition hover:bg-[#5268d9]" style={{ height: `${Math.max(4, (value / max) * 100)}%` }} title={`${value} clicks`} />)}</div>;
}

export default async function SitePage({ params }: Props) {
  const { slug } = await params;
  const site = await getSiteByIdOrUrl(decodeURIComponent(slug));
  if (!site) notFound();
  const [evidence, analytics, locale] = await Promise.all([getWeeklyEvidence(site.id), getSiteAnalytics(site.id), getLocale()]);
  const totals = (evidence?.comparison.totals ?? {}) as Record<string, unknown>;
  const currentClicks = number(totals.current_clicks);
  const previousClicks = number(totals.previous_clicks);
  const impressions = number(totals.current_impressions);
  const ctr = impressions ? (currentClicks / impressions) * 100 : 0;
  const clickChange = change(currentClicks, previousClicks);
  const latestPosition = analytics.daily.at(-1)?.position ?? 0;

  return (
    <AppShell active="/app/connect">
      <PageHeader
        kicker={pick(locale, "Site performance", "网站表现", "Rendimiento del sitio")}
        title={propertyName(site.siteUrl)}
        body={pick(locale, "Search Console metrics, query movement and sync history for this verified property.", "查看该已验证网站的 Search Console 指标、关键词变化和同步历史。", "Métricas de Search Console, movimientos de consultas e historial de sincronización.")}
        action={<div className="flex gap-2"><form action="/api/integrations/gsc/sync" method="post"><input type="hidden" name="siteId" value={site.id} /><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#111827] px-3.5 text-[11px] font-semibold text-white"><RefreshCw size={13} /> {pick(locale, "Sync GSC", "同步 GSC", "Sincronizar GSC")}</button></form><form action="/api/crawl/start" method="post"><input type="hidden" name="siteId" value={site.id} /><button className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dfe3eb] bg-white px-3.5 text-[11px] font-semibold"><ScanSearch size={13} /> {pick(locale, "Snapshot", "页面快照", "Captura")}</button></form></div>}
      />

      <div className="grid gap-4 px-4 pb-8 sm:px-6 lg:px-8">
        <Link href="/app/connect" className="inline-flex w-fit items-center gap-1.5 text-[11px] font-semibold text-[#667085]"><ArrowLeft size={13} /> All properties</Link>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Clicks · 7 days" value={compact(currentClicks)} detail={`${clickChange >= 0 ? "+" : ""}${clickChange.toFixed(1)}% vs previous week`} />
          <MetricCard label="Impressions · 7 days" value={compact(impressions)} detail="Imported Search Console rows" />
          <MetricCard label="CTR · 7 days" value={`${ctr.toFixed(2)}%`} detail="Clicks divided by impressions" />
          <MetricCard label="Average position" value={latestPosition ? latestPosition.toFixed(1) : "—"} detail="Latest available day" />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
          <div className="data-panel p-5"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">Daily clicks</p><h2 className="mt-1 text-base font-semibold">Last 28 days</h2><div className="mt-5"><MiniTrend values={analytics.daily.map((row) => row.clicks)} /></div><div className="mt-2 flex justify-between font-mono text-[9px] text-[#98a2b3]"><span>{analytics.daily[0]?.date ?? "—"}</span><span>{analytics.daily.at(-1)?.date ?? "—"}</span></div></div>
          <div className="data-panel p-5"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">Collection</p><h2 className="mt-1 text-base font-semibold">Latest sync</h2>{analytics.syncRuns[0] ? <div className="mt-5 grid gap-3 text-[11px]"><div className="flex justify-between border-b border-[#edf0f5] pb-3"><span className="text-[#8b94a5]">Status</span><span className="font-semibold text-[#087f6b]">{analytics.syncRuns[0].status}</span></div><div className="flex justify-between border-b border-[#edf0f5] pb-3"><span className="text-[#8b94a5]">Rows written</span><span className="font-mono">{analytics.syncRuns[0].rowsWritten.toLocaleString()}</span></div><div className="flex justify-between"><span className="text-[#8b94a5]">Started</span><span>{analytics.syncRuns[0].startedAt.toISOString().slice(0, 16).replace("T", " ")} UTC</span></div></div> : <p className="mt-5 text-[11px] leading-5 text-[#8b94a5]">No sync run has completed for this property.</p>}</div>
        </section>

        <section className="data-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e7eaf0] px-5 py-4"><div><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">Queries</p><h2 className="mt-1 text-base font-semibold">Top search queries</h2></div><span className="text-[10px] text-[#98a2b3]">Latest 7 days</span></div>
          {analytics.queries.length ? <div className="overflow-x-auto"><div className="min-w-[720px]"><div className="grid grid-cols-[minmax(320px,1fr)_90px_110px_90px_100px] gap-3 border-b border-[#edf0f5] bg-[#fafbfc] px-5 py-2.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[#8b94a5]"><span>Query</span><span>Clicks</span><span>Change</span><span>Impr.</span><span>Position</span></div>{analytics.queries.map((row) => { const rowChange = change(row.clicks, row.previousClicks); return <div key={row.query} className="grid grid-cols-[minmax(320px,1fr)_90px_110px_90px_100px] gap-3 border-b border-[#edf0f5] px-5 py-3 text-[11px] last:border-b-0"><span className="truncate font-medium">{row.query}</span><span className="font-mono">{row.clicks.toLocaleString()}</span><span className={`font-mono font-semibold ${rowChange >= 0 ? "text-[#087f6b]" : "text-[#b5473c]"}`}>{rowChange >= 0 ? "+" : ""}{rowChange.toFixed(1)}%</span><span className="font-mono">{compact(row.impressions)}</span><span className="font-mono">{row.position.toFixed(1)}</span></div>; })}</div></div> : <div className="px-5 py-12 text-center text-[11px] text-[#8b94a5]">No query rows are available yet.</div>}
        </section>

        <section className="data-panel overflow-hidden">
          <div className="border-b border-[#e7eaf0] px-5 py-4"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">Landing pages</p><h2 className="mt-1 text-base font-semibold">Top pages by clicks</h2></div>
          {analytics.pages.length ? <div className="overflow-x-auto"><div className="min-w-[720px]">{analytics.pages.slice(0, 15).map((row) => <div key={row.page} className="grid grid-cols-[minmax(420px,1fr)_100px_100px_100px] gap-3 border-b border-[#edf0f5] px-5 py-3 text-[11px] last:border-b-0"><span className="truncate text-[#344054]">{row.page}</span><span className="font-mono">{row.clicks.toLocaleString()} clicks</span><span className="font-mono">{compact(row.impressions)} impr.</span><span className="font-mono">Pos. {row.position.toFixed(1)}</span></div>)}</div></div> : <div className="px-5 py-12 text-center text-[11px] text-[#8b94a5]">No page rows are available yet.</div>}
        </section>
      </div>
    </AppShell>
  );
}
