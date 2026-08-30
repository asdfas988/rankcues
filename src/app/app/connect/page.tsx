import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Check, Circle, CircleAlert, Database, FileText, RefreshCw, ScanSearch, ShieldCheck, UserRound } from "lucide-react";
import { AppShell, PageHeader } from "@/components/rankcues-ui";
import { getPersistencePublicStatus, getWorkspaceSetupProgress, listGa4Properties, listGoogleConnections, listGscSites } from "@/lib/data-store";
import { getGooglePublicStatus } from "@/lib/google-search-console";
import { getGoogleServiceAccountPublicStatus, isGoogleServiceAccountSubject } from "@/lib/google-service-account";
import { getLocale, pick } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: pick(locale, "Sites and Search Console", "网站与 Search Console", "Sitios y Search Console") };
}
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ google?: string; sites?: string; sync?: string; crawl?: string }> };

function notice(query: Awaited<Props["searchParams"]>) {
  if (query.google === "connected") return { good: true, text: `Google account connected. ${query.sites || "0"} Search Console properties were imported.` };
  if (query.google === "denied") return { good: false, text: "Google access was declined. Nothing was stored." };
  if (query.google === "invalid-state") return { good: false, text: "The Google sign-in session expired. Start the connection again." };
  if (query.google === "error") return { good: false, text: "Google connection failed before properties could be imported. Retry the account connection." };
  if (query.sync === "all-completed") return { good: true, text: "All connected properties finished their Search Console sync." };
  if (query.sync === "completed") return { good: true, text: "Search Console data was synced successfully." };
  if (query.sync) return { good: false, text: "The Search Console sync did not complete. Open the property to inspect its latest run." };
  if (query.crawl === "completed") return { good: true, text: "The site snapshot completed successfully." };
  if (query.crawl) return { good: false, text: "The site snapshot did not complete." };
  return null;
}

