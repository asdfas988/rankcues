import {
  Bot,
  Check,
  Database,
  GitBranch,
  Globe2,
  LayoutPanelTop,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/rankcues-ui";
import { Notice } from "@/components/rankcues-dashboard";
import { ExecutionConnections } from "@/components/execution-connections";
import { getAiProviderPublicStatus } from "@/lib/ai-provider";
import { getBacklinkProviderPublicStatus } from "@/lib/backlink-provider";
import { getCurrentSession } from "@/lib/auth-session";
import {
  getPersistencePublicStatus,
  listGitHubInstallations,
  listGitHubRepositories,
  listGa4Properties,
  listGoogleConnections,
  listGscSites,
  listWordPressConnections,
} from "@/lib/data-store";
import { getGitHubAppPublicStatus } from "@/lib/github-app";
import { getGooglePublicStatus } from "@/lib/google-search-console";
import { getLocale, pick } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: {
  searchParams: Promise<{ organization?: string; wordpress?: string; github?: string }>;
}) {
  const params = await searchParams;
  const [connections, sites, ga4, locale, session, wordpressConnections, githubInstallations, githubRepositories] = await Promise.all([
    listGoogleConnections(),
    listGscSites(),
    listGa4Properties(),
    getLocale(),
    getCurrentSession(),
    listWordPressConnections(),
    listGitHubInstallations(),
    listGitHubRepositories(),
  ]);
  const persistence = getPersistencePublicStatus();
  const google = getGooglePublicStatus();
  const ai = getAiProviderPublicStatus();
  const backlinks = getBacklinkProviderPublicStatus();
  const github = getGitHubAppPublicStatus();

  const statuses = [
    {
      icon: Database,
      label: pick(locale, "Database", "数据库", "Base de datos"),
      ready: persistence.ready,
      detail: pick(locale, "Encrypted persistent storage", "加密持久化存储", "Almacenamiento persistente cifrado"),
    },
    {
      icon: UserRound,
      label: "Google",
      ready: google.configured && connections.length > 0,
      detail: pick(locale, `${connections.length} account · ${sites.length} GSC sites`, `${connections.length} 个账号 · ${sites.length} 个 GSC 网站`, `${connections.length} cuenta · ${sites.length} sitios GSC`),
    },
    {
      icon: Bot,
      label: pick(locale, "Managed AI", "托管 AI", "IA gestionada"),
      ready: ai.configured,
      detail: pick(locale, "Platform-operated analysis", "由平台统一提供分析", "Análisis operado por la plataforma"),
    },
    {
      icon: Globe2,
      label: pick(locale, "Backlinks", "外链", "Enlaces"),
      ready: backlinks.configured,
      detail: backlinks.configured
        ? pick(locale, "Monitoring active", "监控已启用", "Monitorización activa")
        : pick(locale, "Managed add-on not active", "平台外链增值服务尚未启用", "Complemento gestionado aún no activo"),
    },
    {
      icon: LayoutPanelTop,
      label: "WordPress",
      ready: wordpressConnections.length > 0,
      detail: wordpressConnections.length
        ? pick(locale, `${wordpressConnections.length} site connected`, `已连接 ${wordpressConnections.length} 个网站`, `${wordpressConnections.length} sitio conectado`)
        : pick(locale, "Draft execution not connected", "尚未连接草稿执行", "Ejecución de borradores sin conectar"),
    },
    {
      icon: GitBranch,
      label: "GitHub",
      ready: githubInstallations.length > 0,
      detail: githubInstallations.length
        ? pick(locale, `${githubRepositories.length} repositories available`, `可用仓库 ${githubRepositories.length} 个`, `${githubRepositories.length} repositorios disponibles`)
        : github.configured
          ? pick(locale, "GitHub App ready to install", "GitHub App 可安装", "GitHub App lista para instalar")
          : pick(locale, "Platform registration required", "需要完成平台注册", "Registro de plataforma requerido"),
    },
  ];

  return (
    <AppShell active="/app/settings">
      <PageHeader
        kicker={pick(locale, "Workspace controls", "工作区控制", "Controles del espacio")}
        title={pick(locale, "Secure connections without customer API keys", "安全连接，无需客户提供 API 密钥", "Conexiones seguras sin claves API del cliente")}
        body={pick(
          locale,
          "RankCues operates AI and data-provider infrastructure centrally. Your team connects only the verified business data it wants analyzed.",
          "RankCues 统一管理 AI 与数据服务基础设施；你的团队只需连接希望分析的已验证业务数据。",
          "RankCues opera de forma centralizada la infraestructura de IA y datos; tu equipo solo conecta los datos empresariales verificados que desea analizar.",
        )}
        action={<><a href="/app/automations" className="ws-button is-secondary">{pick(locale, "Collection log", "采集日志", "Registro de recolección")}</a><a href="/api/auth/google?returnTo=/app/settings" className="ws-button"><UserRound size={14} /> {pick(locale, "Reconnect Google", "重新连接 Google", "Reconectar Google")}</a></>}
      />

      <div className="grid gap-5 px-4 pb-10 sm:px-6 lg:px-8">
        {params.organization === "restricted" ? (
          <Notice>{pick(locale, "Additional organizations are disabled until complete tenant isolation and invitations are ready.", "在完整的租户隔离与邀请机制上线前，新增组织功能暂不开放。", "Las organizaciones adicionales están desactivadas hasta completar el aislamiento de inquilinos y las invitaciones.")}</Notice>
        ) : null}
        {params.wordpress === "connected" ? <Notice tone="success">{pick(locale, "WordPress verified and connected. Approved AI work can now be prepared as a separate draft.", "WordPress 已验证并连接；获批的 AI 任务现在可以生成独立草稿。", "WordPress verificado y conectado. El trabajo de IA aprobado ya puede prepararse como borrador separado.")}</Notice> : null}
        {params.wordpress === "error" || params.wordpress === "invalid" ? <Notice>{pick(locale, "WordPress could not be connected. Confirm HTTPS, the username, Application Password and edit permissions.", "WordPress 连接失败，请检查 HTTPS、用户名、应用程序密码和编辑权限。", "No se pudo conectar WordPress. Comprueba HTTPS, usuario, Contraseña de aplicación y permisos de edición.")}</Notice> : null}
        {params.wordpress === "disconnected" ? <Notice>{pick(locale, "WordPress authorization was removed from this workspace.", "已从当前工作区移除 WordPress 授权。", "La autorización de WordPress se eliminó de este espacio.")}</Notice> : null}
        {params.github === "connected" || params.github === "synced" || params.github === "mapped" ? <Notice tone="success">{pick(locale, "GitHub is connected and repository access is synchronized.", "GitHub 已连接，仓库访问权限已同步。", "GitHub está conectado y el acceso a repositorios está sincronizado.")}</Notice> : null}
        {params.github === "unavailable" ? <Notice>{pick(locale, "The RankCues GitHub App still needs platform-side registration. Customers do not need to enter any token.", "RankCues GitHub App 仍需完成平台侧注册，客户无需输入任何 Token。", "La GitHub App de RankCues aún requiere registro de plataforma. El cliente no necesita introducir ningún token.")}</Notice> : null}
        {params.github === "error" || params.github === "invalid" ? <Notice>{pick(locale, "GitHub authorization could not be verified. Retry the installation or repository sync.", "GitHub 授权验证失败，请重新安装或刷新仓库。", "No se pudo verificar la autorización de GitHub. Reintenta la instalación o sincronización.")}</Notice> : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {statuses.map(({ icon: Icon, label, ready, detail }) => (
            <div key={label} className="data-card p-5">
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-[#eef1ff] text-[#5268d9]"><Icon size={17} /></span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${ready ? "bg-[#eafbf6] text-[#087f6b]" : "bg-[#fff8e8] text-[#835500]"}`}>
                  <span className={`size-1.5 rounded-full ${ready ? "bg-[#12a285]" : "bg-[#d39b2f]"}`} />
                  {ready ? pick(locale, "Ready", "已就绪", "Listo") : pick(locale, "Paused", "已暂停", "En pausa")}
                </span>
              </div>
              <h2 className="mt-4 text-sm font-semibold">{label}</h2>
              <p className="mt-1.5 text-xs leading-5 text-[#667085]">{detail}</p>
            </div>
          ))}
        </section>

        <ExecutionConnections
          locale={locale}
          sites={sites}
          wordpressConnections={wordpressConnections}
          githubInstallations={githubInstallations}
          githubRepositories={githubRepositories}
          githubConfigured={github.configured}
        />

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
          <div className="data-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e7eaf0] px-5 py-5">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#8b94a5]">{pick(locale, "Google data access", "Google 数据访问", "Acceso a datos de Google")}</p>
                <h2 className="mt-1 text-base font-semibold">{pick(locale, "Connected accounts and imported properties", "已连接账号与导入的网站", "Cuentas conectadas y propiedades importadas")}</h2>
              </div>
              <ShieldCheck size={18} className="text-[#667085]" />
            </div>
            <div className="divide-y divide-[#edf0f5]">
              {connections.map((connection) => (
                <div key={connection.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[40px_1fr_auto] sm:items-center">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-[#eef1ff] text-[#5268d9]"><UserRound size={16} /></span>
                  <div>
                    <p className="text-xs font-semibold">{connection.email}</p>
                    <p className="mt-1 text-[11px] text-[#8b94a5]">{connection.googleSubject.startsWith("service-account:") ? pick(locale, "Service account · GSC only", "服务账号 · 仅 GSC", "Cuenta de servicio · solo GSC") : pick(locale, "User OAuth · GSC and GA4", "用户 OAuth · GSC 与 GA4", "OAuth de usuario · GSC y GA4")}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#087f6b]"><Check size={12} /> {pick(locale, "Connected", "已连接", "Conectado")}</span>
                </div>
              ))}
              {!connections.length ? <div className="px-5 py-10 text-xs text-[#667085]">{pick(locale, "No Google account is connected.", "尚未连接 Google 账号。", "No hay ninguna cuenta de Google conectada.")}</div> : null}
            </div>
            <div className="grid grid-cols-3 border-t border-[#edf0f5] bg-[#f8fafc] px-5 py-5 text-center">
              <div><strong className="text-xl">{sites.length}</strong><p className="mt-1 text-[11px] text-[#667085]">{pick(locale, "GSC properties", "GSC 网站", "Propiedades GSC")}</p></div>
              <div><strong className="text-xl">{ga4.length}</strong><p className="mt-1 text-[11px] text-[#667085]">{pick(locale, "GA4 properties", "GA4 媒体资源", "Propiedades GA4")}</p></div>
              <div><strong className="text-xl">{ga4.filter((item) => item.siteId).length}</strong><p className="mt-1 text-[11px] text-[#667085]">{pick(locale, "GA4 mapped", "GA4 已映射", "GA4 mapeado")}</p></div>
            </div>
          </div>

          <div className="grid gap-5">
            <div className="data-panel p-5">
              <div className="flex items-center justify-between">
                <div><p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#8b94a5]">{pick(locale, "AI analysis", "AI 分析", "Análisis de IA")}</p><h2 className="mt-1 text-base font-semibold">{pick(locale, "Managed by RankCues", "由 RankCues 托管", "Gestionado por RankCues")}</h2></div>
                <Bot size={18} className="text-[#667085]" />
              </div>
              <div className={`mt-5 rounded-xl border p-4 ${ai.configured ? "border-[#b7ebdf] bg-[#f2fcf9]" : "border-[#f1d6a4] bg-[#fff9ee]"}`}>
                <p className={`text-sm font-semibold ${ai.configured ? "text-[#087f6b]" : "text-[#835500]"}`}>{ai.configured ? pick(locale, "Analysis service active", "分析服务已启用", "Servicio de análisis activo") : pick(locale, "Analysis service paused", "分析服务已暂停", "Servicio de análisis en pausa")}</p>
                <p className="mt-2 text-xs leading-5 text-[#667085]">{pick(locale, "Models, routing, credentials and cost controls are operated by the platform. Users never enter or see provider keys.", "模型、路由、密钥与成本控制均由平台统一管理，用户无需输入，也不会看到服务商密钥。", "Los modelos, rutas, credenciales y controles de coste son operados por la plataforma. Los usuarios nunca introducen ni ven claves del proveedor.")}</p>
              </div>
            </div>

            <div className="data-panel p-5">
              <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#eef1ff] text-[#5268d9]"><LockKeyhole size={17} /></span><div><p className="text-sm font-semibold">{pick(locale, "Private-beta workspace", "私测工作区", "Espacio beta privado")}</p><p className="mt-1 text-[11px] text-[#8b94a5]">{pick(locale, "Single protected tenant", "单一受保护租户", "Un único inquilino protegido")}</p></div></div>
              <dl className="mt-5 grid gap-3 text-xs">
                <div className="flex items-center justify-between gap-4 border-b border-[#edf0f5] pb-3"><dt className="text-[#8b94a5]">{pick(locale, "Signed in as", "当前账号", "Sesión iniciada como")}</dt><dd className="max-w-[230px] truncate font-semibold">{session?.email || "—"}</dd></div>
                <div className="flex items-center justify-between gap-4 border-b border-[#edf0f5] pb-3"><dt className="text-[#8b94a5]">{pick(locale, "Data boundary", "数据边界", "Límite de datos")}</dt><dd className="font-semibold">{pick(locale, "This workspace only", "仅当前工作区", "Solo este espacio")}</dd></div>
                <div className="flex items-center justify-between gap-4"><dt className="text-[#8b94a5]">{pick(locale, "Organization creation", "创建组织", "Crear organización")}</dt><dd className="font-semibold text-[#835500]">{pick(locale, "Temporarily disabled", "暂时关闭", "Desactivado temporalmente")}</dd></div>
              </dl>
              <form action="/api/auth/logout" method="post" className="mt-5"><button className="h-10 w-full rounded-lg border border-[#dfe3eb] bg-white text-xs font-semibold text-[#344054] transition hover:bg-[#f8fafc]">{pick(locale, "Sign out", "退出登录", "Cerrar sesión")}</button></form>
            </div>
          </div>
        </section>

        {!backlinks.configured ? <Notice>{pick(locale, "Backlink monitoring is a platform-managed add-on and is not active in this private-beta workspace. Users will not be asked to supply provider credentials.", "外链监控属于平台托管的增值能力，当前私测工作区尚未启用；系统不会要求用户提供数据服务商密钥。", "La monitorización de enlaces es un complemento gestionado por la plataforma y aún no está activa; no se pedirá al usuario que aporte credenciales.")}</Notice> : null}
      </div>
    </AppShell>
  );
}
