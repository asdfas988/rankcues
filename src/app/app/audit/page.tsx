import { Activity, RefreshCw } from "lucide-react";
import { AppShell, PageHeader } from "@/components/rankcues-ui";
import { EmptyData, SiteFilter, SourceBadge } from "@/components/rankcues-dashboard";
import { getAutomationOverview, getChangeFeed, listGscSites } from "@/lib/data-store";
import { getLocale, pick } from "@/lib/i18n";
import { SiteSubnav } from "@/components/site-subnav";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" }).format(value);
}

export default async function ChangesPage({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const { site } = await searchParams;
  const sites = (await listGscSites()).filter((item) => item.active && item.permissionLevel !== "siteUnverifiedUser");
  const [events, automation, locale] = await Promise.all([getChangeFeed(site), getAutomationOverview(), getLocale()]);
  const detected = events.filter((event) => event.evidenceState === "detected").length;
  const high = events.filter((event) => event.impact === "high").length;
  return (
    <AppShell active="/app/audit">
      <PageHeader kicker={pick(locale, "Changes", "改动", "Cambios")} title={pick(locale, "Everything that changed, with where it came from", "网站发生的每一处改动，以及它的来源", "Cada cambio y su origen")} body={pick(locale, "Each entry comes from a stored Search Console comparison, a page snapshot, a GA4 import or a fix follow-up. What was observed is kept apart from what is only correlated or suspected.", "每条记录都来自已保存的 Search Console 对比、页面快照、GA4 导入或修复跟进，并把观察到的事实与相关性、推测分开。", "Cada registro viene de Search Console, una captura, GA4 o un seguimiento, separando lo observado de lo correlacionado o supuesto.")} action={<form action="/api/automation/run" method="post"><input type="hidden" name="mode" value="changes" /><input type="hidden" name="siteId" value={site || ""} /><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#111827] px-3.5 text-[11px] font-semibold text-white"><RefreshCw size={13} /> {pick(locale, "Refresh evidence", "刷新证据", "Actualizar evidencia")}</button></form>} />
      <div className="grid gap-4 px-4 pb-8 sm:px-6 lg:px-8">
        {site ? <SiteSubnav siteId={site} current="changes" locale={locale} /> : null}
        <SiteFilter sites={sites} selected={site} basePath="/app/audit" />
        <section className="grid gap-3 sm:grid-cols-3"><div className="data-card p-4"><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#8b94a5]">Ledger entries</p><p className="mt-2 text-2xl font-semibold">{events.length}</p><p className="mt-1 text-[10px] text-[#8b94a5]">Latest 100 stored events</p></div><div className="data-card p-4"><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#8b94a5]">Detected</p><p className="mt-2 text-2xl font-semibold">{detected}</p><p className="mt-1 text-[10px] text-[#8b94a5]">Directly observed, not inferred</p></div><div className="data-card p-4"><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#8b94a5]">High impact</p><p className="mt-2 text-2xl font-semibold">{high}</p><p className="mt-1 text-[10px] text-[#8b94a5]">Prioritized for investigation</p></div></section>
        <section className="data-panel overflow-hidden"><div className="flex items-center justify-between border-b border-[#e7eaf0] px-5 py-4"><div><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">Evidence timeline</p><h2 className="mt-1 text-base font-semibold">Changes and refreshed baselines</h2></div><Activity size={17} className="text-[#667085]" /></div>{events.length ? <div className="divide-y divide-[#edf0f5]">{events.map((event) => <article key={event.id} className="grid gap-3 px-5 py-5 lg:grid-cols-[140px_minmax(0,1fr)_110px]"><div><SourceBadge source={event.source} /><p className="mt-2 font-mono text-[8px] text-[#98a2b3]">{formatDate(event.occurredAt)}</p></div><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-[12px] font-semibold text-[#111827]">{event.title}</h3><span className={`rounded-md px-2 py-1 font-mono text-[8px] uppercase ${event.impact === "high" ? "bg-[#fff2f0] text-[#b42318]" : event.impact === "medium" ? "bg-[#fff7e8] text-[#9a6700]" : "bg-[#f2f4f7] text-[#667085]"}`}>{event.impact}</span></div><p className="mt-2 text-[10px] leading-5 text-[#667085]">{event.description}</p><p className="mt-2 truncate font-mono text-[8px] text-[#98a2b3]">{event.siteUrl}</p></div><div className="lg:text-right"><span className="rounded-md border border-[#dfe3eb] bg-white px-2 py-1 font-mono text-[8px] uppercase text-[#667085]">{event.evidenceState}</span><form action="/api/tasks/create" method="post" className="mt-3"><input type="hidden" name="siteId" value={event.siteId} /><input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="title" value={`Investigate: ${event.title}`} /><button className="text-[9px] font-semibold text-[#5268d9] hover:underline">Create task</button></form></div></article>)}</div> : <div className="p-5"><EmptyData title="No change events stored yet" body={`Refresh evidence to create Search Console and page baselines. A page change shows up once a later snapshot can be compared with the first one. ${automation.runs.length ? "Collection has run before; check the collection log in Settings for errors." : "Data collection has not run yet."}`} /></div>}</section>
      </div>
    </AppShell>
  );
}
