import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, DatabaseZap, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { ActionLink, AppShell, MetricCard, PageHeader } from "@/components/rankcues-ui";
import { getPersistencePublicStatus, getPortfolioOverview } from "@/lib/data-store";
import { getLocale, pick } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: pick(locale, "Overview", "总览", "Resumen") };
}
export const dynamic = "force-dynamic";

function compact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function delta(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function propertyName(value: string) {
  return value.replace(/^sc-domain:/, "").replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function formatDate(value: Date | null) {
  if (!value) return "Not synced";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(value);
}

function TrendChart({ data }: { data: Array<{ date: string; clicks: number }> }) {
  if (!data.length) {
    return <div className="flex h-[190px] items-center justify-center text-xs text-[#98a2b3]">Sync a property to build the trend line.</div>;
  }
  const width = 760;
  const height = 190;
  const max = Math.max(...data.map((item) => item.clicks), 1);
  const points = data.map((item, index) => {
    const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
    const y = height - 18 - (item.clicks / max) * (height - 42);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const area = `0,${height} ${points} ${width},${height}`;
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[190px] w-full" role="img" aria-label="Organic clicks over the last 28 days">
        <defs>
          <linearGradient id="overview-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6177f2" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#6177f2" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[40, 85, 130, 175].map((y) => <line key={y} x1="0" x2={width} y1={y} y2={y} stroke="#edf0f5" strokeWidth="1" />)}
        <polygon points={area} fill="url(#overview-fill)" />
        <polyline points={points} fill="none" stroke="#6177f2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[9px] text-[#98a2b3]"><span>{data[0]?.date}</span><span>{data.at(-1)?.date}</span></div>
    </div>
  );
}

export default async function OverviewPage() {
  const locale = await getLocale();
  const persistence = getPersistencePublicStatus();
  let portfolio: Awaited<ReturnType<typeof getPortfolioOverview>> = null;
  if (persistence.ready) {
    try { portfolio = await getPortfolioOverview(); } catch { portfolio = null; }
  }
  const sites = portfolio?.sites ?? [];
  const events = portfolio?.events ?? [];
  const currentClicks = sites.reduce((sum, site) => sum + site.currentClicks, 0);
  const previousClicks = sites.reduce((sum, site) => sum + site.previousClicks, 0);
  const change = delta(currentClicks, previousClicks);
  const totalPages = sites.reduce((sum, site) => sum + site.pageCount, 0);
  const totalQueries = sites.reduce((sum, site) => sum + site.queryCount, 0);

  return (
    <AppShell active="/app/overview">
      <PageHeader
        kicker={pick(locale, "Overview", "总览", "Resumen")}
        title={sites.length ? pick(locale, "Your organic search portfolio, without the noise.", "看清你的自然搜索组合，不被噪音干扰。", "Tu portafolio orgánico, sin ruido.") : pick(locale, "Connect real search data to begin.", "连接真实搜索数据后开始。", "Conecta datos reales para empezar.")}
        body={sites.length ? pick(locale, "Every number below comes from a connected Search Console property. No sample sites or generated metrics are mixed in.", "下方所有数字均来自已连接的 Search Console，不混入演示网站或生成数据。", "Todos los datos proceden de Search Console, sin sitios de ejemplo ni métricas generadas.") : pick(locale, "RankCues is ready, but no verified Google account properties have been imported into this workspace.", "RankCues 已就绪，但当前工作区还没有导入已验证的 Google 网站。", "RankCues está listo, pero aún no se han importado propiedades verificadas.")}
        action={sites.length ? (
          <form action="/api/integrations/gsc/sync-all" method="post">
            <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#111827] px-3.5 text-[11px] font-semibold text-white"><RefreshCw size={13} /> {pick(locale, "Sync all sites", "同步全部网站", "Sincronizar todos")}</button>
          </form>
        ) : <ActionLink href="/api/auth/google">{pick(locale, "Connect Google", "连接 Google", "Conectar Google")} <ArrowRight size={13} /></ActionLink>}
      />

      <div className="grid gap-4 px-4 pb-8 sm:px-6 lg:px-8">
        {!persistence.ready ? (
          <div className="rounded-xl border border-[#f2c94c]/35 bg-[#fff8db] px-4 py-3 text-xs text-[#7a5a05]">Persistent storage is not configured. Live data cannot be displayed.</div>
        ) : null}

        {!sites.length ? (
          <section className="data-panel grid min-h-[420px] place-items-center px-6 py-16 text-center">
            <div className="max-w-md">
              <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#eef1ff] text-[#5268d9]"><DatabaseZap size={22} /></span>
              <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em]">No live properties yet</h2>
              <p className="mt-2 text-[12px] leading-6 text-[#667085]">Connect the Google account that owns your Search Console properties. RankCues will import every property returned by that account.</p>
              <Link href="/api/auth/google" className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[#6177f2] px-4 text-xs font-semibold text-white">Connect Google account <ArrowRight size={14} /></Link>
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Connected properties" value={String(sites.length)} detail="Verified Search Console access" />
              <MetricCard label="Clicks · latest 7 days" value={compact(currentClicks)} detail={`${change >= 0 ? "+" : ""}${change.toFixed(1)}% vs previous 7 days`} />
              <MetricCard label="Observed pages" value={compact(totalPages)} detail="Present in imported GSC rows" />
              <MetricCard label="Observed queries" value={compact(totalQueries)} detail="Across all connected properties" />
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.5fr)]">
              <div className="data-panel p-5">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">Organic clicks</p><h2 className="mt-1 text-base font-semibold">28-day portfolio trend</h2></div>
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold ${change >= 0 ? "bg-[#eafbf6] text-[#087f6b]" : "bg-[#fff0ee] text-[#b5473c]"}`}>{change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{Math.abs(change).toFixed(1)}%</span>
                </div>
                <div className="mt-4"><TrendChart data={portfolio?.daily ?? []} /></div>
              </div>
              <div className="data-panel p-5">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">Detected changes</p>
                <h2 className="mt-1 text-base font-semibold">Latest evidence</h2>
                <div className="mt-4 grid gap-3">
                  {events.length ? events.slice(0, 4).map((event) => (
                    <div key={event.id} className="border-l-2 border-[#7387ef] pl-3">
                      <p className="text-[11px] font-semibold leading-5">{event.title}</p>
                      <p className="mt-0.5 truncate text-[9px] text-[#8b94a5]">{propertyName(event.siteUrl)} · {event.evidenceState}</p>
                    </div>
                  )) : <div className="rounded-xl bg-[#f8fafc] p-4 text-[11px] leading-5 text-[#667085]">No material movements detected yet. More sync history is needed for week-over-week evidence.</div>}
                </div>
              </div>
            </section>

            <section className="data-panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#e7eaf0] px-5 py-4">
                <div><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">Properties</p><h2 className="mt-1 text-base font-semibold">Connected sites</h2></div>
                <Link href="/app/connect" className="text-[11px] font-semibold text-[#5268d9]">Manage connections</Link>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-[minmax(240px,1fr)_110px_110px_110px_150px_40px] gap-3 border-b border-[#edf0f5] bg-[#fafbfc] px-5 py-2.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[#8b94a5]"><span>Property</span><span>Clicks</span><span>Change</span><span>Queries</span><span>Last sync</span><span /></div>
                  {sites.map((site) => {
                    const siteDelta = delta(site.currentClicks, site.previousClicks);
                    return (
                      <Link key={site.id} href={`/app/sites/${site.id}`} className="grid grid-cols-[minmax(240px,1fr)_110px_110px_110px_150px_40px] items-center gap-3 border-b border-[#edf0f5] px-5 py-3.5 text-[11px] last:border-b-0 hover:bg-[#fafbff]">
                        <span><span className="block font-semibold text-[#111827]">{propertyName(site.siteUrl)}</span><span className="mt-1 block font-mono text-[9px] uppercase text-[#98a2b3]">{site.permissionLevel}</span></span>
                        <span className="font-mono font-medium">{compact(site.currentClicks)}</span>
                        <span className={`font-mono font-semibold ${siteDelta >= 0 ? "text-[#087f6b]" : "text-[#b5473c]"}`}>{siteDelta >= 0 ? "+" : ""}{siteDelta.toFixed(1)}%</span>
                        <span className="font-mono">{site.queryCount.toLocaleString()}</span>
                        <span className="text-[#667085]">{formatDate(site.lastSyncedAt)} UTC</span>
                        <ArrowRight size={14} className="text-[#98a2b3]" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
