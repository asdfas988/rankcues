import { BarChart3, Link2, RefreshCw } from "lucide-react";
import { AppShell, MetricCard, PageHeader } from "@/components/rankcues-ui";
import { DeltaBadge, EmptyData, Notice, SiteFilter, TrendBars } from "@/components/rankcues-dashboard";
import { Ga4DiscoveryControl } from "@/components/ga4-discovery-control";
import { getTrafficOverview, listGoogleConnections, listGscSites } from "@/lib/data-store";
import { isGoogleServiceAccountSubject } from "@/lib/google-service-account";
import { getLocale, pick, type AppLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function ga4DiscoveryError(locale: AppLocale, code: string | null, fallback: string | null) {
  if (code === "api_disabled") return pick(locale,
    "Google Analytics Admin API is not enabled for this OAuth project. Enable it in Google Cloud, wait a few minutes, then retry discovery.",
    "当前 OAuth 项目尚未启用 Google Analytics Admin API。请先在 Google Cloud 中启用，等待几分钟后再重新检测。",
    "La API de administración de Google Analytics no está habilitada. Habilítala en Google Cloud, espera unos minutos y vuelve a intentarlo.");
  if (code === "scope_missing") return pick(locale,
    "Google authorization is missing Analytics read access. Reconnect Google and approve the Analytics permission.",
    "Google 授权缺少 Analytics 读取权限。请重新连接 Google，并同意 Analytics 权限。",
    "Falta el acceso de lectura de Analytics. Reconecta Google y aprueba ese permiso.");
  if (code === "reauthorization_required") return pick(locale,
    "The Google authorization expired or was revoked. Reconnect the account, then discover GA4 properties again.",
    "Google 授权已过期或被撤销。请重新连接该账号，然后再次检测 GA4 媒体资源。",
    "La autorización de Google caducó o fue revocada. Reconecta la cuenta y vuelve a detectar las propiedades GA4.");
  if (code === "permission_denied") return pick(locale,
    "Google denied access to Analytics resources. Confirm this account has access to the GA4 property, then retry.",
    "Google 拒绝了 Analytics 资源访问。请确认该账号拥有对应 GA4 媒体资源的权限，然后重试。",
    "Google rechazó el acceso. Confirma que la cuenta tenga acceso a la propiedad GA4 y vuelve a intentarlo.");
  if (code === "rate_limited") return pick(locale,
    "Google Analytics discovery is temporarily rate limited. Wait a moment, then retry.",
    "Google Analytics 暂时触发了请求频率限制，请稍后再试。",
    "El descubrimiento de Google Analytics está limitado temporalmente. Espera un momento y vuelve a intentarlo.");
  if (code === "timeout" || code === "temporary_error") return pick(locale,
    "Google Analytics is temporarily unavailable. Try discovery again shortly.",
    "Google Analytics 暂时不可用，请稍后重新检测。",
    "Google Analytics no está disponible temporalmente. Vuelve a intentarlo en breve.");
  return fallback || pick(locale,
    "GA4 property discovery failed. Retry once; if it continues, reconnect the Google account.",
    "GA4 媒体资源检测失败。请先重试；如果仍然失败，再重新连接 Google 账号。",
    "Falló el descubrimiento de GA4. Vuelve a intentarlo y, si continúa, reconecta Google.");
}

export default async function TrafficPage({ searchParams }: { searchParams: Promise<{ site?: string; sync?: string; ga4?: string }> }) {
  const params = await searchParams;
  const sites = (await listGscSites()).filter((item) => item.active && item.permissionLevel !== "siteUnverifiedUser");
  const [data, locale, connections] = await Promise.all([getTrafficOverview(params.site), getLocale(), listGoogleConnections()]);
  const accountConnection = connections.find((connection) => !isGoogleServiceAccountSubject(connection.googleSubject));
  const totals = data.totals;
  const mapped = data.properties.filter((property) => property.siteId).length;
  const discoveryFailed = accountConnection?.ga4DiscoveryStatus === "failed";
  const discoveryNotChecked = accountConnection?.ga4DiscoveryStatus === "not_checked";
  const reconnectRequired = accountConnection?.ga4DiscoveryErrorCode === "scope_missing"
    || accountConnection?.ga4DiscoveryErrorCode === "reauthorization_required";
  const emptyTitle = !accountConnection
    ? pick(locale, "Connect Google Analytics", "连接 Google Analytics", "Conecta Google Analytics")
    : discoveryFailed
      ? pick(locale, "GA4 discovery needs attention", "GA4 资源检测需要处理", "El descubrimiento de GA4 necesita atención")
      : discoveryNotChecked
        ? pick(locale, "Check for GA4 properties", "检测 GA4 媒体资源", "Buscar propiedades GA4")
        : pick(locale, "No visible GA4 properties", "没有可见的 GA4 媒体资源", "No hay propiedades GA4 visibles");
  const emptyBody = !accountConnection
    ? pick(locale, "Connect the Google account that can access your GA4 properties.", "请连接拥有 GA4 媒体资源访问权限的 Google 账号。", "Conecta la cuenta de Google con acceso a tus propiedades GA4.")
    : discoveryFailed
      ? ga4DiscoveryError(locale, accountConnection.ga4DiscoveryErrorCode, accountConnection.ga4DiscoveryError)
      : discoveryNotChecked
        ? pick(locale, "This connection has not checked Analytics yet. Run discovery without reconnecting the account.", "此连接尚未检测 Analytics 资源，可直接运行检测，无需再次授权。", "Esta conexión aún no ha comprobado Analytics. Ejecuta la detección sin volver a autorizar.")
        : pick(locale, "Authorization succeeded, but this Google account cannot see any GA4 properties. Confirm the selected account has access in Google Analytics, then retry.", "授权已成功，但该 Google 账号看不到任何 GA4 媒体资源。请确认当前账号在 Google Analytics 中拥有资源访问权限，然后重新检测。", "La autorización se completó, pero esta cuenta no puede ver propiedades GA4. Confirma el acceso en Google Analytics y vuelve a intentarlo.");
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
          <div className="data-panel overflow-hidden">
            <div className="border-b border-[#e7eaf0] px-5 py-4"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">Property mapping</p><h2 className="mt-1 text-base font-semibold">{mapped}/{data.properties.length} mapped</h2></div>
            <div className="divide-y divide-[#edf0f5]">
              {data.properties.map((property) => <form key={property.id} action="/api/integrations/ga4/map" method="post" className="grid gap-3 px-5 py-4"><input type="hidden" name="propertyId" value={property.id} /><div><p className="text-[11px] font-semibold">{property.displayName}</p><p className="mt-1 font-mono text-[9px] text-[#98a2b3]">properties/{property.propertyId}</p></div><div className="flex gap-2"><select name="siteId" defaultValue={property.siteId || ""} className="h-9 min-w-0 flex-1 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[10px]"><option value="">Not mapped</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.siteUrl.replace(/^sc-domain:/, "")}</option>)}</select><button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[10px] font-semibold"><Link2 size={12} /> Save</button></div>{property.lastError ? <p className="text-[9px] text-[#b42318]">{property.lastError}</p> : null}</form>)}
              {!data.properties.length ? (
                <div className="p-5">
                  <EmptyData
                    title={emptyTitle}
                    body={emptyBody}
                    action={accountConnection ? (
                      <Ga4DiscoveryControl
                        retryLabel={pick(locale, "Check again", "重新检测", "Comprobar de nuevo")}
                        reconnectLabel={pick(locale, "Reconnect Google", "重新连接 Google", "Reconectar Google")}
                        successLabel={pick(locale, "GA4 property discovery completed.", "GA4 媒体资源检测已完成。", "El descubrimiento de GA4 se completó.")}
                        failureLabel={pick(locale, "GA4 discovery failed. See the reason above.", "GA4 检测失败，请查看上方原因。", "Falló el descubrimiento de GA4. Consulta el motivo anterior.")}
                        networkErrorLabel={pick(locale, "Could not reach GA4 discovery. Check the connection and retry.", "无法连接 GA4 检测服务，请检查网络后重试。", "No se pudo acceder al servicio de detección GA4. Comprueba la conexión y vuelve a intentarlo.")}
                        showReconnect={reconnectRequired || accountConnection.ga4DiscoveryStatus === "empty"}
                      />
                    ) : (
                      <a href="/api/auth/google?returnTo=/app/traffic" className="inline-flex h-9 items-center rounded-lg bg-[#111827] px-4 text-[11px] font-semibold text-white">{pick(locale, "Connect Google", "连接 Google", "Conectar Google")}</a>
                    )}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </section>
        {data.landingPages.length ? <section className="data-panel overflow-hidden"><div className="border-b border-[#e7eaf0] px-5 py-4"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">Landing pages · 28d</p><h2 className="mt-1 text-base font-semibold">Traffic and outcomes</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-[10px]"><thead className="bg-[#f8fafc] font-mono uppercase tracking-[0.08em] text-[#8b94a5]"><tr>{["Landing page", "Sessions", "Active users", "Key events", "Engagement"].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-[#edf0f5]">{data.landingPages.map((row) => <tr key={row.landingPage}><td className="max-w-[420px] truncate px-4 py-3 font-semibold">{row.landingPage}</td><td className="px-4 py-3 font-mono">{row.sessions.toFixed(0)}</td><td className="px-4 py-3 font-mono">{row.activeUsers.toFixed(0)}</td><td className="px-4 py-3 font-mono">{row.keyEvents.toFixed(0)}</td><td className="px-4 py-3 font-mono">{(row.engagementRate * 100).toFixed(1)}%</td></tr>)}</tbody></table></div></section> : null}
      </div>
    </AppShell>
  );
}