function propertyName(value: string) {
  return value.replace(/^sc-domain:/, "").replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function formatTime(value: Date | null) {
  if (!value) return "Never";
  return `${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(value)} UTC`;
}

export default async function ConnectPage({ searchParams }: Props) {
  const query = await searchParams;
  const locale = await getLocale();
  const message = notice(query);
  const persistence = getPersistencePublicStatus();
  const oauth = getGooglePublicStatus();
  const serviceAccount = getGoogleServiceAccountPublicStatus();
  let connections: Awaited<ReturnType<typeof listGoogleConnections>> = [];
  let sites: Awaited<ReturnType<typeof listGscSites>> = [];
  let ga4Properties: Awaited<ReturnType<typeof listGa4Properties>> = [];
  let setupProgress: Awaited<ReturnType<typeof getWorkspaceSetupProgress>> = { crawledSiteIds: [], reportCount: 0 };
  let storageError: string | null = null;
  if (persistence.ready) {
    try { [connections, sites, ga4Properties, setupProgress] = await Promise.all([listGoogleConnections(), listGscSites(), listGa4Properties(), getWorkspaceSetupProgress()]); }
    catch (error) { storageError = error instanceof Error ? error.message : "Database unavailable"; }
  }
  const accountConnections = connections.filter((item) => !isGoogleServiceAccountSubject(item.googleSubject));
  const serviceConnections = connections.filter((item) => isGoogleServiceAccountSubject(item.googleSubject));
  const onlyServiceAccount = serviceConnections.length > 0 && accountConnections.length === 0;
  const activeSite = sites.find((site) => site.active && site.permissionLevel !== "siteUnverifiedUser");
  const mappedGa4 = ga4Properties.some((property) => Boolean(property.siteId));
  const hasCrawl = setupProgress.crawledSiteIds.length > 0;
  const setupSteps = [
    { title: "Connect Search Console", detail: "Import the verified properties visible to your Google account.", done: accountConnections.length > 0, href: "/api/auth/google", label: accountConnections.length ? "Connected" : "Connect Google", icon: UserRound },
    { title: "Choose and sync a site", detail: "Select the property RankCues should investigate first.", done: Boolean(activeSite?.lastSyncedAt && activeSite.pageCount > 0), href: activeSite ? `/app/sites/${activeSite.id}` : "#properties", label: activeSite ? "Open site" : "Choose site", icon: ShieldCheck },
    { title: "Map Google Analytics 4", detail: "Add landing-page sessions and outcomes as post-click context.", done: mappedGa4, href: "/app/traffic", label: mappedGa4 ? "Mapped" : "Map GA4", icon: BarChart3 },
    { title: "Capture a website snapshot", detail: "Record titles, canonicals, headings, content and internal links.", done: hasCrawl, href: activeSite ? `/app/sites/${activeSite.id}` : "#properties", label: hasCrawl ? "Captured" : "Run snapshot", icon: ScanSearch },
    { title: "Generate the first investigation", detail: "Turn the connected evidence into findings and reviewable tasks.", done: setupProgress.reportCount > 0, href: "/app/reports", label: setupProgress.reportCount ? "View report" : "Generate report", icon: FileText },
  ];
  const completedSteps = setupSteps.filter((step) => step.done).length;

  return (
    <AppShell active="/app/connect">
      <PageHeader
        kicker={pick(locale, "Sites", "网站", "Sitios")}
        title={pick(locale, "Connect every property you operate.", "连接你运营的所有网站。", "Conecta todas las propiedades que gestionas.")}
        body={pick(locale, "Google account OAuth imports the full Search Console property list available to that account. Service-account access is kept as a one-property fallback only.", "通过 Google OAuth 导入该账号可见的全部 Search Console 网站；服务账号仅作为单网站备用方式。", "Google OAuth importa todas las propiedades visibles de Search Console; la cuenta de servicio queda como respaldo.")}
        action={
          <div className="flex gap-2">
            {sites.length ? <form action="/api/integrations/gsc/sync-all" method="post"><button className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dfe3eb] bg-white px-3.5 text-[11px] font-semibold text-[#344054]"><RefreshCw size={13} /> {pick(locale, "Sync all", "全部同步", "Sincronizar todo")}</button></form> : null}
            <Link href="/api/auth/google" className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#6177f2] px-3.5 text-[11px] font-semibold text-white">{pick(locale, "Connect Google account", "连接 Google 账号", "Conectar cuenta de Google")} <ArrowRight size={13} /></Link>
          </div>
        }
      />

      <div className="grid gap-4 px-4 pb-8 sm:px-6 lg:px-8">
        {message ? <div className={`rounded-xl border px-4 py-3 text-[11px] ${message.good ? "border-[#b7ebdf] bg-[#effbf8] text-[#087f6b]" : "border-[#f5c8c2] bg-[#fff4f2] text-[#b5473c]"}`}>{message.text}</div> : null}
        {storageError ? <div className="rounded-xl border border-[#f5c8c2] bg-[#fff4f2] px-4 py-3 text-[11px] text-[#b5473c]">Database connection failed: {storageError}</div> : null}
        {onlyServiceAccount ? (
          <div className="flex items-start gap-3 rounded-xl border border-[#d9def8] bg-[#f5f6ff] px-4 py-3 text-[11px] leading-5 text-[#4656a6]">
            <CircleAlert size={15} className="mt-0.5 shrink-0" />
            <p><strong>Only the fallback connection is active.</strong> It can see only properties explicitly shared with <span className="font-mono">{serviceAccount.email}</span>. Connect your normal Google account above to import all of its Search Console properties.</p>
          </div>
        ) : null}

        <section className="data-panel overflow-hidden">
          <div className="grid gap-5 border-b border-[#e7eaf0] px-5 py-5 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#6177f2]">First investigation</p>
              <h2 className="mt-1 text-lg font-semibold">Build a complete evidence chain</h2>
              <p className="mt-1 max-w-2xl text-[11px] leading-5 text-[#667085]">Complete these steps in order. RankCues can analyze partial data, but change attribution is strongest when search, analytics and page snapshots overlap.</p>
            </div>
            <div className="min-w-[180px]">
              <div className="flex items-center justify-between font-mono text-[9px] uppercase text-[#667085]"><span>Setup progress</span><span>{completedSteps}/5</span></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf0f5]"><div className="h-full rounded-full bg-[#6177f2] transition-all" style={{ width: `${completedSteps * 20}%` }} /></div>
            </div>
          </div>
          <div className="grid divide-y divide-[#edf0f5] lg:grid-cols-5 lg:divide-x lg:divide-y-0">
            {setupSteps.map(({ title, detail, done, href, label, icon: Icon }, index) => (
              <div key={title} className="flex min-w-0 flex-col px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span className={`flex size-8 items-center justify-center rounded-lg ${done ? "bg-[#eafbf6] text-[#087f6b]" : "bg-[#f2f4f7] text-[#667085]"}`}><Icon size={14} /></span>
                  <span className={`flex items-center gap-1 font-mono text-[8px] uppercase ${done ? "text-[#087f6b]" : "text-[#98a2b3]"}`}>{done ? <Check size={11} /> : <Circle size={9} />} 0{index + 1}</span>
                </div>
                <h3 className="mt-4 text-[11px] font-semibold">{title}</h3>
                <p className="mt-1 min-h-12 text-[9px] leading-4 text-[#8b94a5]">{detail}</p>
                {index === 3 && !done && activeSite ? (
                  <form action="/api/crawl/start" method="post" className="mt-3"><input type="hidden" name="siteId" value={activeSite.id} /><button className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#4659bc]">{label} <ArrowRight size={11} /></button></form>
                ) : (
                  <Link href={href} className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#4659bc]">{label} <ArrowRight size={11} /></Link>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="data-panel overflow-hidden">
            <div className="border-b border-[#e7eaf0] px-5 py-4"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">Connections</p><h2 className="mt-1 text-base font-semibold">Google access</h2></div>
            <div className="divide-y divide-[#edf0f5]">
              {accountConnections.map((connection) => (
                <div key={connection.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[38px_1fr_auto] sm:items-center">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-[#eef1ff] text-[#5268d9]"><UserRound size={16} /></span>
                  <div><p className="text-[12px] font-semibold">{connection.email}</p><p className="mt-1 text-[10px] text-[#8b94a5]">Google account · imports every visible GSC property</p></div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#087f6b]"><Check size={12} /> {connection.status}</span>
                </div>
              ))}
              {serviceConnections.map((connection) => (
                <div key={connection.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[38px_1fr_auto] sm:items-center">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-[#f2f4f7] text-[#667085]"><ShieldCheck size={16} /></span>
                  <div><p className="text-[12px] font-semibold">Fallback service account</p><p className="mt-1 truncate text-[10px] text-[#8b94a5]">{connection.email} · explicit property access only</p></div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#087f6b]"><Check size={12} /> {connection.status}</span>
                </div>
              ))}
              {!connections.length ? <div className="px-5 py-10 text-center"><p className="text-sm font-semibold">No Google connection</p><p className="mt-1 text-[11px] text-[#8b94a5]">Connect an account to import live properties.</p></div> : null}
            </div>
          </div>

          <div className="data-panel p-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">Runtime</p>
            <h2 className="mt-1 text-base font-semibold">System readiness</h2>
            <div className="mt-5 grid gap-3">
              {[
                { label: "OAuth client", ready: oauth.configured, detail: oauth.configured ? "Ready" : "Missing configuration", icon: UserRound },
                { label: "Encrypted database", ready: persistence.ready && !storageError, detail: persistence.ready ? "Persistent storage" : "Not configured", icon: Database },
                { label: "Imported properties", ready: sites.length > 0, detail: `${sites.length} live`, icon: ShieldCheck },
              ].map(({ label, ready, detail, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl border border-[#edf0f5] px-3 py-3">
                  <span className={`flex size-8 items-center justify-center rounded-lg ${ready ? "bg-[#eafbf6] text-[#087f6b]" : "bg-[#f2f4f7] text-[#98a2b3]"}`}><Icon size={14} /></span>
                  <div><p className="text-[11px] font-semibold">{label}</p><p className="mt-0.5 text-[9px] text-[#98a2b3]">{detail}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="properties" className="data-panel scroll-mt-20 overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e7eaf0] px-5 py-4"><div><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">Properties</p><h2 className="mt-1 text-base font-semibold">Imported Search Console sites</h2></div><span className="font-mono text-[9px] uppercase text-[#98a2b3]">{sites.length} live</span></div>
          {sites.length ? (
            <div className="overflow-x-auto"><div className="min-w-[820px]">
              <div className="grid grid-cols-[minmax(260px,1fr)_110px_90px_90px_150px_220px] gap-3 border-b border-[#edf0f5] bg-[#fafbfc] px-5 py-2.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[#8b94a5]"><span>Property</span><span>Permission</span><span>Pages</span><span>Queries</span><span>Last sync</span><span>Actions</span></div>
              {sites.map((site) => (
                <div key={site.id} className="grid grid-cols-[minmax(260px,1fr)_110px_90px_90px_150px_220px] items-center gap-3 border-b border-[#edf0f5] px-5 py-3.5 text-[11px] last:border-b-0">
                  <Link href={`/app/sites/${site.id}`} className="font-semibold text-[#111827] hover:text-[#5268d9]">{propertyName(site.siteUrl)}</Link>
                  <span className={`font-mono text-[9px] ${site.permissionLevel === "siteUnverifiedUser" ? "text-[#b5473c]" : "text-[#667085]"}`}>{site.permissionLevel === "siteUnverifiedUser" ? "Unverified" : site.permissionLevel}</span>
                  <span className="font-mono">{site.pageCount.toLocaleString()}</span><span className="font-mono">{site.queryCount.toLocaleString()}</span><span className="text-[#667085]">{formatTime(site.lastSyncedAt)}</span>
                  {site.permissionLevel === "siteUnverifiedUser" ? (
                    <span className="text-[10px] font-semibold text-[#b5473c]">Verify access in Search Console</span>
                  ) : (
                    <div className="flex gap-2"><form action="/api/integrations/gsc/sync" method="post"><input type="hidden" name="siteId" value={site.id} /><button className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#111827] px-3 text-[10px] font-semibold text-white"><RefreshCw size={11} /> Sync</button></form><form action="/api/crawl/start" method="post"><input type="hidden" name="siteId" value={site.id} /><button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[10px] font-semibold"><ScanSearch size={11} /> Snapshot</button></form></div>
                  )}
                </div>
              ))}
            </div></div>
          ) : <div className="px-5 py-14 text-center"><p className="text-sm font-semibold">No properties imported</p><p className="mt-1 text-[11px] text-[#8b94a5]">Connect the Google account that owns your Search Console properties.</p></div>}
        </section>
      </div>
    </AppShell>
  );
}
