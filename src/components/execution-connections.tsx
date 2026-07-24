import {
  ArrowUpRight,
  CheckCircle2,
  FileCode2,
  GitBranch,
  KeyRound,
  LayoutPanelTop,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import type {
  StoredGitHubInstallation,
  StoredGitHubRepository,
  StoredSite,
  StoredWordPressConnection,
} from "@/lib/data-store";
import { pick, type AppLocale } from "@/lib/i18n";

type WordPressConnectionWithSite = StoredWordPressConnection & { siteUrl: string };

type ExecutionConnectionsProps = {
  locale: AppLocale;
  sites: StoredSite[];
  wordpressConnections: WordPressConnectionWithSite[];
  githubInstallations: StoredGitHubInstallation[];
  githubRepositories: StoredGitHubRepository[];
  githubConfigured: boolean;
};

export function ExecutionConnections({
  locale,
  sites,
  wordpressConnections,
  githubInstallations,
  githubRepositories,
  githubConfigured,
}: ExecutionConnectionsProps) {
  const connectableSites = sites.filter((site) => site.active && site.permissionLevel !== "siteUnverifiedUser");
  const availableWordPressSites = connectableSites.filter(
    (site) => !wordpressConnections.some((connection) => connection.siteId === site.id),
  );
  const mappedRepositories = githubRepositories.filter((repository) => repository.siteId);

  return (
    <section className="data-panel overflow-hidden">
      <header className="relative overflow-hidden border-b border-[#20362e] bg-[#0d1713] px-5 py-6 text-white sm:px-6">
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#d8bb89]">{pick(locale, "Controlled AI execution", "受控 AI 执行", "Ejecución de IA controlada")}</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em]">{pick(locale, "Connect where approved work should go", "连接 AI 获批后可以执行修改的位置", "Conecta dónde debe ejecutarse el trabajo aprobado")}</h2>
            <p className="mt-2 text-[10px] leading-5 text-white/48">{pick(locale, "WordPress receives separate drafts. GitHub receives isolated branches and Draft Pull Requests. Neither channel publishes directly.", "WordPress 只接收独立草稿；GitHub 只创建隔离分支和 Draft PR，两种方式都不会直接发布到生产环境。", "WordPress recibe borradores separados y GitHub ramas aisladas con Draft PR. Ningún canal publica directamente.")}</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.12em] text-white/55"><ShieldCheck size={12} className="text-[#d8bb89]" /> {pick(locale, "Two approvals required", "需要两次批准", "Requiere dos aprobaciones")}</span>
        </div>
      </header>

      <div className="grid lg:grid-cols-2">
        <div className="border-b border-[#e7eaf0] p-5 lg:border-b-0 lg:border-r sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#21759b]"><LayoutPanelTop size={18} /><span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em]">WordPress</span></div>
              <h3 className="mt-2 text-base font-semibold">{pick(locale, "Create reviewable CMS drafts", "创建可审核的 CMS 草稿", "Crear borradores revisables en el CMS")}</h3>
            </div>
            <span className={`rounded-full px-2.5 py-1 font-mono text-[8px] uppercase ${wordpressConnections.length ? "bg-[#eafbf6] text-[#087f6b]" : "bg-[#f2f4f7] text-[#667085]"}`}>{wordpressConnections.length ? pick(locale, `${wordpressConnections.length} connected`, `已连接 ${wordpressConnections.length} 个`, `${wordpressConnections.length} conectados`) : pick(locale, "Not connected", "尚未连接", "Sin conectar")}</span>
          </div>

          <div className="mt-5 grid gap-2">
            {wordpressConnections.map((connection) => (
              <div key={connection.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#dfe7e3] bg-[#f7fbf9] p-3.5">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold">{connection.siteUrl.replace(/^sc-domain:/, "")}</p>
                  <p className="mt-1 truncate font-mono text-[8px] text-[#7b8794]">{connection.baseUrl} · {connection.remoteDisplayName || connection.username}</p>
                </div>
                <form action="/api/integrations/wordpress/disconnect" method="post">
                  <input type="hidden" name="connectionId" value={connection.id} />
                  <button aria-label={pick(locale, "Disconnect WordPress", "断开 WordPress", "Desconectar WordPress")} className="flex size-8 items-center justify-center rounded-lg border border-[#dfe3eb] bg-white text-[#98a2b3] transition hover:border-[#e8b5aa] hover:text-[#b42318]"><Unplug size={13} /></button>
                </form>
              </div>
            ))}
          </div>

          <form action="/api/integrations/wordpress/connect" method="post" className="mt-5 grid gap-3 rounded-xl border border-[#e2e7ee] bg-[#fafbfc] p-4">
            <div className="flex items-center gap-2"><KeyRound size={13} className="text-[#667085]" /><p className="text-[10px] font-semibold">{pick(locale, "Add a WordPress site authorization", "添加 WordPress 网站授权", "Añadir autorización de WordPress")}</p></div>
            <select name="siteId" required disabled={!availableWordPressSites.length} className="h-10 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[10px] outline-none focus:border-[#6177f2]">
              <option value="">{pick(locale, availableWordPressSites.length ? "Choose monitored site" : "Every eligible site is connected", availableWordPressSites.length ? "选择已监控网站" : "可用网站均已连接", availableWordPressSites.length ? "Elige un sitio monitorizado" : "Todos los sitios están conectados")}</option>
              {availableWordPressSites.map((site) => <option key={site.id} value={site.id}>{site.siteUrl.replace(/^sc-domain:/, "")}</option>)}
            </select>
            <input name="baseUrl" required type="url" inputMode="url" placeholder="https://example.com" className="h-10 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[10px] outline-none focus:border-[#6177f2]" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="username" required autoComplete="username" placeholder={pick(locale, "WordPress username", "WordPress 用户名", "Usuario de WordPress")} className="h-10 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[10px] outline-none focus:border-[#6177f2]" />
              <input name="applicationPassword" required type="password" autoComplete="new-password" placeholder={pick(locale, "Application Password", "应用程序密码", "Contraseña de aplicación")} className="h-10 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[10px] outline-none focus:border-[#6177f2]" />
            </div>
            <p className="text-[9px] leading-4 text-[#8b94a5]">{pick(locale, "Create a revocable Application Password in WordPress → Users → Profile. Never enter your normal login password.", "请在 WordPress → 用户 → 个人资料中创建可单独撤销的“应用程序密码”，不要输入日常登录密码。", "Crea una Contraseña de aplicación revocable en WordPress → Usuarios → Perfil. No introduzcas tu contraseña normal.")}</p>
            <button disabled={!availableWordPressSites.length} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#111827] px-4 text-[10px] font-semibold text-white transition hover:bg-[#1f2937] disabled:bg-[#d0d5dd]"><CheckCircle2 size={13} /> {pick(locale, "Verify and connect", "验证并连接", "Verificar y conectar")}</button>
          </form>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#24292f]"><GitBranch size={18} /><span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em]">GitHub App</span></div>
              <h3 className="mt-2 text-base font-semibold">{pick(locale, "Create isolated code changes", "创建隔离的代码修改", "Crear cambios de código aislados")}</h3>
            </div>
            <span className={`rounded-full px-2.5 py-1 font-mono text-[8px] uppercase ${githubInstallations.length ? "bg-[#eafbf6] text-[#087f6b]" : githubConfigured ? "bg-[#fff8e8] text-[#835500]" : "bg-[#f2f4f7] text-[#667085]"}`}>{githubInstallations.length ? pick(locale, "Installed", "已安装", "Instalado") : githubConfigured ? pick(locale, "Ready to install", "可安装", "Listo para instalar") : pick(locale, "Platform setup", "平台待配置", "Configuración pendiente")}</span>
          </div>

          <div className="mt-5 rounded-xl border border-[#e2e7ee] bg-[#fafbfc] p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#eef1ff] text-[#5268d9]"><FileCode2 size={15} /></span>
              <div><p className="text-[10px] font-semibold">{pick(locale, "Minimum repository permissions", "最小仓库权限", "Permisos mínimos del repositorio")}</p><p className="mt-1 text-[9px] leading-4 text-[#8b94a5]">Contents: write · Pull requests: write · Metadata: read</p></div>
            </div>
            {githubConfigured ? <a href="/api/integrations/github/install" className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#24292f] text-[10px] font-semibold text-white transition hover:bg-black">{pick(locale, githubInstallations.length ? "Add another installation" : "Install RankCues GitHub App", githubInstallations.length ? "添加另一个安装" : "安装 RankCues GitHub App", githubInstallations.length ? "Añadir otra instalación" : "Instalar RankCues GitHub App")} <ArrowUpRight size={13} /></a> : <div className="mt-4 rounded-lg border border-[#f1d6a4] bg-[#fff9ee] px-3 py-3 text-[9px] leading-4 text-[#835500]">{pick(locale, "The platform administrator must finish the GitHub App registration. Customers will never be asked for a personal token.", "平台管理员还需完成 GitHub App 注册；客户不会被要求提供个人 Token。", "El administrador debe terminar el registro de GitHub App. Nunca se pedirá un token personal al cliente.")}</div>}
          </div>

          <div className="mt-4 grid gap-2">
            {githubInstallations.map((installation) => (
              <div key={installation.id} className="rounded-xl border border-[#e2e7ee] bg-white p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0"><p className="truncate text-[11px] font-semibold">{installation.accountLogin}</p><p className="mt-1 font-mono text-[8px] uppercase text-[#98a2b3]">{installation.accountType} · {installation.repositorySelection}</p></div>
                  <div className="flex gap-1.5">
                    <form action="/api/integrations/github/sync" method="post"><input type="hidden" name="installationId" value={installation.id} /><button aria-label={pick(locale, "Refresh repositories", "刷新仓库", "Actualizar repositorios")} className="flex size-8 items-center justify-center rounded-lg border border-[#dfe3eb] text-[#667085] hover:bg-[#f8fafc]"><RefreshCw size={12} /></button></form>
                    <form action="/api/integrations/github/disconnect" method="post"><input type="hidden" name="installationId" value={installation.id} /><button aria-label={pick(locale, "Disconnect GitHub", "断开 GitHub", "Desconectar GitHub")} className="flex size-8 items-center justify-center rounded-lg border border-[#dfe3eb] text-[#98a2b3] hover:border-[#e8b5aa] hover:text-[#b42318]"><Unplug size={12} /></button></form>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {githubRepositories.length ? (
            <form action="/api/integrations/github/map" method="post" className="mt-4 grid gap-3 rounded-xl border border-[#e2e7ee] bg-[#fafbfc] p-4">
              <p className="text-[10px] font-semibold">{pick(locale, "Map a repository to a monitored site", "将仓库映射到监控网站", "Mapear un repositorio a un sitio")}</p>
              <select name="repositoryId" required className="h-10 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[10px]">
                <option value="">{pick(locale, "Choose repository", "选择仓库", "Elegir repositorio")}</option>
                {githubRepositories.map((repository) => <option key={repository.id} value={repository.id}>{repository.fullName}{repository.siteId ? " ✓" : ""}</option>)}
              </select>
              <select name="siteId" required className="h-10 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[10px]">
                <option value="">{pick(locale, "Choose monitored site", "选择已监控网站", "Elegir sitio monitorizado")}</option>
                {connectableSites.map((site) => <option key={site.id} value={site.id}>{site.siteUrl.replace(/^sc-domain:/, "")}</option>)}
              </select>
              <button className="h-10 rounded-lg border border-[#cfd6e4] bg-white text-[10px] font-semibold text-[#344054] transition hover:border-[#8394f3] hover:text-[#5268d9]">{pick(locale, "Save repository mapping", "保存仓库映射", "Guardar mapeo")}</button>
              {mappedRepositories.length ? <div className="border-t border-[#e7eaf0] pt-3 text-[8px] leading-4 text-[#8b94a5]">{mappedRepositories.map((repository) => <p key={repository.id}>{repository.fullName} → {connectableSites.find((site) => site.id === repository.siteId)?.siteUrl.replace(/^sc-domain:/, "") || "—"}</p>)}</div> : null}
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
