import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  Link2,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, MetricCard, PageHeader } from "@/components/rankcues-ui";
import { EmptyData, Notice, SiteFilter } from "@/components/rankcues-dashboard";
import { getCurrentSession } from "@/lib/auth-session";
import { getBacklinkProviderPublicStatus } from "@/lib/backlink-provider";
import {
  getLinkCampaignPageData,
  getLinkCampaignPublicStatus,
  type StoredLinkEvent,
  type StoredLinkOpportunity,
} from "@/lib/link-campaigns";
import {
  linkOpportunityStatuses,
  type LinkOpportunityStatus,
} from "@/lib/link-campaign-model";
import { getLocale, pick, type AppLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type PageSearchParams = {
  site?: string;
  campaign?: string;
  status?: string;
  opportunity?: string;
  linkStatus?: string;
  linkMessage?: string;
};

const lifecycleStatuses: LinkOpportunityStatus[] = [
  "discovered",
  "approved",
  "submitted",
  "pending_review",
  "published",
  "verified",
];

function isOpportunityStatus(value: string | undefined): value is LinkOpportunityStatus {
  return Boolean(value && linkOpportunityStatuses.includes(value as LinkOpportunityStatus));
}

function statusLabel(locale: AppLocale, status: LinkOpportunityStatus) {
  const labels: Record<LinkOpportunityStatus, [string, string, string]> = {
    discovered: ["Discovered", "已发现", "Descubierta"],
    approved: ["Approved", "已批准", "Aprobada"],
    submitted: ["Submitted", "已提交", "Enviada"],
    pending_review: ["Pending review", "等待平台审核", "Pendiente de revisión"],
    published: ["Published", "已发布", "Publicada"],
    verified: ["Verified", "已验证", "Verificada"],
    needs_action: ["Needs action", "需要处理", "Requiere acción"],
    rejected: ["Rejected", "已拒绝", "Rechazada"],
    removed: ["Removed", "已移除", "Eliminada"],
  };
  const value = labels[status];
  return pick(locale, value[0], value[1], value[2]);
}

function statusTone(status: LinkOpportunityStatus) {
  if (status === "verified") return "border-[#b7ebdf] bg-[#eafbf6] text-[#087f6b]";
  if (status === "submitted" || status === "pending_review") return "border-[#f1d6a4] bg-[#fff7e8] text-[#9a6700]";
  if (status === "needs_action" || status === "removed") return "border-[#f5c8c2] bg-[#fff2f0] text-[#b42318]";
  if (status === "approved" || status === "discovered" || status === "published") return "border-[#d9defa] bg-[#eef1ff] text-[#5268d9]";
  return "border-[#e1e5ec] bg-[#f2f4f7] text-[#667085]";
}

function riskLabel(locale: AppLocale, risk: StoredLinkOpportunity["risk"]) {
  if (risk === "blocked") return pick(locale, "Blocked risk", "已阻止风险", "Riesgo bloqueado");
  if (risk === "high") return pick(locale, "High risk", "高风险", "Riesgo alto");
  if (risk === "medium") return pick(locale, "Medium risk", "中风险", "Riesgo medio");
  return pick(locale, "Low risk", "低风险", "Riesgo bajo");
}

function riskTone(risk: StoredLinkOpportunity["risk"]) {
  if (risk === "blocked" || risk === "high") return "bg-[#fff2f0] text-[#b42318]";
  if (risk === "medium") return "bg-[#fff7e8] text-[#9a6700]";
  return "bg-[#eafbf6] text-[#087f6b]";
}

function categoryLabel(locale: AppLocale, category: StoredLinkOpportunity["category"]) {
  const labels: Record<StoredLinkOpportunity["category"], [string, string, string]> = {
    directory: ["Directory", "目录", "Directorio"],
    resource_page: ["Resource page", "资源页", "Página de recursos"],
    unlinked_mention: ["Unlinked mention", "未链接提及", "Mención sin enlace"],
    lost_link: ["Lost-link recovery", "丢链恢复", "Recuperación de enlace"],
    partner: ["Partner", "合作伙伴", "Socio"],
    editorial: ["Editorial", "编辑推荐", "Editorial"],
  };
  const value = labels[category];
  return pick(locale, value[0], value[1], value[2]);
}

function eventLabel(locale: AppLocale, event: StoredLinkEvent) {
  const labels: Record<string, [string, string, string]> = {
    campaign_created: ["Campaign created", "活动已创建", "Campaña creada"],
    campaign_status_changed: ["Campaign status changed", "活动状态已更新", "Estado de campaña actualizado"],
    opportunities_discovered: ["Opportunities added", "机会已添加", "Oportunidades añadidas"],
    opportunity_approved: ["Opportunity approved", "机会已批准", "Oportunidad aprobada"],
    opportunity_rejected: ["Opportunity rejected", "机会已拒绝", "Oportunidad rechazada"],
    submission_submitted: ["Submission recorded", "已记录提交", "Envío registrado"],
    submission_pending_review: ["Platform review recorded", "已记录平台审核", "Revisión de plataforma registrada"],
    submission_published: ["Publication recorded", "已记录发布", "Publicación registrada"],
    verification_requested: ["Verification requested", "已请求验证", "Verificación solicitada"],
  };
  const value = labels[event.eventType];
  return value
    ? pick(locale, value[0], value[1], value[2])
    : event.eventType.replaceAll("_", " ");
}

function campaignHref(input: {
  siteId?: string;
  campaignId?: string;
  status?: LinkOpportunityStatus | "all";
  opportunityId?: string;
}) {
  const query = new URLSearchParams();
  if (input.siteId) query.set("site", input.siteId);
  if (input.campaignId) query.set("campaign", input.campaignId);
  if (input.status && input.status !== "all") query.set("status", input.status);
  if (input.opportunityId) query.set("opportunity", input.opportunityId);
  const suffix = query.toString();
  return `/app/link-campaigns${suffix ? `?${suffix}` : ""}`;
}

function OpportunityStatusBadge({ locale, status }: { locale: AppLocale; status: LinkOpportunityStatus }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.06em] ${statusTone(status)}`}>
      {statusLabel(locale, status)}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#edf0f5] py-3 last:border-b-0">
      <dt className="shrink-0 font-mono text-[8px] uppercase tracking-[0.1em] text-[#98a2b3]">{label}</dt>
      <dd className="min-w-0 text-right text-[9px] font-semibold leading-4 text-[#344054]">{children}</dd>
    </div>
  );
}

function LifecycleStrip({
  locale,
  counts,
  selectedStatus,
  siteId,
  campaignId,
}: {
  locale: AppLocale;
  counts: Record<LinkOpportunityStatus, number>;
  selectedStatus: LinkOpportunityStatus | "all";
  siteId?: string;
  campaignId?: string;
}) {
  return (
    <section className="data-panel overflow-hidden">
      <div className="grid gap-px bg-[#e7eaf0] sm:grid-cols-3 xl:grid-cols-6">
        {lifecycleStatuses.map((status, index) => {
          const selected = selectedStatus === status;
          return (
            <Link
              key={status}
              href={campaignHref({ siteId, campaignId, status })}
              className={`group bg-white px-4 py-4 transition hover:bg-[#fafbff] ${selected ? "relative z-[1] shadow-[inset_0_-2px_0_#6177f2]" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`flex size-6 items-center justify-center rounded-lg font-mono text-[8px] font-semibold ${selected ? "bg-[#111827] text-white" : "bg-[#f2f4f7] text-[#667085]"}`}>{String(index + 1).padStart(2, "0")}</span>
                <span className="font-mono text-[11px] font-semibold text-[#111827]">{counts[status].toLocaleString()}</span>
              </div>
              <p className={`mt-3 text-[9px] font-semibold ${selected ? "text-[#5268d9]" : "text-[#667085] group-hover:text-[#344054]"}`}>{statusLabel(locale, status)}</p>
            </Link>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-[#e7eaf0] bg-[#fafbfd] px-4 py-3">
        <Link href={campaignHref({ siteId, campaignId, status: "all" })} className={`rounded-lg border px-2.5 py-1.5 text-[8px] font-semibold ${selectedStatus === "all" ? "border-[#111827] bg-[#111827] text-white" : "border-[#dfe3eb] bg-white text-[#667085]"}`}>{pick(locale, "All statuses", "全部状态", "Todos los estados")}</Link>
        {(["needs_action", "rejected", "removed"] as LinkOpportunityStatus[]).map((status) => (
          <Link key={status} href={campaignHref({ siteId, campaignId, status })} className={`rounded-lg border px-2.5 py-1.5 text-[8px] font-semibold ${selectedStatus === status ? statusTone(status) : "border-[#dfe3eb] bg-white text-[#667085]"}`}>
            {statusLabel(locale, status)} · {counts[status]}
          </Link>
        ))}
      </div>
    </section>
  );
}

function OpportunityDetail({
  locale,
  opportunity,
  canManage,
  workspaceReady,
  campaignActive,
  redirectTo,
}: {
  locale: AppLocale;
  opportunity: StoredLinkOpportunity | null;
  canManage: boolean;
  workspaceReady: boolean;
  campaignActive: boolean;
  redirectTo: string;
}) {
  if (!opportunity) {
    return (
      <div className="data-panel p-5">
        <EmptyData
          title={pick(locale, "Select an opportunity", "选择一个机会", "Selecciona una oportunidad")}
          body={pick(locale, "Open a row to inspect policy, submission and public-link evidence.", "打开一条记录，查看政策、提交与公开链接证据。", "Abre una fila para revisar políticas, envío y evidencia pública.")}
        />
      </div>
    );
  }

  const actionPath = `/api/link-opportunities/${encodeURIComponent(opportunity.id)}/action`;
  const canEdit = canManage && workspaceReady;
  const canPublish = ["needs_action", "submitted", "pending_review"].includes(opportunity.status);

  return (
    <aside className="data-panel min-w-0 overflow-hidden xl:sticky xl:top-[84px]">
      <div className="border-b border-[#e7eaf0] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#8b94a5]">{pick(locale, "Opportunity evidence", "机会证据", "Evidencia de oportunidad")}</p>
            <h2 className="mt-1 truncate text-base font-semibold">{opportunity.destinationName}</h2>
            <p className="mt-1 truncate text-[9px] text-[#98a2b3]">{opportunity.destinationDomain}</p>
          </div>
          <OpportunityStatusBadge locale={locale} status={opportunity.status} />
        </div>
      </div>

      <div className="px-5 py-4">
        <p className="text-[10px] leading-5 text-[#667085]">{opportunity.rationale}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`rounded px-2 py-1 font-mono text-[7px] font-semibold uppercase ${riskTone(opportunity.risk)}`}>{riskLabel(locale, opportunity.risk)}</span>
          <span className="rounded bg-[#f2f4f7] px-2 py-1 font-mono text-[7px] font-semibold uppercase text-[#667085]">{categoryLabel(locale, opportunity.category)}</span>
          <span className="rounded bg-[#eef1ff] px-2 py-1 font-mono text-[7px] font-semibold uppercase text-[#5268d9]">{opportunity.relevanceScore}/100</span>
        </div>

        <dl className="mt-4 rounded-xl border border-[#e5e9f0] bg-[#fafbfd] px-3">
          <Field label={pick(locale, "Submission mode", "提交方式", "Modo de envío")}>{opportunity.submissionMode === "official_api" ? pick(locale, "Official API", "官方 API", "API oficial") : pick(locale, "Manual handoff", "人工接管", "Entrega manual")}</Field>
          <Field label={pick(locale, "Permission", "自动化许可", "Permiso")}>{opportunity.permissionState === "verified" ? pick(locale, "Verified", "已验证", "Verificado") : opportunity.permissionState === "denied" ? pick(locale, "Denied", "已拒绝", "Denegado") : pick(locale, "Not recorded", "尚未记录", "No registrado")}</Field>
          <Field label={pick(locale, "Target page", "目标页面", "Página objetivo")}><span className="block max-w-[210px] truncate">{opportunity.targetUrl}</span></Field>
          <Field label={pick(locale, "HTTP", "HTTP", "HTTP")}>{opportunity.httpStatus ?? "—"}</Field>
          <Field label={pick(locale, "Indexability", "可索引性", "Indexabilidad")}>{opportunity.indexable === true ? pick(locale, "Indexable", "可索引", "Indexable") : opportunity.indexable === false ? pick(locale, "Not indexable", "不可索引", "No indexable") : pick(locale, "Unknown", "未知", "Desconocida")}</Field>
          <Field label="rel">{opportunity.linkRel.length ? opportunity.linkRel.join(", ") : "—"}</Field>
          <Field label={pick(locale, "Last checked", "最近检查", "Última comprobación")}>{opportunity.lastCheckedAt ? opportunity.lastCheckedAt.toISOString().replace("T", " ").slice(0, 16) : "—"}</Field>
        </dl>

        {opportunity.lastError ? <div className="mt-4 rounded-xl border border-[#f5c8c2] bg-[#fff4f2] p-3 text-[9px] leading-5 text-[#b42318]">{opportunity.lastError}</div> : null}

        <div className="mt-4 grid gap-2">
          <a href={opportunity.submissionUrl || opportunity.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[9px] font-semibold text-[#344054] hover:bg-[#f8fafc]">
            {pick(locale, "Open destination", "打开目标平台", "Abrir destino")} <ExternalLink size={11} />
          </a>
          {opportunity.policyEvidenceUrl ? <a href={opportunity.policyEvidenceUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[9px] font-semibold text-[#344054] hover:bg-[#f8fafc]">{pick(locale, "Review policy evidence", "查看政策证据", "Revisar evidencia de política")} <ExternalLink size={11} /></a> : null}
          {opportunity.publicListingUrl ? <a href={opportunity.publicListingUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#eafbf6] px-3 text-[9px] font-semibold text-[#087f6b]">{pick(locale, "Open public listing", "打开公开页面", "Abrir ficha pública")} <ExternalLink size={11} /></a> : null}
        </div>

        {opportunity.status === "discovered" && canEdit ? (
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-[#edf0f5] pt-4">
            <form action="/api/link-opportunities/approve" method="post">
              <input type="hidden" name="opportunityId" value={opportunity.id} />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <button disabled={!campaignActive || opportunity.risk === "blocked"} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#111827] px-3 text-[9px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#d0d5dd]"><ShieldCheck size={11} /> {pick(locale, "Approve", "批准", "Aprobar")}</button>
            </form>
            <form action={actionPath} method="post">
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <button name="action" value="reject" className="h-9 w-full rounded-lg border border-[#dfe3eb] bg-white px-3 text-[9px] font-semibold text-[#667085] hover:text-[#b42318]">{pick(locale, "Reject", "拒绝", "Rechazar")}</button>
            </form>
          </div>
        ) : null}

        {canEdit && opportunity.status === "needs_action" ? (
          <form action={actionPath} method="post" className="mt-5 border-t border-[#edf0f5] pt-4">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <p className="text-[9px] leading-4 text-[#667085]">{pick(locale, "Complete the required login, email or human review yourself. RankCues will not bypass verification.", "请自行完成登录、邮箱或人工审核；RankCues 不会绕过验证。", "Completa personalmente el acceso, correo o revisión humana. RankCues no omitirá la verificación.")}</p>
            <button name="action" value="submitted" className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#111827] text-[9px] font-semibold text-white"><Send size={11} /> {pick(locale, "Mark submitted", "标记为已提交", "Marcar como enviada")}</button>
          </form>
        ) : null}

        {canEdit && opportunity.status === "submitted" ? (
          <form action={actionPath} method="post" className="mt-4">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <button name="action" value="pending_review" className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#dfe3eb] bg-white text-[9px] font-semibold text-[#344054]"><Clock3 size={11} /> {pick(locale, "Mark pending review", "标记为等待审核", "Marcar pendiente de revisión")}</button>
          </form>
        ) : null}

        {canEdit && canPublish ? (
          <form action={actionPath} method="post" className="mt-4 rounded-xl border border-[#e3e8f0] bg-[#f8fafc] p-3">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <label className="font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-[#8b94a5]" htmlFor={`public-url-${opportunity.id}`}>{pick(locale, "Public listing URL", "公开页面 URL", "URL pública")}</label>
            <input id={`public-url-${opportunity.id}`} name="publicUrl" type="url" required placeholder="https://…" defaultValue={opportunity.publicListingUrl || ""} className="mt-2 h-9 w-full rounded-lg border border-[#dfe3eb] bg-white px-3 text-[9px] outline-none focus:border-[#6177f2]" />
            <button name="action" value="published" className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#111827] text-[9px] font-semibold text-white"><Link2 size={11} /> {pick(locale, "Record publication", "记录为已发布", "Registrar publicación")}</button>
          </form>
        ) : null}

        {canEdit && opportunity.publicListingUrl && ["published", "pending_review"].includes(opportunity.status) ? (
          <form action={`/api/link-opportunities/${encodeURIComponent(opportunity.id)}/verify`} method="post" className="mt-4">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <button className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#087f6b] text-[9px] font-semibold text-white"><RefreshCw size={11} /> {pick(locale, "Verify public link", "验证公开链接", "Verificar enlace público")}</button>
          </form>
        ) : null}

        {!campaignActive && opportunity.status === "discovered" ? <p className="mt-4 rounded-lg bg-[#fff7e8] px-3 py-2 text-[8px] leading-4 text-[#9a6700]">{pick(locale, "Activate the campaign before approving opportunities.", "请先启用活动，再批准机会。", "Activa la campaña antes de aprobar oportunidades.")}</p> : null}
      </div>
    </aside>
  );
}

export default async function LinkCampaignsPage({ searchParams }: { searchParams: Promise<PageSearchParams> }) {
  const [params, locale, session] = await Promise.all([searchParams, getLocale(), getCurrentSession()]);
  if (!session) redirect("/login");

  const feature = getLinkCampaignPublicStatus();
  // Paused module: only reachable when LINK_CAMPAIGNS_ENABLED=true.
  if (!feature.enabled) redirect("/app/overview");
  const selectedStatus: LinkOpportunityStatus | "all" = isOpportunityStatus(params.status) ? params.status : "all";
  const backlinks = getBacklinkProviderPublicStatus();
  const data = await getLinkCampaignPageData({
    workspaceId: session.workspaceId,
    email: session.email,
    siteId: params.site,
    campaignId: params.campaign,
    status: selectedStatus,
    opportunityId: params.opportunity,
  });
  const campaign = data.selectedCampaign;
  const workspaceReady = feature.enabled && data.workspaceEnabled;
  const campaignActive = campaign?.status === "active";
  const inFlight = data.counts.submitted + data.counts.pending_review;
  const pagePath = campaignHref({
    siteId: params.site,
    campaignId: campaign?.id,
    status: selectedStatus,
    opportunityId: data.selectedOpportunity?.id,
  });
  const notificationTone = params.linkStatus && ["created", "updated", "approved", "queued", "discovered"].includes(params.linkStatus)
    ? "success"
    : "error";

  return (
    <AppShell active="/app/link-campaigns">
      <PageHeader
        kicker={pick(locale, "Controlled link distribution", "受控外链分发", "Distribución controlada de enlaces")}
        title={pick(locale, "Discover broadly, publish only where automation is allowed", "大范围发现机会，只在允许自动化的平台发布", "Descubre ampliamente y publica solo donde se permite la automatización")}
        body={pick(locale, "Every external write requires approval. Submitted is not success: RankCues counts a result only after a public page contains the target link and verification evidence is stored.", "每次外部写入都需要审批。已提交不等于成功：只有公开页面出现目标链接并保存验证证据后，RankCues 才计为结果。", "Cada escritura externa requiere aprobación. Enviar no es tener éxito: RankCues solo cuenta el resultado cuando una página pública contiene el enlace y se guarda la evidencia.")}
        action={data.canManage && data.sites.length ? <a href="#create-campaign" className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#111827] px-3.5 text-[11px] font-semibold text-white"><Plus size={13} /> {pick(locale, "Create campaign", "创建活动", "Crear campaña")}</a> : <Link href="/app/connect" className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#111827] px-3.5 text-[11px] font-semibold text-white"><Plus size={13} /> {pick(locale, "Add property", "添加网站", "Añadir sitio")}</Link>}
      />

      <div className="grid gap-4 px-4 pb-8 sm:px-6 lg:px-8">
        {params.linkMessage ? <Notice tone={notificationTone}>{params.linkMessage.slice(0, 240)}</Notice> : null}
        {!feature.enabled ? <Notice tone="error">{pick(locale, "The platform administrator has not enabled this experimental module.", "平台管理员尚未启用此实验模块。", "El administrador de la plataforma no ha activado este módulo experimental.")}</Notice> : null}
        {feature.enabled && !data.workspaceEnabled ? <Notice>{pick(locale, "This experiment is disabled for the current workspace. No campaign can write externally.", "当前工作区已停用此实验功能，所有活动均无法向外部写入。", "Este experimento está desactivado para el espacio actual; ninguna campaña puede escribir externamente.")}</Notice> : null}
        {!data.canManage ? <Notice>{pick(locale, "You have read-only access. Only workspace owners and admins can create, approve or submit link opportunities.", "你当前只有只读权限；仅工作区所有者和管理员可以创建、批准或提交外链机会。", "Tienes acceso de solo lectura. Solo propietarios y administradores pueden crear, aprobar o enviar oportunidades.")}</Notice> : null}
        <Notice>{pick(locale, "Experimental module: RankCues never bypasses CAPTCHA, login, email verification or destination policies, and does not promise rankings, dofollow links or indexing.", "实验模块：RankCues 不会绕过 CAPTCHA、登录、邮箱验证或目标平台政策，也不承诺排名、dofollow 链接或收录。", "Módulo experimental: RankCues no evita CAPTCHA, acceso, verificación de correo ni políticas, y no promete posiciones, enlaces dofollow ni indexación.")}</Notice>

        <section className="data-panel flex flex-col gap-4 px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-[#8b94a5]">{pick(locale, "Campaign scope", "活动范围", "Ámbito de campaña")}</p>
            <p className="mt-1 truncate text-[11px] font-semibold text-[#344054]">{campaign ? `${campaign.name} · ${campaign.siteUrl.replace(/^sc-domain:/, "")}` : pick(locale, "No campaign selected", "尚未选择活动", "Ninguna campaña seleccionada")}</p>
          </div>
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
            <SiteFilter sites={data.sites} selected={params.site} basePath="/app/link-campaigns" />
            {data.campaigns.length ? (
              <form method="get" action="/app/link-campaigns" className="flex min-w-0 items-center gap-2">
                {params.site ? <input type="hidden" name="site" value={params.site} /> : null}
                {selectedStatus !== "all" ? <input type="hidden" name="status" value={selectedStatus} /> : null}
                <select name="campaign" defaultValue={campaign?.id} aria-label={pick(locale, "Campaign", "活动", "Campaña")} className="h-9 min-w-0 max-w-[260px] rounded-lg border border-[#dfe3eb] bg-white px-3 text-[9px] text-[#344054]">
                  {data.campaigns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <button className="h-9 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[9px] font-semibold text-[#344054]">{pick(locale, "Open", "打开", "Abrir")}</button>
              </form>
            ) : null}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={pick(locale, "Candidates discovered", "已发现候选", "Candidatos descubiertos")} value={(campaign?.discoveredCount || 0).toLocaleString()} detail={pick(locale, "Across the selected campaign", "当前活动全部候选", "En la campaña seleccionada")} />
          <MetricCard label={pick(locale, "Awaiting approval", "等待审批", "Pendientes de aprobación")} value={data.counts.discovered.toLocaleString()} detail={pick(locale, "Human decision required", "需要人工决策", "Requieren decisión humana")} />
          <MetricCard label={pick(locale, "In flight", "处理中", "En curso")} value={inFlight.toLocaleString()} detail={pick(locale, "Not counted as success", "不计为成功", "No cuentan como éxito")} />
          <MetricCard label={pick(locale, "Verified domains", "已验证域名", "Dominios verificados")} value={(campaign?.verifiedCount || 0).toLocaleString()} detail={pick(locale, "Public evidence recorded", "已保存公开证据", "Evidencia pública guardada")} />
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [pick(locale, "Workspace", "工作区", "Espacio"), workspaceReady ? pick(locale, "Active", "已启用", "Activo") : pick(locale, "Paused", "已暂停", "En pausa"), workspaceReady],
            [pick(locale, "Your access", "你的权限", "Tu acceso"), data.canManage ? pick(locale, "Owner / admin", "所有者 / 管理员", "Propietario / admin") : pick(locale, "Read only", "只读", "Solo lectura"), data.canManage],
            [pick(locale, "Authorized connectors", "授权连接器", "Conectores autorizados"), String(data.authorizedTargetCount), data.authorizedTargetCount > 0],
            [pick(locale, "Automatic execution", "自动执行", "Ejecución automática"), feature.autoExecutionConfigured ? pick(locale, "Ready", "已就绪", "Lista") : pick(locale, "Manual only", "仅人工", "Solo manual"), feature.autoExecutionConfigured],
          ].map(([label, value, ready]) => (
            <div key={String(label)} className="data-card flex items-center gap-3 p-4">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${ready ? "bg-[#eafbf6] text-[#087f6b]" : "bg-[#f2f4f7] text-[#667085]"}`}>{ready ? <CheckCircle2 size={15} /> : <CircleAlert size={15} />}</span>
              <div className="min-w-0"><p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#98a2b3]">{label}</p><p className="mt-1 truncate text-[10px] font-semibold text-[#344054]">{value}</p></div>
            </div>
          ))}
        </section>

        {campaign ? (
          <section className="data-panel overflow-hidden">
            <div className="flex flex-col justify-between gap-4 border-b border-[#e7eaf0] px-5 py-4 lg:flex-row lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-1 font-mono text-[8px] font-semibold uppercase ${campaign.status === "active" ? "bg-[#eafbf6] text-[#087f6b]" : campaign.status === "paused" ? "bg-[#fff7e8] text-[#9a6700]" : "bg-[#f2f4f7] text-[#667085]"}`}>{campaign.status}</span>
                  <span className="font-mono text-[8px] text-[#98a2b3]">{campaign.discoveryLimit} {pick(locale, "candidate limit", "个候选上限", "candidatos máximo")}</span>
                </div>
                <h2 className="mt-2 text-lg font-semibold tracking-[-0.025em]">{campaign.name}</h2>
                <a href={campaign.targetUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-[9px] text-[#5268d9] hover:underline">{campaign.targetUrl} <ExternalLink size={10} /></a>
              </div>
              {data.canManage ? (
                <form action={`/api/link-campaigns/${encodeURIComponent(campaign.id)}/status`} method="post" className="flex flex-wrap gap-2">
                  <input type="hidden" name="redirectTo" value={pagePath} />
                  {campaign.status !== "active" && campaign.status !== "completed" ? <button name="status" value="active" disabled={!workspaceReady} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#111827] px-3 text-[9px] font-semibold text-white disabled:bg-[#d0d5dd]"><PlayCircle size={11} /> {pick(locale, "Activate", "启用", "Activar")}</button> : null}
                  {campaign.status === "active" ? <button name="status" value="paused" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[9px] font-semibold text-[#344054]"><PauseCircle size={11} /> {pick(locale, "Pause", "暂停", "Pausar")}</button> : null}
                  {campaign.status !== "completed" ? <button name="status" value="completed" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[9px] font-semibold text-[#667085]"><CheckCircle2 size={11} /> {pick(locale, "Complete", "完成", "Completar")}</button> : null}
                </form>
              ) : null}
            </div>

            {data.canManage && campaign.status !== "completed" ? (
              <div className="grid gap-3 p-4 lg:grid-cols-3">
                <form action={`/api/link-campaigns/${encodeURIComponent(campaign.id)}/discover`} method="post" className="rounded-xl border border-[#e3e8f0] bg-[#fafbfd] p-4">
                  <input type="hidden" name="mode" value="dataforseo_gap" />
                  <input type="hidden" name="redirectTo" value={pagePath} />
                  <div className="flex items-center gap-2 text-[10px] font-semibold"><Link2 size={13} className="text-[#5268d9]" /> {pick(locale, "Competitor link gap", "竞品外链差距", "Brecha de enlaces")}</div>
                  <p className="mt-1 text-[8px] leading-4 text-[#667085]">{pick(locale, "One competitor domain per line, up to 10.", "每行一个竞品域名，最多 10 个。", "Un dominio competidor por línea, hasta 10.")}</p>
                  <textarea name="competitors" required rows={3} placeholder="competitor.com" className="mt-3 w-full resize-y rounded-lg border border-[#dfe3eb] bg-white px-3 py-2 text-[9px] leading-5 outline-none focus:border-[#6177f2]" />
                  <input type="hidden" name="limit" value={campaign.discoveryLimit} />
                  <button disabled={!workspaceReady || !backlinks.configured} className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#111827] text-[9px] font-semibold text-white disabled:bg-[#d0d5dd]"><RefreshCw size={11} /> {backlinks.configured ? pick(locale, "Discover gaps", "发现差距", "Descubrir brechas") : pick(locale, "Provider unavailable", "数据商不可用", "Proveedor no disponible")}</button>
                </form>

                <form action={`/api/link-campaigns/${encodeURIComponent(campaign.id)}/discover`} method="post" className="rounded-xl border border-[#e3e8f0] bg-[#fafbfd] p-4">
                  <input type="hidden" name="mode" value="lost_link" />
                  <input type="hidden" name="redirectTo" value={pagePath} />
                  <div className="flex items-center gap-2 text-[10px] font-semibold"><RefreshCw size={13} className="text-[#087f6b]" /> {pick(locale, "Lost-link recovery", "丢链恢复", "Recuperación de enlaces")}</div>
                  <p className="mt-1 min-h-12 text-[8px] leading-4 text-[#667085]">{pick(locale, "Import previously observed lost links for relevance and recovery review.", "导入曾经观测到的丢失链接，进行相关性与恢复审核。", "Importa enlaces perdidos observados para revisar su recuperación.")}</p>
                  <button disabled={!workspaceReady} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#dfe3eb] bg-white text-[9px] font-semibold text-[#344054] disabled:text-[#98a2b3]"><RefreshCw size={11} /> {pick(locale, "Find lost links", "查找丢链", "Buscar enlaces perdidos")}</button>
                </form>

                <details className="rounded-xl border border-[#e3e8f0] bg-[#fafbfd] p-4">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-[10px] font-semibold"><Upload size={13} className="text-[#9a6700]" /> {pick(locale, "Import reviewed opportunities", "导入已审核机会", "Importar oportunidades revisadas")}</summary>
                  <p className="mt-2 text-[8px] leading-4 text-[#667085]">{pick(locale, "Format: source URL | submission URL | destination name | policy evidence URL.", "格式：来源 URL | 提交 URL | 目标名称 | 政策证据 URL。", "Formato: URL fuente | URL de envío | nombre | URL de política.")}</p>
                  <form action={`/api/link-campaigns/${encodeURIComponent(campaign.id)}/discover`} method="post" className="mt-3">
                    <input type="hidden" name="mode" value="manual_import" />
                    <input type="hidden" name="limit" value={campaign.discoveryLimit} />
                    <input type="hidden" name="redirectTo" value={pagePath} />
                    <textarea name="rows" required rows={4} placeholder="https://directory.example/listing | https://directory.example/submit | Example Directory | https://directory.example/policy" className="w-full resize-y rounded-lg border border-[#dfe3eb] bg-white px-3 py-2 text-[8px] leading-5 outline-none focus:border-[#6177f2]" />
                    <button disabled={!workspaceReady} className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#dfe3eb] bg-white text-[9px] font-semibold text-[#344054] disabled:text-[#98a2b3]"><Upload size={11} /> {pick(locale, "Import for review", "导入供审核", "Importar para revisión")}</button>
                  </form>
                </details>
              </div>
            ) : null}
          </section>
        ) : null}

        {campaign ? <LifecycleStrip locale={locale} counts={data.counts} selectedStatus={selectedStatus} siteId={params.site} campaignId={campaign.id} /> : null}

        {campaign ? (
          <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="data-panel min-w-0 overflow-hidden">
              <div className="flex flex-col justify-between gap-3 border-b border-[#e7eaf0] px-5 py-4 sm:flex-row sm:items-center">
                <div><p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#8b94a5]">{pick(locale, "Review queue", "审核队列", "Cola de revisión")}</p><h2 className="mt-1 text-base font-semibold">{pick(locale, "Link opportunities", "外链机会", "Oportunidades de enlace")}</h2></div>
                {data.canManage && campaignActive && data.opportunities.some((item) => item.status === "discovered" && item.risk !== "blocked") ? (
                  <form id={`approve-${campaign.id}`} action="/api/link-opportunities/approve" method="post">
                    <input type="hidden" name="redirectTo" value={pagePath} />
                    <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#111827] px-3 text-[9px] font-semibold text-white"><ShieldCheck size={11} /> {pick(locale, "Approve selected", "批准所选", "Aprobar seleccionadas")} · {feature.maximumBatchSize} max</button>
                  </form>
                ) : null}
              </div>

              {data.opportunities.length ? (
                <div className="divide-y divide-[#edf0f5]">
                  {data.opportunities.map((opportunity) => {
                    const selected = data.selectedOpportunity?.id === opportunity.id;
                    const selectable = data.canManage && workspaceReady && campaignActive && opportunity.status === "discovered" && opportunity.risk !== "blocked";
                    return (
                      <article key={opportunity.id} className={`grid gap-3 px-5 py-4 transition sm:grid-cols-[22px_minmax(0,1fr)_auto] sm:items-center ${selected ? "bg-[#f7f8ff] shadow-[inset_2px_0_0_#6177f2]" : "bg-white hover:bg-[#fafbfd]"}`}>
                        <div>
                          {selectable ? <input form={`approve-${campaign.id}`} type="checkbox" name="opportunityIds" value={opportunity.id} aria-label={pick(locale, `Select ${opportunity.destinationName}`, `选择 ${opportunity.destinationName}`, `Seleccionar ${opportunity.destinationName}`)} className="size-3.5 accent-[#111827]" /> : <span className={`block size-2 rounded-full ${opportunity.status === "verified" ? "bg-[#39d6ba]" : opportunity.status === "needs_action" ? "bg-[#e87962]" : "bg-[#d0d5dd]"}`} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link href={campaignHref({ siteId: params.site, campaignId: campaign.id, status: selectedStatus, opportunityId: opportunity.id })} className="truncate text-[11px] font-semibold text-[#111827] hover:text-[#5268d9]">{opportunity.destinationName}</Link>
                            <span className={`rounded px-1.5 py-0.5 font-mono text-[7px] font-semibold uppercase ${riskTone(opportunity.risk)}`}>{riskLabel(locale, opportunity.risk)}</span>
                          </div>
                          <p className="mt-1 truncate text-[9px] text-[#667085]">{opportunity.rationale}</p>
                          <div className="mt-2 flex flex-wrap gap-3 font-mono text-[8px] text-[#98a2b3]"><span>{opportunity.destinationDomain}</span><span>{categoryLabel(locale, opportunity.category)}</span><span>{opportunity.relevanceScore}/100</span><span>{opportunity.submissionMode === "official_api" ? "API" : pick(locale, "manual", "人工", "manual")}</span></div>
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <OpportunityStatusBadge locale={locale} status={opportunity.status} />
                          <Link href={campaignHref({ siteId: params.site, campaignId: campaign.id, status: selectedStatus, opportunityId: opportunity.id })} aria-label={pick(locale, "Open evidence", "打开证据", "Abrir evidencia")} className="flex size-8 items-center justify-center rounded-lg border border-[#dfe3eb] bg-white text-[#667085] hover:border-[#bac5f8] hover:text-[#5268d9]"><ArrowRight size={12} /></Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="p-5"><EmptyData title={pick(locale, selectedStatus === "all" ? "No opportunities discovered yet" : "No opportunities match this status", selectedStatus === "all" ? "尚未发现机会" : "没有符合此状态的机会", selectedStatus === "all" ? "Aún no hay oportunidades" : "No hay oportunidades con este estado")} body={pick(locale, selectedStatus === "all" ? "Run competitor-gap discovery, recover lost links, or import a reviewed list above." : "Choose another lifecycle stage or clear the status filter.", selectedStatus === "all" ? "可运行竞品差距发现、恢复丢链，或在上方导入已审核列表。" : "请选择其他流程阶段或清除状态筛选。", selectedStatus === "all" ? "Ejecuta brechas, recupera enlaces perdidos o importa una lista revisada." : "Elige otra etapa o elimina el filtro.")} action={selectedStatus !== "all" ? <Link href={campaignHref({ siteId: params.site, campaignId: campaign.id, status: "all" })} className="inline-flex h-9 items-center rounded-lg bg-[#111827] px-3 text-[9px] font-semibold text-white">{pick(locale, "Clear filter", "清除筛选", "Quitar filtro")}</Link> : undefined} /></div>
              )}
            </div>

            <OpportunityDetail locale={locale} opportunity={data.selectedOpportunity} canManage={data.canManage} workspaceReady={workspaceReady} campaignActive={campaignActive} redirectTo={pagePath} />
          </section>
        ) : (
          <div className="data-panel p-5"><EmptyData title={pick(locale, "No link campaign yet", "还没有外链活动", "Aún no hay campaña de enlaces")} body={pick(locale, data.sites.length ? "Create a controlled campaign below. Discovery can scale to 300 candidates, while every external write remains gated." : "Connect a verified Search Console property before creating a campaign.", data.sites.length ? "请在下方创建受控活动。机会发现最多可扩展到 300 个候选，但每次外部写入仍需审批。" : "请先连接一个已验证的 Search Console 网站，再创建活动。", data.sites.length ? "Crea una campaña controlada abajo. El descubrimiento admite hasta 300 candidatos y cada escritura sigue controlada." : "Conecta una propiedad verificada de Search Console antes de crear una campaña.")} action={!data.sites.length ? <Link href="/app/connect" className="inline-flex h-9 items-center rounded-lg bg-[#111827] px-3 text-[9px] font-semibold text-white">{pick(locale, "Connect property", "连接网站", "Conectar propiedad")}</Link> : undefined} /></div>
        )}

        {campaign ? (
          <section className="data-panel overflow-hidden">
            <div className="border-b border-[#e7eaf0] px-5 py-4"><p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#8b94a5]">{pick(locale, "Audit trail", "审计轨迹", "Registro de auditoría")}</p><h2 className="mt-1 text-base font-semibold">{pick(locale, "Recent campaign events", "最近活动事件", "Eventos recientes")}</h2></div>
            {data.events.length ? <div className="max-h-[420px] divide-y divide-[#edf0f5] overflow-y-auto">{data.events.map((event) => <article key={event.id} className="grid gap-2 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_180px_130px] sm:items-center"><div><p className="text-[10px] font-semibold text-[#344054]">{eventLabel(locale, event)}</p>{event.fromStatus || event.toStatus ? <p className="mt-1 font-mono text-[8px] text-[#98a2b3]">{event.fromStatus || "—"} → {event.toStatus || "—"}</p> : null}</div><p className="truncate text-[8px] text-[#667085]">{event.actorEmail || event.actorType}</p><time className="font-mono text-[8px] text-[#98a2b3]">{event.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC</time></article>)}</div> : <p className="px-5 py-8 text-center text-[9px] text-[#98a2b3]">{pick(locale, "No campaign events recorded yet.", "尚未记录活动事件。", "Aún no hay eventos registrados.")}</p>}
          </section>
        ) : null}

        {data.canManage && data.sites.length ? (
          <section id="create-campaign" className="relative overflow-hidden rounded-[18px] border border-[#17382f] bg-[#0d1713] p-5 text-white shadow-[0_18px_55px_rgba(13,23,19,0.16)] sm:p-6">
            <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:32px_32px]" />
            <div className="relative">
              <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-[#d8bb89]"><Send size={17} /></span><div><p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#d8bb89]">{pick(locale, "New controlled campaign", "新建受控活动", "Nueva campaña controlada")}</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.025em]">{pick(locale, "Set the owned target and brand profile", "设置自有目标页面与品牌资料", "Define el destino propio y el perfil de marca")}</h2><p className="mt-2 max-w-3xl text-[9px] leading-5 text-white/45">{pick(locale, "The target URL must belong to the selected verified property. Discovery is capped at 300 and does not authorize any external submission.", "目标 URL 必须属于所选的已验证网站。发现上限为 300，创建活动并不授权任何外部提交。", "La URL objetivo debe pertenecer a la propiedad verificada. Descubrir hasta 300 candidatos no autoriza ningún envío externo.")}</p></div></div>
              <form action="/api/link-campaigns" method="post" className="mt-6 grid gap-3 lg:grid-cols-2">
                <input type="hidden" name="redirectTo" value="/app/link-campaigns" />
                <label className="grid gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-white/45">{pick(locale, "Property", "网站", "Propiedad")}<select name="siteId" defaultValue={params.site || ""} required className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-[10px] normal-case tracking-normal text-white outline-none focus:border-[#d8bb89]"><option value="" className="text-[#111827]">{pick(locale, "Select a property", "选择网站", "Seleccionar propiedad")}</option>{data.sites.map((site) => <option key={site.id} value={site.id} className="text-[#111827]">{site.siteUrl.replace(/^sc-domain:/, "")}</option>)}</select></label>
                <label className="grid gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-white/45">{pick(locale, "Campaign name", "活动名称", "Nombre de campaña")}<input name="name" required maxLength={160} placeholder={pick(locale, "SaaS authority opportunities", "SaaS 权威机会", "Oportunidades de autoridad SaaS")} className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-[10px] normal-case tracking-normal text-white outline-none placeholder:text-white/20 focus:border-[#d8bb89]" /></label>
                <label className="grid gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-white/45">{pick(locale, "Owned target URL", "自有目标 URL", "URL objetivo propia")}<input name="targetUrl" type="url" required maxLength={2048} placeholder="https://example.com/product" className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-[10px] normal-case tracking-normal text-white outline-none placeholder:text-white/20 focus:border-[#d8bb89]" /></label>
                <label className="grid gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-white/45">{pick(locale, "Discovery limit", "发现上限", "Límite de descubrimiento")}<select name="discoveryLimit" defaultValue="100" className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-[10px] normal-case tracking-normal text-white outline-none focus:border-[#d8bb89]"><option value="100" className="text-[#111827]">100</option><option value="200" className="text-[#111827]">200</option><option value="300" className="text-[#111827]">300</option></select></label>
                <label className="grid gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-white/45">{pick(locale, "Brand name", "品牌名称", "Nombre de marca")}<input name="brandName" required maxLength={160} className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-[10px] normal-case tracking-normal text-white outline-none focus:border-[#d8bb89]" /></label>
                <label className="grid gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-white/45">{pick(locale, "Category", "产品分类", "Categoría")}<input name="category" maxLength={160} placeholder="SEO software" className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-[10px] normal-case tracking-normal text-white outline-none placeholder:text-white/20 focus:border-[#d8bb89]" /></label>
                <label className="grid gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-white/45">{pick(locale, "Contact email", "联系邮箱", "Correo de contacto")}<input name="contactEmail" type="email" maxLength={320} defaultValue={session.email} className="h-10 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-[10px] normal-case tracking-normal text-white outline-none focus:border-[#d8bb89]" /></label>
                <label className="grid gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-white/45 lg:col-span-2">{pick(locale, "Short description", "简短描述", "Descripción breve")}<textarea name="description" required maxLength={5000} rows={3} className="resize-y rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-[10px] leading-5 normal-case tracking-normal text-white outline-none focus:border-[#d8bb89]" /></label>
                <div className="flex flex-col justify-between gap-3 border-t border-white/8 pt-4 lg:col-span-2 sm:flex-row sm:items-center"><p className="max-w-2xl text-[8px] leading-4 text-white/35">{pick(locale, "Creating a draft does not submit anything. Activate it, review each candidate, then explicitly approve eligible destinations.", "创建草稿不会提交任何内容。请先启用活动、逐条审核候选，再明确批准符合条件的目标。", "Crear un borrador no envía nada. Actívalo, revisa cada candidato y aprueba explícitamente los destinos aptos.")}</p><button disabled={!workspaceReady} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#d8bb89] px-4 text-[9px] font-semibold text-[#0d1713] disabled:cursor-not-allowed disabled:opacity-45"><Plus size={12} /> {pick(locale, "Create draft campaign", "创建活动草稿", "Crear borrador")}</button></div>
              </form>
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
