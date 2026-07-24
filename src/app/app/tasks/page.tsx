import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  FlaskConical,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TimerReset,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { AppShell, PageHeader } from "@/components/rankcues-ui";
import { EmptyData, SiteFilter } from "@/components/rankcues-dashboard";
import { TaskExecutionPanel } from "@/components/task-execution-panel";
import {
  listGitHubRepositories,
  listGscSites,
  listLatestTaskExecutions,
  listTasks,
  listWordPressConnections,
  type StoredTaskExecution,
} from "@/lib/data-store";
import { getLocale, pick, type AppLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Task = Awaited<ReturnType<typeof listTasks>>[number];

function label(locale: AppLocale, value: string) {
  const labels: Record<string, [string, string, string]> = {
    high: ["High", "高", "Alta"], medium: ["Medium", "中", "Media"], low: ["Low", "低", "Baja"],
    open: ["Open", "待处理", "Abierta"], in_progress: ["In progress", "进行中", "En curso"], done: ["Completed", "已完成", "Completada"],
    scheduled: ["Measurement scheduled", "等待复测", "Medición programada"], improved: ["Improved", "有改善", "Mejoró"],
    regressed: ["Regressed", "出现回退", "Empeoró"], neutral: ["No clear change", "暂无明显变化", "Sin cambio claro"],
    inconclusive: ["Inconclusive", "数据不足", "No concluyente"], manual: ["Manual", "手动", "Manual"],
    event: ["Change event", "变化事件", "Evento de cambio"], ai_report: ["AI report", "AI 报告", "Informe de IA"],
    detected: ["Detected", "已检测", "Detectado"], correlated: ["Correlated", "已关联", "Correlacionado"],
    hypothesis: ["Hypothesis", "假设", "Hipótesis"], evidence: ["Evidence", "证据", "Evidencia"],
  };
  const values = labels[value];
  return values ? values[locale === "zh" ? 1 : locale === "es" ? 2 : 0] : value.replaceAll("_", " ");
}

function TaskAction({ taskId, action, children, primary = false, redirectTo }: { taskId: string; action: string; children: React.ReactNode; primary?: boolean; redirectTo?: string }) {
  return (
    <form action="/api/tasks/update" method="post">
      <input type="hidden" name="taskId" value={taskId} />
      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
      <button name="action" value={action} className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[9px] font-semibold transition ${primary ? "bg-[#111827] text-white hover:bg-[#1f2937]" : "border border-[#dfe3eb] bg-white text-[#344054] hover:bg-[#f8fafc]"}`}>{children}</button>
    </form>
  );
}

function EvidenceBlock({ task, locale }: { task: Task; locale: AppLocale }) {
  const items = Array.isArray(task.evidence.items)
    ? task.evidence.items as Array<{ state?: string; statement?: string; source?: string }>
    : [];
  return (
    <div className="mt-4 grid gap-2">
      {items.slice(0, 3).map((item, index) => (
        <div key={`${item.statement}-${index}`} className="flex gap-2 text-[10px] leading-5 text-[#667085]">
          <span className="mt-1 h-fit rounded bg-[#eef1ff] px-1.5 py-0.5 font-mono text-[7px] uppercase text-[#5268d9]">{label(locale, item.state || "evidence")}</span>
          <span>{item.statement}<em className="ml-1 text-[#98a2b3]">{item.source ? `(${item.source})` : ""}</em></span>
        </div>
      ))}
      {!items.length && task.description ? <p className="text-[10px] leading-5 text-[#667085]">{task.description}</p> : null}
      {task.recommendation ? (
        <div className="mt-1 rounded-lg border border-[#e4e8f0] bg-[#f8fafc] p-3">
          <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-[#8b94a5]">{pick(locale, "Recommended action", "建议动作", "Acción recomendada")}</p>
          <p className="mt-1 text-[10px] leading-5 text-[#344054]">{task.recommendation}</p>
        </div>
      ) : null}
    </div>
  );
}

function TaskCard({
  task,
  locale,
  mode,
  highlighted = false,
  execution,
  canWordPress = false,
  canGitHub = false,
  redirectTo,
}: {
  task: Task;
  locale: AppLocale;
  mode: "review" | "active" | "measure" | "outcome";
  highlighted?: boolean;
  execution?: StoredTaskExecution | null;
  canWordPress?: boolean;
  canGitHub?: boolean;
  redirectTo?: string;
}) {
  const OutcomeIcon = task.measurementStatus === "improved" ? TrendingUp : task.measurementStatus === "regressed" ? TrendingDown : CircleDashed;
  return (
    <article id={highlighted ? `task-${task.id}` : undefined} className={`rounded-xl border bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.02)] ${highlighted ? "border-[#8394f3] ring-2 ring-[#6177f2]/10" : "border-[#e0e5ed]"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {task.source === "ai_report" ? <span className="inline-flex items-center gap-1 rounded bg-[#eef1ff] px-2 py-1 font-mono text-[7px] font-semibold uppercase text-[#5268d9]"><Sparkles size={9} /> {pick(locale, "AI draft", "AI 草稿", "Borrador de IA")}</span> : null}
            {highlighted ? <span className="rounded bg-[#111827] px-2 py-1 font-mono text-[7px] font-semibold uppercase text-white">{pick(locale, "This report", "本次报告", "Este informe")}</span> : null}
            <span className={`rounded px-2 py-1 font-mono text-[7px] font-semibold uppercase ${task.priority === "high" ? "bg-[#fff2f0] text-[#b42318]" : task.priority === "medium" ? "bg-[#fff7e8] text-[#9a6700]" : "bg-[#f2f4f7] text-[#667085]"}`}>{label(locale, task.priority)}</span>
          </div>
          <h3 className="mt-2 text-[12px] font-semibold leading-5 text-[#111827]">{task.title}</h3>
          <p className="mt-1 font-mono text-[8px] text-[#98a2b3]">{task.siteUrl?.replace(/^sc-domain:/, "") || pick(locale, "Portfolio", "全部网站", "Portafolio")} · {label(locale, task.source)}</p>
        </div>
        {mode === "outcome" ? <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${task.measurementStatus === "improved" ? "bg-[#eafbf6] text-[#087f6b]" : task.measurementStatus === "regressed" ? "bg-[#fff2f0] text-[#b42318]" : "bg-[#f2f4f7] text-[#667085]"}`}><OutcomeIcon size={16} /></span> : null}
      </div>
      {(mode === "review" || mode === "active") ? <EvidenceBlock task={task} locale={locale} /> : null}
      {mode === "measure" ? (
        <div className="mt-4 rounded-lg bg-[#f8fafc] p-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold"><CalendarClock size={13} className="text-[#5268d9]" />{pick(locale, "Automatic comparison", "自动效果对比", "Comparación automática")}</div>
          <p className="mt-1 text-[9px] leading-4 text-[#667085]">{pick(locale, `Baseline saved. RankCues will compare GSC, GA4 and backlinks after ${task.verificationWindowDays} days.`, `基线已保存，将在 ${task.verificationWindowDays} 天后自动对比 GSC、GA4 和外链数据。`, `La línea base está guardada. Se compararán GSC, GA4 y enlaces tras ${task.verificationWindowDays} días.`)}</p>
          <p className="mt-2 font-mono text-[8px] text-[#98a2b3]">{task.verificationDueAt ? task.verificationDueAt.toISOString().slice(0, 10) : "—"}</p>
        </div>
      ) : null}
      {mode === "outcome" ? (
        <div className="mt-4 rounded-lg bg-[#f8fafc] p-3">
          <p className="text-[10px] font-semibold">{label(locale, task.measurementStatus)}</p>
          <p className="mt-1 text-[9px] leading-5 text-[#667085]">{task.outcomeSummary || pick(locale, "No comparable signals were available.", "暂无可比较的数据指标。", "No había señales comparables.")}</p>
          <p className="mt-2 font-mono text-[8px] text-[#98a2b3]">{task.verifiedAt?.toISOString().slice(0, 10)}</p>
        </div>
      ) : null}
      {mode === "active" ? <TaskExecutionPanel taskId={task.id} locale={locale} canWordPress={canWordPress} canGitHub={canGitHub} execution={execution} /> : null}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-[#edf0f5] pt-3">
        {mode === "review" ? <><TaskAction taskId={task.id} action="approve" primary redirectTo={redirectTo}><ThumbsUp size={11} />{pick(locale, "Approve", "批准", "Aprobar")}</TaskAction><TaskAction taskId={task.id} action="reject" redirectTo={redirectTo}><ThumbsDown size={11} />{pick(locale, "Reject", "拒绝", "Rechazar")}</TaskAction></> : null}
        {mode === "active" && task.status === "open" ? <TaskAction taskId={task.id} action="start" redirectTo={redirectTo}><PlayCircle size={11} />{pick(locale, "Start", "开始", "Iniciar")}</TaskAction> : null}
        {mode === "active" ? <TaskAction taskId={task.id} action="complete" primary redirectTo={redirectTo}><CheckCircle2 size={11} />{execution && ["draft_created", "pr_created"].includes(execution.status) ? pick(locale, "Published or merged", "已发布或已合并", "Publicado o fusionado") : pick(locale, "Mark complete", "标记完成", "Completar")}</TaskAction> : null}
        {mode === "measure" ? <TaskAction taskId={task.id} action="verify" primary redirectTo={redirectTo}><FlaskConical size={11} />{pick(locale, "Verify now", "立即复测", "Verificar ahora")}</TaskAction> : null}
        {(mode === "measure" || mode === "outcome") ? <TaskAction taskId={task.id} action="reopen" redirectTo={redirectTo}><RotateCcw size={11} />{pick(locale, "Reopen", "重新打开", "Reabrir")}</TaskAction> : null}
      </div>
    </article>
  );
}

function Lane({ icon, kicker, title, count, children }: { icon: React.ReactNode; kicker: string; title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="data-panel min-w-0 overflow-hidden">
      <header className="flex items-center justify-between border-b border-[#e7eaf0] px-4 py-4">
        <div><p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#8b94a5]">{kicker}</p><h2 className="mt-1 text-[13px] font-semibold">{title}</h2></div>
        <span className="flex items-center gap-2 rounded-lg bg-[#f2f4f7] px-2.5 py-1.5 font-mono text-[9px] text-[#667085]">{icon}{count}</span>
      </header>
      <div className="grid gap-3 p-3">{children}</div>
    </section>
  );
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ generated?: string; reportId?: string; site?: string }> }) {
  const params = await searchParams;
  const [tasks, sites, locale, wordpressConnections, githubRepositories, executions] = await Promise.all([
    listTasks(params.site),
    listGscSites(),
    getLocale(),
    listWordPressConnections(),
    listGitHubRepositories(),
    listLatestTaskExecutions(),
  ]);
  const wordpressSiteIds = new Set(wordpressConnections.map((connection) => connection.siteId));
  const githubSiteIds = new Set(githubRepositories.flatMap((repository) => repository.siteId ? [repository.siteId] : []));
  const executionByTask = new Map(executions.map((execution) => [execution.taskId, execution]));
  const review = tasks.filter((task) => task.approvalStatus === "pending");
  const active = tasks.filter((task) => task.approvalStatus === "approved" && task.status !== "done");
  const measuring = tasks.filter((task) => task.status === "done" && task.measurementStatus === "scheduled");
  const outcomes = tasks.filter((task) => ["improved", "regressed", "neutral", "inconclusive"].includes(task.measurementStatus));
  const generatedTasks = params.reportId ? tasks.filter((task) => task.reportId === params.reportId) : [];
  const generatedTaskIds = new Set(generatedTasks.map((task) => task.id));
  const generatedSiteId = generatedTasks[0]?.siteId || params.site;
  const generatedReview = generatedTasks.filter((task) => task.approvalStatus === "pending").length;
  const generatedActive = generatedTasks.filter((task) => task.approvalStatus === "approved" && task.status !== "done").length;
  const generatedMeasuring = generatedTasks.filter((task) => task.status === "done" && task.measurementStatus === "scheduled").length;
  const generatedOutcomes = generatedTasks.filter((task) => ["improved", "regressed", "neutral", "inconclusive"].includes(task.measurementStatus)).length;
  const filterSites = sites.filter((site) => site.active && site.permissionLevel !== "siteUnverifiedUser");
  const selectedSite = filterSites.find((site) => site.id === params.site);
  const returnPath = params.site ? `/app/tasks?site=${encodeURIComponent(params.site)}` : "/app/tasks";
  return (
    <AppShell active="/app/tasks">
      <PageHeader
        kicker={pick(locale, "Execution loop", "执行闭环", "Ciclo de ejecución")}
        title={pick(locale, "From AI finding to measured SEO outcome", "从 AI 发现到可验证的 SEO 结果", "De hallazgo de IA a resultado SEO medido")}
        body={pick(locale, "AI reports create reviewable drafts. Approved work keeps its evidence, captures a baseline, and is automatically checked against GSC, GA4 and backlink data after completion.", "AI 报告会自动生成待审批任务。批准后保留证据并保存基线，完成任务后按验证窗口自动对比 GSC、GA4 和外链效果。", "Los informes de IA crean borradores revisables. Al aprobarlos se guarda la evidencia y la línea base; después se verifican automáticamente con GSC, GA4 y enlaces.")}
      />
      <div className="grid gap-4 px-4 pb-8 sm:px-6 lg:px-8">
        <section className="data-panel flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-[#8b94a5]">
              {pick(locale, "Task scope", "任务范围", "Ámbito de tareas")}
            </p>
            <p className="mt-1 truncate text-[11px] font-semibold text-[#344054]">
              {selectedSite
                ? selectedSite.siteUrl.replace(/^sc-domain:/, "")
                : pick(locale, "All monitored sites", "全部监控网站", "Todos los sitios monitorizados")}
            </p>
          </div>
          <SiteFilter
            sites={filterSites.map((site) => ({ id: site.id, siteUrl: site.siteUrl }))}
            selected={params.site}
            basePath="/app/tasks"
          />
        </section>
        {generatedTasks.length ? (
          <section className="relative overflow-hidden rounded-[18px] border border-[#17382f] bg-[#0d1713] px-5 py-5 text-white shadow-[0_18px_55px_rgba(13,23,19,0.16)] sm:px-6">
            <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:32px_32px]" />
            <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.16em] text-[#d8bb89]"><CheckCircle2 size={12} /> {pick(locale, "Report completed", "报告生成完成", "Informe completado")}</div>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em]">{pick(locale, `${generatedTasks.length} tasks are now being tracked`, `本次报告的 ${generatedTasks.length} 个任务已进入追踪`, `${generatedTasks.length} tareas ya están en seguimiento`)}</h2>
                <p className="mt-2 text-[10px] leading-5 text-white/50">{pick(locale, "Review every AI recommendation before execution. RankCues keeps its evidence and baseline, then measures the result after you mark the work complete.", "请先审核每条 AI 建议再执行。系统会保留证据和效果基线，并在任务完成后按验证周期自动复测。", "Revisa cada recomendación de IA antes de ejecutarla. RankCues conserva la evidencia y la línea base, y mide el resultado al completar el trabajo.")}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {generatedSiteId ? <Link href={`/app/reports?site=${encodeURIComponent(generatedSiteId)}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-[9px] font-semibold text-white/65 transition hover:bg-white/5 hover:text-white">{pick(locale, "View report", "查看报告", "Ver informe")}</Link> : null}
                <a href="#generated-tasks" className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#d8bb89] px-3 text-[9px] font-semibold text-[#0d1713] transition hover:bg-[#e5c997]">{pick(locale, "Review tasks", "审核本次任务", "Revisar tareas")} <ArrowRight size={12} /></a>
              </div>
            </div>
            <div className="relative mt-5 grid gap-px overflow-hidden rounded-xl border border-white/8 bg-white/8 sm:grid-cols-2 xl:grid-cols-4">
              {[
                [pick(locale, "01 · Report", "01 · 报告", "01 · Informe"), pick(locale, "Evidence saved", "证据已保存", "Evidencia guardada"), "complete"],
                [pick(locale, "02 · Review", "02 · 审核", "02 · Revisión"), generatedReview ? pick(locale, `${generatedReview} awaiting approval`, `${generatedReview} 个等待审批`, `${generatedReview} pendientes`) : pick(locale, "Review complete", "审核已完成", "Revisión completada"), generatedReview ? "current" : "complete"],
                [pick(locale, "03 · Execute", "03 · 执行", "03 · Ejecutar"), generatedActive ? pick(locale, `${generatedActive} active`, `${generatedActive} 个执行中`, `${generatedActive} activas`) : pick(locale, "Starts after approval", "批准后开始", "Comienza tras aprobar"), generatedActive ? "current" : "future"],
                [pick(locale, "04 · Measure", "04 · 复测", "04 · Medir"), generatedOutcomes ? pick(locale, `${generatedOutcomes} verified`, `${generatedOutcomes} 个已验证`, `${generatedOutcomes} verificadas`) : generatedMeasuring ? pick(locale, `${generatedMeasuring} scheduled`, `${generatedMeasuring} 个等待复测`, `${generatedMeasuring} programadas`) : pick(locale, "After completion", "完成后自动进行", "Tras completar"), generatedMeasuring || generatedOutcomes ? "current" : "future"],
              ].map(([name, detail, state]) => (
                <div key={name} className="flex items-center gap-3 bg-[#101d18] px-4 py-3.5">
                  <span className={`size-2 rounded-full ${state === "complete" ? "bg-[#6fd3b5]" : state === "current" ? "bg-[#d8bb89] shadow-[0_0_0_4px_rgba(216,187,137,.12)]" : "bg-white/15"}`} />
                  <div><p className="font-mono text-[8px] uppercase tracking-[0.1em] text-white/35">{name}</p><p className="mt-1 text-[9px] font-semibold text-white/70">{detail}</p></div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [pick(locale, "Awaiting review", "待审批", "Por revisar"), review.length, pick(locale, "AI suggestions", "AI 建议", "Sugerencias de IA")],
            [pick(locale, "Active work", "执行中", "Trabajo activo"), active.length, pick(locale, "Approved tasks", "已批准任务", "Tareas aprobadas")],
            [pick(locale, "Measurement queue", "复测队列", "Cola de medición"), measuring.length, pick(locale, "Baselines saved", "已保存基线", "Líneas base guardadas")],
            [pick(locale, "Verified outcomes", "已验证结果", "Resultados verificados"), outcomes.length, pick(locale, "Evidence recorded", "结果已留证", "Evidencia registrada")],
          ].map(([name, value, detail]) => <div key={String(name)} className="data-card p-4"><p className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#8b94a5]">{name}</p><p className="mt-2 text-2xl font-semibold">{value}</p><p className="mt-1 text-[9px] text-[#98a2b3]">{detail}</p></div>)}
        </div>
        <form action="/api/tasks/create" method="post" className="data-panel grid gap-3 p-4 lg:grid-cols-[180px_minmax(0,1fr)_140px_auto]">
          <input type="hidden" name="redirectTo" value={returnPath} />
          <select name="siteId" defaultValue={params.site || ""} className="h-10 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[10px]"><option value="">{pick(locale, "Portfolio task", "全站任务", "Tarea de portafolio")}</option>{filterSites.map((site) => <option key={site.id} value={site.id}>{site.siteUrl.replace(/^sc-domain:/, "")}</option>)}</select>
          <input required name="title" placeholder={pick(locale, "Add a manual action…", "添加手动任务…", "Añadir una acción manual…")} className="h-10 rounded-lg border border-[#dfe3eb] px-3 text-[11px] outline-none focus:border-[#6177f2]" />
          <select name="priority" className="h-10 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[10px]"><option value="high">{pick(locale, "High priority", "高优先级", "Prioridad alta")}</option><option value="medium">{pick(locale, "Medium priority", "中优先级", "Prioridad media")}</option><option value="low">{pick(locale, "Low priority", "低优先级", "Prioridad baja")}</option></select>
          <button className="h-10 rounded-lg bg-[#111827] px-4 text-[11px] font-semibold text-white">{pick(locale, "Add task", "添加任务", "Añadir tarea")}</button>
        </form>
        {!tasks.length ? <div className="data-panel p-5"><EmptyData title={pick(locale, "No tasks yet", "还没有任务", "Aún no hay tareas")} body={pick(locale, "Generate an AI report or create a manual action above.", "生成一份 AI 报告，或在上方添加手动任务。", "Genera un informe de IA o crea una acción manual.")} /></div> : (
          <div id={generatedTasks.length ? "generated-tasks" : undefined} className="grid scroll-mt-6 items-start gap-4 xl:grid-cols-2">
            <Lane icon={<Sparkles size={12} />} kicker={pick(locale, "Human review", "人工审核", "Revisión humana")} title={pick(locale, "AI task drafts", "AI 任务草稿", "Borradores de IA")} count={review.length}>{review.length ? review.map((task) => <TaskCard key={task.id} task={task} locale={locale} mode="review" highlighted={generatedTaskIds.has(task.id)} redirectTo={returnPath} />) : <p className="px-2 py-6 text-center text-[10px] text-[#98a2b3]">{pick(locale, "Nothing waiting for approval.", "没有等待审批的任务。", "Nada pendiente de aprobación.")}</p>}</Lane>
            <Lane icon={<ClipboardCheck size={12} />} kicker={pick(locale, "Approved", "已批准", "Aprobadas")} title={pick(locale, "Active execution", "当前执行", "Ejecución activa")} count={active.length}>{active.length ? active.map((task) => <TaskCard key={task.id} task={task} locale={locale} mode="active" highlighted={generatedTaskIds.has(task.id)} execution={executionByTask.get(task.id)} canWordPress={Boolean(task.siteId && wordpressSiteIds.has(task.siteId))} canGitHub={Boolean(task.siteId && githubSiteIds.has(task.siteId))} redirectTo={returnPath} />) : <p className="px-2 py-6 text-center text-[10px] text-[#98a2b3]">{pick(locale, "No active work.", "暂无执行中的任务。", "No hay trabajo activo.")}</p>}</Lane>
            <Lane icon={<TimerReset size={12} />} kicker={pick(locale, "After completion", "完成之后", "Después de completar")} title={pick(locale, "Measurement queue", "效果复测队列", "Cola de medición")} count={measuring.length}>{measuring.length ? measuring.map((task) => <TaskCard key={task.id} task={task} locale={locale} mode="measure" highlighted={generatedTaskIds.has(task.id)} redirectTo={returnPath} />) : <p className="px-2 py-6 text-center text-[10px] text-[#98a2b3]">{pick(locale, "Completed work will appear here until its verification date.", "任务完成后会在这里等待复测日期。", "El trabajo completado aparecerá aquí hasta su fecha de verificación.")}</p>}</Lane>
            <Lane icon={<ShieldCheck size={12} />} kicker={pick(locale, "Closed loop", "闭环结果", "Ciclo cerrado")} title={pick(locale, "Verified outcomes", "已验证结果", "Resultados verificados")} count={outcomes.length}>{outcomes.length ? outcomes.map((task) => <TaskCard key={task.id} task={task} locale={locale} mode="outcome" highlighted={generatedTaskIds.has(task.id)} redirectTo={returnPath} />) : <p className="px-2 py-6 text-center text-[10px] text-[#98a2b3]">{pick(locale, "No task has reached its verification window yet.", "还没有任务到达复测窗口。", "Ninguna tarea ha llegado aún a su ventana de verificación.")}</p>}</Lane>
          </div>
        )}
      </div>
    </AppShell>
  );
}
