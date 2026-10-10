import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { AppShell, MetricCard, PageHeader } from "@/components/rankcues-ui";
import { getPersistencePublicStatus, getPortfolioOverview, getWorkspaceSetupProgress } from "@/lib/data-store";
import { WorkspaceOnboarding, WorkspaceNextStep } from "@/components/workspace-onboarding";
import { getLocale, pick, type AppLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: pick(locale, "Overview", "总览", "Resumen") };
}
export const dynamic = "force-dynamic";

// A site needs attention when clicks fell by at least this share week over
// week (and there was enough traffic for the change to mean something), or
// when its data has not been refreshed for STALE_DAYS.
const DROP_THRESHOLD = -10;
const MIN_PREVIOUS_CLICKS = 20;
const STALE_DAYS = 3;
// Only these event sources describe something done to a site (a page edit
// caught by a snapshot, or a fix being followed up); they become markers.
const CHANGE_SOURCES = new Set(["crawler", "automation"]);

type Portfolio = NonNullable<Awaited<ReturnType<typeof getPortfolioOverview>>>;

function compact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function delta(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function propertyName(value: string) {
  return value.replace(/^sc-domain:/, "").replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function formatDate(value: Date | null) {
  if (!value) return "Not synced";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(value);
}

function daysSince(value: Date | null) {
  if (!value) return Infinity;
  return (Date.now() - value.getTime()) / 86_400_000;
}

function TrendChart({ data, markers, locale }: { data: Portfolio["daily"]; markers: Portfolio["events"]; locale: AppLocale }) {
  if (!data.length) {
    return <div className="flex h-[200px] items-center justify-center text-[13px] text-[#838da3]">{pick(locale, "Sync a site to draw the trend.", "同步一个网站后即可显示趋势。", "Sincroniza un sitio para ver la tendencia.")}</div>;
  }
  const width = 760;
  const height = 200;
  const max = Math.max(...data.map((item) => item.clicks), 1);
  const x = (index: number) => (data.length === 1 ? width / 2 : (index / (data.length - 1)) * width);
  const y = (clicks: number) => height - 20 - (clicks / max) * (height - 44);
  const points = data.map((item, index) => `${x(index).toFixed(1)},${y(item.clicks).toFixed(1)}`).join(" ");
  const dayIndex = new Map(data.map((item, index) => [item.date, index]));
  const placed = markers
    .map((event) => ({ event, index: dayIndex.get(event.occurredAt.toISOString().slice(0, 10)) }))
    .filter((item): item is { event: Portfolio["events"][number]; index: number } => item.index !== undefined);
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[200px] w-full" role="img" aria-label={pick(locale, "Organic clicks over the last 28 days, with recorded site changes marked", "近 28 天自然点击，并标出记录到的网站改动", "Clics orgánicos de 28 días con cambios marcados")}>
        {[44, 92, 140, 180].map((line) => <line key={line} x1="0" x2={width} y1={line} y2={line} stroke="#eef0f5" strokeWidth="1" />)}
        {placed.map(({ event, index }) => (
          <g key={event.id}>
            <line x1={x(index)} x2={x(index)} y1="8" y2={height - 20} stroke="#d98a14" strokeWidth="1.5" strokeDasharray="3 4" />
            <circle cx={x(index)} cy="10" r="5" fill="#d98a14"><title>{`${event.title} · ${propertyName(event.siteUrl)}`}</title></circle>
          </g>
        ))}
        <polyline points={points} fill="none" stroke="#315efb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex justify-between text-[12px] text-[#838da3]"><span>{data[0]?.date}</span><span>{data.at(-1)?.date}</span></div>
    </div>
  );
}

export default async function OverviewPage() {
  const locale = await getLocale();
  const persistence = getPersistencePublicStatus();
  let portfolio: Awaited<ReturnType<typeof getPortfolioOverview>> = null;
  let dataUnavailable = !persistence.ready;
  let reportCount: number | null = null;
  if (persistence.ready) {
    const [overviewResult, setupResult] = await Promise.allSettled([getPortfolioOverview(), getWorkspaceSetupProgress()]);
    if (overviewResult.status === "fulfilled") { portfolio = overviewResult.value; dataUnavailable = portfolio === null; }
    else dataUnavailable = true;
    if (setupResult.status === "fulfilled") reportCount = setupResult.value.reportCount;
  }
  const sites = portfolio?.sites ?? [];
  const events = portfolio?.events ?? [];
  const changeMarkers = events.filter((event) => CHANGE_SOURCES.has(event.source));
  const currentClicks = sites.reduce((sum, site) => sum + site.currentClicks, 0);
  const previousClicks = sites.reduce((sum, site) => sum + site.previousClicks, 0);
  const change = delta(currentClicks, previousClicks);

  const ranked = sites
    .map((site) => {
      const siteDelta = delta(site.currentClicks, site.previousClicks);
      const stale = daysSince(site.lastSyncedAt) > STALE_DAYS;
      const dropped = site.previousClicks >= MIN_PREVIOUS_CLICKS && siteDelta <= DROP_THRESHOLD;
      return { site, siteDelta, stale, dropped };
    })
    // Biggest drops first, then stale data, then everything else by change.
    .sort((a, b) => Number(b.dropped) - Number(a.dropped) || Number(b.stale) - Number(a.stale) || a.siteDelta - b.siteDelta);
  const attention = ranked.filter((item) => item.dropped || item.stale);
  const siteEvents = new Map<string, number>();
  for (const event of changeMarkers) siteEvents.set(event.siteId, (siteEvents.get(event.siteId) ?? 0) + 1);

  return (
    <AppShell active="/app/overview" localizeChildren={false} locale={locale}>
      <PageHeader
        kicker={pick(locale, "Overview", "总览", "Resumen")}
        title={dataUnavailable
          ? pick(locale, "Workspace overview", "工作区总览", "Resumen del espacio")
          : !sites.length
            ? pick(locale, "Connect your first site", "先连接第一个网站", "Conecta tu primer sitio")
            : attention.length
              ? pick(locale, `${attention.length} of ${sites.length} sites need a look`, `${sites.length} 个网站中有 ${attention.length} 个需要查看`, `${attention.length} de ${sites.length} sitios necesitan revisión`)
              : pick(locale, `All ${sites.length} sites look steady`, `${sites.length} 个网站目前都很平稳`, `Los ${sites.length} sitios están estables`)}
        body={dataUnavailable
          ? pick(locale, "The latest data could not be loaded. Reload the page to try again.", "未能加载最新数据，请重新加载页面。", "No se pudieron cargar los datos. Recarga la página.")
          : sites.length
            ? pick(locale, "Clicks are compared week over week. Amber markers on the chart are changes recorded on your sites.", "点击按周对比。趋势图上的琥珀色标记是在你网站上记录到的改动。", "Los clics se comparan semana a semana. Las marcas ámbar son cambios registrados.")
            : pick(locale, "Your first report starts with Search Console. The steps below take a few minutes.", "第一份报告从 Search Console 开始，下面几步只需几分钟。", "Tu primer informe empieza con Search Console.")}
        action={sites.length ? (
          <form action="/api/integrations/gsc/sync-all" method="post">
            <button className="ws-button"><RefreshCw size={14} /> {pick(locale, "Sync all sites", "同步全部网站", "Sincronizar todos")}</button>
          </form>
        ) : undefined}
      />

      <div className="grid gap-5 px-4 pb-10 sm:px-6 lg:px-8">
        {dataUnavailable ? (
          <section className="data-panel p-6" role="alert">
            <h2 className="text-lg font-semibold">{pick(locale, "Workspace data is unavailable right now.", "暂时无法读取工作区数据。", "Los datos no están disponibles.")}</h2>
            <p className="mt-2 text-[14px] text-[#5d6882]">{pick(locale, "Your connections are still in place. Reload the page in a moment.", "已有连接不会丢失，请稍后重新加载页面。", "Tus conexiones siguen activas. Recarga en un momento.")}</p>
            <form action="/app/overview" method="get" className="mt-4"><button className="ws-button is-secondary"><RefreshCw size={14} /> {pick(locale, "Reload", "重新加载", "Recargar")}</button></form>
          </section>
        ) : !sites.length ? (
          <WorkspaceOnboarding locale={locale} />
        ) : (
          <>
            {reportCount !== null ? <WorkspaceNextStep locale={locale} reportCount={reportCount} syncedSiteId={sites.find((site) => site.lastSyncedAt && site.pageCount > 0)?.id} /> : null}

            {attention.length ? (
              <section aria-labelledby="attention-heading">
                <h2 id="attention-heading" className="text-[15px] font-bold">{pick(locale, "Needs a look", "需要查看", "Revisar")}</h2>
                <div className="ws-attention mt-3">
                  {attention.map(({ site, siteDelta, stale, dropped }) => (
                    <Link key={site.id} href={`/app/sites/${site.id}`} className={dropped ? "" : "is-stale"}>
                      <strong>{propertyName(site.siteUrl)}</strong>
                      {dropped
                        ? <span className="ws-chip is-down">{signed(siteDelta)} {pick(locale, "clicks", "点击", "clics")}</span>
                        : <span className="ws-chip is-change">{pick(locale, "Data out of date", "数据未更新", "Datos antiguos")}</span>}
                      <span>
                        {dropped
                          ? pick(locale, `${compact(site.previousClicks)} → ${compact(site.currentClicks)} clicks this week`, `本周点击 ${compact(site.previousClicks)} → ${compact(site.currentClicks)}`, `${compact(site.previousClicks)} → ${compact(site.currentClicks)} clics`)
                          : pick(locale, `Last synced ${formatDate(site.lastSyncedAt)} UTC`, `上次同步 ${formatDate(site.lastSyncedAt)} UTC`, `Última sincronización ${formatDate(site.lastSyncedAt)} UTC`)}
                        {dropped && stale ? pick(locale, " · data also out of date", "，且数据未更新", " · datos antiguos") : ""}
                        {siteEvents.get(site.id) ? pick(locale, ` · ${siteEvents.get(site.id)} recorded change(s)`, `，记录到 ${siteEvents.get(site.id)} 次改动`, ` · ${siteEvents.get(site.id)} cambio(s)`) : ""}
                      </span>
                      <ArrowRight size={16} className="text-[#838da3]" />
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="grid gap-3 sm:grid-cols-3">
              <MetricCard label={pick(locale, "Clicks, last 7 days", "近 7 天点击", "Clics, 7 días")} value={compact(currentClicks)} detail={pick(locale, `${signed(change)} vs previous 7 days`, `较前 7 天 ${signed(change)}`, `${signed(change)} vs 7 días previos`)} tone={change <= DROP_THRESHOLD ? "down" : change > 0 ? "up" : "neutral"} />
              <MetricCard label={pick(locale, "Sites connected", "已连接网站", "Sitios conectados")} value={String(sites.length)} detail={pick(locale, "Verified Search Console access", "已验证 Search Console 权限", "Acceso verificado")} />
              <MetricCard label={pick(locale, "Changes recorded, 21 days", "近 21 天记录的改动", "Cambios, 21 días")} value={String(changeMarkers.length)} detail={pick(locale, "Page snapshots and fix follow-ups", "来自页面快照和修复跟进", "Capturas y seguimiento de arreglos")} href="/app/audit" />
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.5fr)]">
              <div className="data-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="text-[15px] font-bold">{pick(locale, "Organic clicks, all sites, 28 days", "全部网站自然点击，近 28 天", "Clics orgánicos, 28 días")}</h2>
                  <span className="flex items-center gap-2 text-[12.5px] text-[#5d6882]"><span className="inline-block size-2.5 rounded-full bg-[#d98a14]" /> {pick(locale, "Recorded change", "记录到的改动", "Cambio registrado")}</span>
                </div>
                <div className="mt-4"><TrendChart data={portfolio?.daily ?? []} markers={changeMarkers} locale={locale} /></div>
              </div>
              <div className="data-panel p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[15px] font-bold">{pick(locale, "Latest changes", "最新改动", "Últimos cambios")}</h2>
                  <Link href="/app/audit" className="text-[13px] font-semibold text-[#315efb]">{pick(locale, "All changes", "全部改动", "Todos")}</Link>
                </div>
                <div className="mt-4 grid gap-3">
                  {events.length ? events.slice(0, 5).map((event) => (
                    <div key={event.id} className={`border-l-2 pl-3 ${CHANGE_SOURCES.has(event.source) ? "border-[#d98a14]" : "border-[#c5d0fb]"}`}>
                      <p className="text-[13.5px] font-semibold leading-5">{event.title}</p>
                      <p className="mt-0.5 truncate text-[12.5px] text-[#838da3]">{propertyName(event.siteUrl)} · {event.evidenceState}</p>
                    </div>
                  )) : <p className="rounded-lg bg-[#f7f8fb] p-4 text-[13px] leading-6 text-[#5d6882]">{pick(locale, "Nothing recorded yet. Page changes appear once a second snapshot can be compared with the first.", "暂无记录。第二次页面快照生成后，与第一次对比出的改动会出现在这里。", "Nada registrado todavía.")}</p>}
                </div>
              </div>
            </section>

            <section className="data-panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#e4e8f0] px-5 py-4">
                <h2 className="text-[15px] font-bold">{pick(locale, "All sites", "全部网站", "Todos los sitios")}</h2>
                <Link href="/app/connect" className="text-[13px] font-semibold text-[#315efb]">{pick(locale, "Manage sites", "管理网站", "Gestionar")}</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-[13.5px]">
                  <thead className="bg-[#fafbfd] text-[12.5px] text-[#5d6882]">
                    <tr>
                      <th className="px-5 py-3 font-semibold">{pick(locale, "Site", "网站", "Sitio")}</th>
                      <th className="px-3 py-3 font-semibold">{pick(locale, "Clicks, 7 days", "近 7 天点击", "Clics, 7 días")}</th>
                      <th className="px-3 py-3 font-semibold">{pick(locale, "Week over week", "周环比", "Semanal")}</th>
                      <th className="px-3 py-3 font-semibold">{pick(locale, "Queries", "查询词", "Consultas")}</th>
                      <th className="px-5 py-3 font-semibold">{pick(locale, "Last sync (UTC)", "上次同步（UTC）", "Última sinc. (UTC)")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map(({ site, siteDelta, stale }) => (
                      <tr key={site.id} className="border-t border-[#eef0f5] hover:bg-[#fafbff]">
                        <td className="px-5 py-3"><Link href={`/app/sites/${site.id}`} className="font-semibold text-[#17213b] hover:text-[#315efb]">{propertyName(site.siteUrl)}</Link></td>
                        <td className="px-3 py-3 tabular-nums">{compact(site.currentClicks)}</td>
                        <td className="px-3 py-3"><span className={`ws-chip ${siteDelta <= DROP_THRESHOLD ? "is-down" : siteDelta > 0 ? "is-up" : "is-flat"}`}>{signed(siteDelta)}</span></td>
                        <td className="px-3 py-3 tabular-nums">{site.queryCount.toLocaleString()}</td>
                        <td className={`px-5 py-3 ${stale ? "font-semibold text-[#9a5b00]" : "text-[#5d6882]"}`}>{formatDate(site.lastSyncedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
