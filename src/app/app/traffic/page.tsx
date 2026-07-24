import { BarChart3, Link2, RefreshCw } from "lucide-react";
import { AppShell, MetricCard, PageHeader } from "@/components/rankcues-ui";
import { DeltaBadge, EmptyData, Notice, SiteFilter, TrendBars } from "@/components/rankcues-dashboard";
import { getTrafficOverview, listGscSites } from "@/lib/data-store";
import { getLocale, pick } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function TrafficPage({ searchParams }: { searchParams: Promise<{ site?: string; sync?: string; ga4?: string }> }) {
  const params = await searchParams;
  const sites = (await listGscSites()).filter((item) => item.active && item.permissionLevel !== "siteUnverifiedUser");
  const [data, locale] = await Promise.all([getTrafficOverview(params.site), getLocale()]);
  const totals = data.totals;
  const mapped = data.properties.filter((property) => property.siteId).length;
  return (
    <AppShell active="/app/traffic">
      <PageHeader kicker={pick(locale, "Analytics context", "流量背景", "Contexto analítico")} title={pick(locale, "Organic visibility meets on-site outcomes", "把自然搜索曝光与站内结果连接起来", "Visibilidad orgánica conectada con resultados")} body={pick(locale, "Map GA4 properties to GSC sites, then compare landing-page sessions, engagement and key events with ranking and content changes.", "将 GA4 属性映射到 GSC 网站，对比落地页会话、互动与关键事件，并结合排名和内容变化分析。", "Asigna propiedades de GA4 a sitios de GSC y compara sesiones, interacción y eventos con cambios de ranking y contenido.")} action={<form action="/api/integrations/ga4/sync" method="post"><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#111827] px-3.5 text-[11px] font-semibold text-white"><RefreshCw size={13} /> {pick(locale, "Sync mapped properties", "同步已映射属性", "Sincronizar propiedades")}</button></form>} />
      <div className="grid gap-4 px-4 pb-8 sm:px-6 lg:px-8">
        {params.sync === "completed" ? <Notice tone="success">GA4 sync completed. The panels below now use stored production data.</Notice> : null}
        <SiteFilter sites={sites} selected={params.site} basePath="/app/traffic" />
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="data-card p-4"><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#8b94a5]">Sessions · 7d</p><div className="mt-2 flex items-center gap-3"><p className="text-2xl font-semibold tracking-[-0.04em]">{(totals?.sessions || 0).toLocaleString()}</p>{totals ? <DeltaBadge current={totals.sessions} previous={totals.previousSessions} /> : null}</div><p className="mt-1 text-[10px] text-[#8b94a5]">Compared with previous 7 days</p></div>
          <MetricCard label="Active users" value={(totals?.activeUsers || 0).toLocaleString()} detail="Latest comparable window" />
          <MetricCard label="Key events" value={(totals?.keyEvents || 0).toLocaleString()} detail="GA4 property definition" />
          <MetricCard label="Engagement rate" value={`${((totals?.engagementRate || 0) * 100).toFixed(1)}%`} detail={`Data through ${totals?.dataThrough || "not synced"}`} />
        </section>
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="data-panel p-5"><div className="flex items-center justify-between"><div><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">28-day signal</p><h2 className="mt-1 text-base font-semibold">Sessions trend</h2></div><BarChart3 size={17} className="text-[#667085]" /></div>{data.daily.length ? <div className="mt-6"><TrendBars values={data.daily.map((row) => row.sessions)} /><div className="mt-2 flex justify-between font-mono text-[8px] text-[#98a2b3]"><span>{data.daily[0]?.date}</span><span>{data.daily.at(-1)?.date}</span></div></div> : <div className="mt-5"><EmptyData title="No GA4 metrics yet" body="Reconnect Google to grant Analytics read access, discover properties, map each property to its GSC site, then sync." /></div>}</div>
          <div className="data-panel overflow-hidden"><div className="border-b border-[#e7eaf0] px-5 py-4"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">Property mapping</p><h2 className="mt-1 text-base font-semibold">{mapped}/{data.properties.length} mapped</h2></div><div className="divide-y divide-[#edf0f5]">{data.properties.map((property) => <form key={property.id} action="/api/integrations/ga4/map" method="post" className="grid gap-3 px-5 py-4"><input type="hidden" name="propertyId" value={property.id} /><div><p className="text-[11px] font-semibold">{property.displayName}</p><p className="mt-1 font-mono text-[9px] text-[#98a2b3]">properties/{property.propertyId}</p></div><div className="flex gap-2"><select name="siteId" defaultValue={property.siteId || ""} className="h-9 min-w-0 flex-1 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[10px]"><option value="">Not mapped</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.siteUrl.replace(/^sc-domain:/, "")}</option>)}</select><button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[10px] font-semibold"><Link2 size={12} /> Save</button></div>{property.lastError ? <p className="text-[9px] text-[#b42318]">{property.lastError}</p> : null}</form>)}{!data.properties.length ? <div className="p-5"><EmptyData title="No GA4 properties discovered" body="The existing Google token predates Analytics access. Reconnect once, then RankCues will import every GA4 property visible to that account." action={<a href="/api/auth/google" className="inline-flex h-9 items-center rounded-lg bg-[#111827] px-4 text-[11px] font-semibold text-white">Reconnect Google</a>} /></div> : null}</div></div>
        </section>
        {data.landingPages.length ? <section className="data-panel overflow-hidden"><div className="border-b border-[#e7eaf0] px-5 py-4"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">Landing pages · 28d</p><h2 className="mt-1 text-base font-semibold">Traffic and outcomes</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-[10px]"><thead className="bg-[#f8fafc] font-mono uppercase tracking-[0.08em] text-[#8b94a5]"><tr>{["Landing page", "Sessions", "Active users", "Key events", "Engagement"].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-[#edf0f5]">{data.landingPages.map((row) => <tr key={row.landingPage}><td className="max-w-[420px] truncate px-4 py-3 font-semibold">{row.landingPage}</td><td className="px-4 py-3 font-mono">{row.sessions.toFixed(0)}</td><td className="px-4 py-3 font-mono">{row.activeUsers.toFixed(0)}</td><td className="px-4 py-3 font-mono">{row.keyEvents.toFixed(0)}</td><td className="px-4 py-3 font-mono">{(row.engagementRate * 100).toFixed(1)}%</td></tr>)}</tbody></table></div></section> : null}
      </div>
    </AppShell>
  );
}
