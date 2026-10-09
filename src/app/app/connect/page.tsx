import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Check, CircleAlert, Database, FileText, RefreshCw, ScanSearch, ShieldCheck, UserRound } from "lucide-react";
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
  const eligibleSites = sites.filter((site) => site.active && site.permissionLevel !== "siteUnverifiedUser");
  const activeSite = eligibleSites.find((site) => site.lastSyncedAt && site.pageCount > 0) || eligibleSites[0];
  const mappedGa4 = ga4Properties.some((property) => Boolean(property.siteId));
  const hasCrawl = setupProgress.crawledSiteIds.length > 0;
  const setupSteps = [
    { title: pick(locale, "Connect Search Console", "连接 Search Console", "Conectar Search Console"), detail: pick(locale, "Import the properties visible to your Google account.", "导入 Google 账号可见的网站。", "Importa las propiedades visibles de tu cuenta."), done: connections.length > 0, href: connections.length ? "#connection-details" : "/api/auth/google?returnTo=%2Fapp%2Fconnect", label: pick(locale, "Connect Google", "连接 Google", "Conectar Google"), icon: UserRound },
    { title: pick(locale, "Sync one website", "同步一个网站", "Sincronizar un sitio"), detail: pick(locale, "Open a site and import its search performance.", "打开一个网站，同步它的搜索表现数据。", "Abre un sitio e importa su rendimiento."), done: Boolean(activeSite?.lastSyncedAt && activeSite.pageCount > 0), href: activeSite ? `/app/sites/${activeSite.id}` : "#properties", label: pick(locale, "Open site", "打开网站", "Abrir sitio"), icon: ShieldCheck },
    { title: pick(locale, "Create your first report", "生成第一份报告", "Crear tu primer informe"), detail: pick(locale, "Review the findings and choose what to work on next.", "查看发现的问题，决定接下来要做什么。", "Revisa los hallazgos y elige el siguiente paso."), done: setupProgress.reportCount > 0, href: activeSite ? `/app/reports?site=${encodeURIComponent(activeSite.id)}` : "/app/reports", label: setupProgress.reportCount ? pick(locale, "View report", "查看报告", "Ver informe") : pick(locale, "Create report", "生成报告", "Crear informe"), icon: FileText },
  ];
  const completedSteps = setupSteps.filter((step) => step.done).length;

  return (
    <AppShell active="/app/connect">
      <PageHeader
        kicker={pick(locale, "Sites", "网站", "Sitios")}
        title={pick(locale, "Start with one connected site.", "从连接一个网站开始。", "Empieza con un sitio conectado.")}
        body={pick(locale, "Connect your Google account, open a site, and sync its search data. Then you can create your first report.", "连接 Google 账号，打开一个网站并同步搜索数据，就可以开始生成首份报告。", "Conecta Google, abre un sitio y sincroniza sus datos para crear tu primer informe.")}
        action={
          <div className="flex gap-2">
            {sites.length ? <form action="/api/integrations/gsc/sync-all" method="post"><button className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dfe3eb] bg-white px-3.5 text-[11px] font-semibold text-[#344054]"><RefreshCw size={13} /> {pick(locale, "Sync all", "全部同步", "Sincronizar todo")}</button></form> : null}
            <Link href="/api/auth/google?returnTo=%2Fapp%2Fconnect" className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#6177f2] px-3.5 text-[11px] font-semibold text-white">{pick(locale, "Connect Google account", "连接 Google 账号", "Conectar cuenta de Google")} <ArrowRight size={13} /></Link>
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

        <section className="setup-guide">
          <div className="setup-guide-heading"><div><p className="eyebrow">{pick(locale, "YOUR FIRST REPORT", "第一份报告", "TU PRIMER INFORME")}</p><h2>{pick(locale, "Three steps to a useful first view.", "三步，开始了解网站表现。", "Tres pasos para empezar.")}</h2><p>{pick(locale, "Search Console is enough to begin. Add other data sources when you need more context.", "使用 Search Console 即可开始，其他数据来源可以按需添加。", "Search Console es suficiente para empezar. Añade más fuentes cuando las necesites.")}</p></div><span className="rounded-full border border-[#d7e0c8] px-3 py-2 text-xs text-[#5b734a]">{completedSteps} / 3 {pick(locale, "complete", "已完成", "completos")}</span></div>
          <ol>{setupSteps.map(({ title, detail, done, href, label, icon: Icon }, index) => <li key={title}>
            <span className="inline-flex items-center gap-2">{done ? <Check size={14} /> : <Icon size={14} />} 0{index + 1} {done ? pick(locale, "Complete", "已完成", "Completo") : ""}</span><h3>{title}</h3><p>{detail}</p>
            {index > 0 && !setupSteps[index - 1].done && !done ? <p>{pick(locale, "Complete the previous step to continue.", "完成上一步后继续。", "Completa el paso anterior para continuar.")}</p> : <Link href={href} className="rc-text-link mt-4">{done ? pick(locale, "Review", "查看", "Revisar") : label}<ArrowRight size={13} /></Link>}
          </li>)}</ol>
        </section>
        <details className="data-panel px-5 py-4"><summary className="cursor-pointer text-sm font-semibold text-[#435a3a]">{pick(locale, "Optional: add more context to your reports", "可选：为报告补充更多信息", "Opcional: añade contexto a tus informes")}</summary><div className="mt-5 grid gap-5 md:grid-cols-2">
          <div><div className="flex items-center gap-2 text-sm font-semibold"><BarChart3 size={16} /> Google Analytics 4 {mappedGa4 ? <Check size={14} /> : null}</div><p className="mt-2 text-xs leading-6 text-[#667085]">{pick(locale, "Map Analytics to add sessions and conversion context.", "关联 Analytics，为报告补充访问会话和转化数据。", "Añade sesiones y conversiones con Analytics.")}</p><Link href="/app/traffic" className="rc-text-link mt-3">{pick(locale, "Manage Analytics", "管理 Analytics", "Gestionar Analytics")}<ArrowRight size={13} /></Link></div>
          <div><div className="flex items-center gap-2 text-sm font-semibold"><ScanSearch size={16} />{pick(locale, "Website snapshot", "网站快照", "Captura del sitio")} {hasCrawl ? <Check size={14} /> : null}</div><p className="mt-2 text-xs leading-6 text-[#667085]">{pick(locale, "Record page titles, headings and links to compare future changes.", "记录页面标题、内容标题和链接，便于之后对比变化。", "Registra títulos y enlaces para comparar cambios.")}</p>{activeSite ? <form action="/api/crawl/start" method="post" className="mt-3"><input type="hidden" name="siteId" value={activeSite.id} /><button className="rc-text-link">{pick(locale, "Capture site snapshot", "采集网站快照", "Capturar sitio")}<ArrowRight size={13} /></button></form> : <p className="mt-3 text-xs text-[#667085]">{pick(locale, "Connect a site first.", "请先连接网站。", "Conecta un sitio primero.")}</p>}</div>
        </div></details>

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
        <details id="connection-details" className="data-panel scroll-mt-20 px-5 py-4"><summary className="cursor-pointer text-sm font-semibold text-[#435a3a]">{pick(locale, "Connection details and diagnostics", "连接详情与状态检查", "Detalles de conexión y diagnóstico")}</summary>
          <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
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
        </details>
      </div>
    </AppShell>
  );
}
