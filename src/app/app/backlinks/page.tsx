import { ExternalLink, Link2, RefreshCw } from "lucide-react";
import { AppShell, MetricCard, PageHeader } from "@/components/rankcues-ui";
import { EmptyData, Notice, SiteFilter, TrendBars } from "@/components/rankcues-dashboard";
import { getBacklinkProviderPublicStatus } from "@/lib/backlink-provider";
import { getBacklinkOverview, listGscSites } from "@/lib/data-store";
import { getLocale, pick } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function BacklinksPage({ searchParams }: { searchParams: Promise<{ site?: string; sync?: string }> }) {
  const params = await searchParams;
  const sites = (await listGscSites()).filter((item) => item.active && item.permissionLevel !== "siteUnverifiedUser");
  const provider = getBacklinkProviderPublicStatus();
  const [data, locale] = await Promise.all([getBacklinkOverview(params.site), getLocale()]);
  const latest = data.latest?.reduce((acc, row) => ({ backlinks: acc.backlinks + row.backlinks, referringDomains: acc.referringDomains + row.referringDomains, dofollow: acc.dofollow + row.dofollow, newBacklinks: acc.newBacklinks + row.newBacklinks, lostBacklinks: acc.lostBacklinks + row.lostBacklinks }), { backlinks: 0, referringDomains: 0, dofollow: 0, newBacklinks: 0, lostBacklinks: 0 }) ?? null;
  return (
    <AppShell active="/app/backlinks">
      <PageHeader kicker={pick(locale, "Authority monitoring", "权威度监控", "Monitorización de autoridad")} title={pick(locale, "Know which links appeared, disappeared, and matter", "看清哪些外链新增、丢失，以及哪些真正重要", "Descubre qué enlaces aparecen, desaparecen y importan")} body={pick(locale, "Daily provider snapshots preserve profile totals and link-level evidence so reports can distinguish ranking changes from authority changes.", "每日保存外链总量与链接级证据，让报告能够区分排名波动与权威度变化。", "Las capturas diarias guardan totales y evidencia por enlace para distinguir cambios de ranking y autoridad.")} action={<form action="/api/integrations/backlinks/sync" method="post"><input type="hidden" name="siteId" value={params.site || ""} /><button disabled={!provider.configured} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#111827] px-3.5 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#d0d5dd]"><RefreshCw size={13} /> {pick(locale, "Sync backlinks", "同步外链", "Sincronizar enlaces")}</button></form>} />
      <div className="grid gap-4 px-4 pb-8 sm:px-6 lg:px-8">
        {!provider.configured ? <Notice>Backlink monitoring is fully wired but paused because DataForSEO credentials are not configured. Add <code>DATAFORSEO_LOGIN</code> and <code>DATAFORSEO_PASSWORD</code> as encrypted Cloudflare secrets; no invented link data will be shown.</Notice> : null}
        {params.sync === "failed" ? <Notice tone="error">The backlink provider rejected or could not complete this sync. Check provider credentials and the latest automation run for the exact error.</Notice> : null}
        <SiteFilter sites={sites} selected={params.site} basePath="/app/backlinks" />
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Backlinks" value={(latest?.backlinks || 0).toLocaleString()} detail="Latest provider snapshot" />
          <MetricCard label="Referring domains" value={(latest?.referringDomains || 0).toLocaleString()} detail="Unique linking domains" />
          <MetricCard label="New" value={(latest?.newBacklinks || 0).toLocaleString()} detail="Provider-reported interval" />
          <MetricCard label="Lost" value={(latest?.lostBacklinks || 0).toLocaleString()} detail="Provider-reported interval" />
        </section>
        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="data-panel p-5"><div className="flex items-center justify-between"><div><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">90-day profile</p><h2 className="mt-1 text-base font-semibold">Referring domains</h2></div><Link2 size={17} className="text-[#667085]" /></div>{data.history.length ? <div className="mt-6"><TrendBars values={data.history.map((row) => row.referringDomains)} color="#6941c6" /><div className="mt-2 flex justify-between font-mono text-[8px] text-[#98a2b3]"><span>{data.history[0]?.capturedOn}</span><span>{data.history.at(-1)?.capturedOn}</span></div></div> : <div className="mt-5"><EmptyData title="No backlink baseline yet" body={provider.configured ? "Run the first sync to create a durable backlink baseline." : "Configure provider credentials, then the daily automation will create the first baseline."} /></div>}</div>
          <div className="data-panel overflow-hidden"><div className="border-b border-[#e7eaf0] px-5 py-4"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">Link evidence</p><h2 className="mt-1 text-base font-semibold">Strongest and recently lost links</h2></div>{data.backlinks.length ? <div className="max-h-[480px] divide-y divide-[#edf0f5] overflow-y-auto">{data.backlinks.map((link) => <div key={link.id} className="grid gap-2 px-5 py-4"><div className="flex items-center justify-between gap-3"><a href={link.sourceUrl} target="_blank" rel="noreferrer" className="min-w-0 truncate text-[11px] font-semibold text-[#111827] hover:text-[#5268d9]">{link.sourceDomain} <ExternalLink size={10} className="inline" /></a><span className={`rounded-md px-2 py-1 font-mono text-[8px] font-semibold uppercase ${link.status === "lost" ? "bg-[#fff2f0] text-[#b42318]" : "bg-[#eafbf6] text-[#087f6b]"}`}>{link.status}</span></div><p className="truncate text-[9px] text-[#667085]">{link.anchor || "No anchor text"} → {link.targetUrl}</p><div className="flex gap-3 font-mono text-[8px] text-[#98a2b3]"><span>Rank {link.sourceRank?.toFixed(0) || "—"}</span><span>{link.dofollow ? "dofollow" : "nofollow"}</span><span>Seen {link.lastSeen.toISOString().slice(0, 10)}</span></div></div>)}</div> : <div className="p-5"><EmptyData title="No link-level evidence" body="Link rows will appear only after a successful provider sync." /></div>}</div>
        </section>
      </div>
    </AppShell>
  );
}
