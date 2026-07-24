"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  Check,
  CircleAlert,
  Clock3,
  FileSearch,
  Languages,
  ListTodo,
  LoaderCircle,
  ShieldCheck,
  X,
} from "lucide-react";

type AppLocale = "en" | "zh" | "es";
type ReportSite = { id: string; label: string };
type JobStatus = "queued" | "processing" | "completed" | "failed";

export type ReportJobView = {
  id: string;
  siteId: string;
  siteUrl: string;
  outputLocale: AppLocale;
  status: JobStatus;
  reportId: string | null;
  taskIds: string[];
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

type GenerateReportFlowProps = {
  sites: ReportSite[];
  locale: AppLocale;
  providerReady: boolean;
  initialSiteId?: string;
  initialJob?: ReportJobView | null;
};

function pick<T>(locale: AppLocale, en: T, zh: T, es: T): T {
  return locale === "zh" ? zh : locale === "es" ? es : en;
}

function languageName(locale: AppLocale) {
  return locale === "zh" ? "中文" : locale === "es" ? "Español" : "English";
}

function isActive(status: JobStatus) {
  return status === "queued" || status === "processing";
}

function jobCopy(locale: AppLocale, job: ReportJobView) {
  if (job.status === "queued") {
    return {
      title: pick(locale, "Report queued", "报告已进入队列", "Informe en cola"),
      body: pick(
        locale,
        "It will continue in the background. You can close this page.",
        "任务会在后台继续运行，现在可以关闭页面。",
        "Continuará en segundo plano. Puedes cerrar esta página.",
      ),
    };
  }
  if (job.status === "processing") {
    return {
      title: pick(locale, "AI investigation in progress", "AI 正在后台分析", "Análisis de IA en curso"),
      body: pick(
        locale,
        "Evidence is being analyzed and task drafts are being prepared.",
        "正在分析证据并生成待审核任务，离开页面不会中断。",
        "Se analizan las evidencias y se preparan tareas para revisión.",
      ),
    };
  }
  if (job.status === "completed") {
    return {
      title: pick(locale, "Report and tasks are ready", "报告与任务已生成", "Informe y tareas listos"),
      body: pick(
        locale,
        `${job.taskIds.length} task drafts were created for review.`,
        `已生成 ${job.taskIds.length} 条待审核任务。`,
        `Se crearon ${job.taskIds.length} borradores para revisar.`,
      ),
    };
  }
  return {
    title: pick(locale, "Report needs attention", "报告生成需要处理", "El informe necesita atención"),
    body: job.error || pick(
      locale,
      "The background run failed after retrying.",
      "后台任务重试后仍未成功。",
      "La tarea en segundo plano falló tras reintentarlo.",
    ),
  };
}

export function GenerateReportFlow({
  sites,
  locale,
  providerReady,
  initialSiteId,
  initialJob = null,
}: GenerateReportFlowProps) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [siteId, setSiteId] = useState(
    sites.some((site) => site.id === initialSiteId) ? initialSiteId! : sites[0]?.id || "",
  );
  const [dialog, setDialog] = useState<"confirm" | "error" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [job, setJob] = useState<ReportJobView | null>(initialJob);
  const selectedSite = sites.find((site) => site.id === siteId);
  const selectedLanguage = languageName(locale);
  const activeForSelectedSite = Boolean(job && job.siteId === siteId && isActive(job.status));
  const disabled = !providerReady || !sites.length || isSubmitting || activeForSelectedSite;

  useEffect(() => {
    if (!dialog) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) setDialog(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [dialog, isSubmitting]);

  useEffect(() => {
    if (!job || !isActive(job.status)) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const response = await fetch(`/api/reports/jobs/${encodeURIComponent(job.id)}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({})) as { job?: ReportJobView };
        if (!cancelled && response.ok && payload.job) {
          setJob(payload.job);
          if (!isActive(payload.job.status)) router.refresh();
        }
      } finally {
        if (!cancelled) timer = setTimeout(poll, 3500);
      }
    };

    timer = setTimeout(poll, 1800);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [job, router]);

  async function queueReport() {
    if (!siteId || isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/ai/seo-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ siteId }),
      });
      const payload = await response.json().catch(() => ({})) as {
        status?: string;
        message?: string;
        job?: ReportJobView;
      };
      if (!response.ok || !payload.job) {
        throw new Error(payload.message || pick(
          locale,
          "The report could not be queued.",
          "报告未能进入后台队列。",
          "No se pudo poner el informe en cola.",
        ));
      }
      setJob(payload.job);
      setDialog(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : pick(
        locale,
        "Unknown queue error.",
        "创建后台任务时发生未知错误。",
        "Error desconocido al crear la tarea.",
      ));
      setDialog("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  const statusCopy = job ? jobCopy(locale, job) : null;
  const JobIcon = job?.status === "completed"
    ? Check
    : job?.status === "failed"
      ? CircleAlert
      : job?.status === "processing"
        ? LoaderCircle
        : Clock3;

  return (
    <div className="grid min-w-0 gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dfe3eb] bg-[#f8fafc] px-3 text-[10px] font-semibold text-[#475467]"
          title={pick(locale, "Uses the workspace language", "使用当前后台语言", "Usa el idioma del espacio")}
        >
          <Languages size={13} /> {selectedLanguage}
        </span>
        <select
          value={siteId}
          onChange={(event) => setSiteId(event.target.value)}
          aria-label={pick(locale, "Report site", "报告网站", "Sitio del informe")}
          className="h-9 max-w-[220px] rounded-lg border border-[#dfe3eb] bg-white px-3 text-[10px] text-[#344054] outline-none transition focus:border-[#6177f2] focus:ring-2 focus:ring-[#6177f2]/10"
        >
          {sites.map((site) => <option key={site.id} value={site.id}>{site.label}</option>)}
        </select>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => setDialog("confirm")}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#111827] px-3.5 text-[11px] font-semibold text-white transition hover:-translate-y-px hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:bg-[#d0d5dd]"
        >
          {isSubmitting ? <LoaderCircle size={13} className="animate-spin" /> : <Bot size={13} />}
          {activeForSelectedSite
            ? pick(locale, "Running in background", "正在后台运行", "En segundo plano")
            : pick(locale, "Generate report", "生成报告", "Generar informe")}
        </button>
      </div>

      {job && statusCopy ? (
        <div className={`relative overflow-hidden rounded-xl border px-3.5 py-3 shadow-[0_8px_24px_rgba(16,24,40,.06)] ${
          job.status === "failed"
            ? "border-[#f2c6bf] bg-[#fff8f6]"
            : job.status === "completed"
              ? "border-[#b9e5d9] bg-[#f2fbf8]"
              : "border-[#d9dfef] bg-[#f7f8fd]"
        }`}>
          <span className={`absolute inset-y-0 left-0 w-0.5 ${
            job.status === "failed" ? "bg-[#d96c57]" : job.status === "completed" ? "bg-[#2a9d7f]" : "bg-[#6177f2]"
          }`} />
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg ${
              job.status === "failed"
                ? "bg-[#fff0ed] text-[#b5473c]"
                : job.status === "completed"
                  ? "bg-[#e3f7f1] text-[#087f6b]"
                  : "bg-[#e9edff] text-[#5268d9]"
            }`}>
              <JobIcon size={13} className={job.status === "processing" ? "animate-spin" : ""} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold text-[#1d2939]">{statusCopy.title}</p>
              <p className="mt-1 text-[9px] leading-4 text-[#667085]">{statusCopy.body}</p>
              <p className="mt-1.5 truncate font-mono text-[7px] uppercase tracking-[0.08em] text-[#98a2b3]">
                {job.siteUrl.replace(/^sc-domain:/, "") || selectedSite?.label} · {job.id.slice(0, 8)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {job.status === "completed" ? (
                <>
                  <Link
                    href={`/app/reports?site=${encodeURIComponent(job.siteId)}`}
                    className="inline-flex h-7 items-center rounded-md border border-[#cbd5e1] bg-white px-2 text-[8px] font-semibold text-[#344054] transition hover:border-[#98a2b3]"
                  >
                    {pick(locale, "Report", "报告", "Informe")}
                  </Link>
                  {job.reportId ? (
                    <Link
                      href={`/app/tasks?reportId=${encodeURIComponent(job.reportId)}&site=${encodeURIComponent(job.siteId)}`}
                      className="inline-flex h-7 items-center gap-1 rounded-md bg-[#111827] px-2 text-[8px] font-semibold text-white"
                    >
                      {pick(locale, "Tasks", "任务", "Tareas")} <ArrowRight size={9} />
                    </Link>
                  ) : null}
                </>
              ) : null}
              <button
                type="button"
                onClick={() => setJob(null)}
                aria-label={pick(locale, "Dismiss status", "关闭状态提示", "Cerrar estado")}
                className="flex size-7 items-center justify-center rounded-md text-[#98a2b3] transition hover:bg-black/5 hover:text-[#475467]"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {dialog ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07100d]/70 px-4 py-8 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="report-dialog-title">
          <div ref={dialogRef} tabIndex={-1} className="relative w-full max-w-[590px] overflow-hidden rounded-[22px] border border-white/10 bg-[#0d1713] text-white shadow-[0_40px_140px_rgba(0,0,0,0.58)] outline-none">
            <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:32px_32px]" />
            <div className="relative border-b border-white/8 px-6 py-5 sm:px-7">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#d8bb89]">
                    {pick(locale, "Background evidence run", "后台证据分析", "Análisis de evidencias")}
                  </p>
                  <h2 id="report-dialog-title" className="mt-2 font-display text-3xl font-medium tracking-[-0.035em]">
                    {dialog === "error"
                      ? pick(locale, "The job could not be queued", "任务未能进入队列", "No se pudo crear la tarea")
                      : pick(locale, "Generate a report and task plan?", "生成报告与任务计划？", "¿Generar informe y plan de tareas?")}
                  </h2>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setDialog(null)}
                  aria-label={pick(locale, "Close", "关闭", "Cerrar")}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/55 transition hover:bg-white/8 hover:text-white disabled:opacity-40"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="relative px-6 py-6 sm:px-7">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/8 bg-white/[0.045] p-3.5">
                  <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/32">{pick(locale, "Property", "网站", "Sitio")}</p>
                  <p className="mt-2 truncate text-xs font-semibold text-white/82">{selectedSite?.label || "—"}</p>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/[0.045] p-3.5">
                  <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/32">{pick(locale, "Output language", "输出语言", "Idioma de salida")}</p>
                  <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-white/82"><Languages size={13} className="text-[#d8bb89]" /> {selectedLanguage}</p>
                </div>
              </div>

              {dialog === "error" ? (
                <div role="alert" className="mt-5 rounded-xl border border-[#e87962]/25 bg-[#e87962]/10 p-4">
                  <p className="text-xs font-semibold text-[#f5a18e]">{pick(locale, "Queue failed", "创建任务失败", "Error al crear la tarea")}</p>
                  <p className="mt-2 text-[11px] leading-5 text-white/55">{error}</p>
                </div>
              ) : (
                <>
                  <div className="mt-6 grid gap-1">
                    {[
                      [FileSearch, pick(locale, "Load stored GSC, GA4 and change evidence", "读取 GSC、GA4 与网站变更证据", "Cargar evidencias de GSC, GA4 y cambios")],
                      [Bot, pick(locale, "Run an evidence-labelled AI investigation", "运行带证据标签的 AI 分析", "Ejecutar una investigación de IA con evidencias")],
                      [ListTodo, pick(locale, "Create reviewable task drafts", "生成可审核的任务草稿", "Crear borradores de tareas revisables")],
                      [ShieldCheck, pick(locale, "Keep running after this page closes", "关闭页面后仍会继续执行", "Continuar aunque cierres esta página")],
                    ].map(([StepIcon, text]) => {
                      const Icon = StepIcon as typeof FileSearch;
                      return (
                        <div key={String(text)} className="grid grid-cols-[34px_1fr] items-center gap-3 py-2">
                          <span className="flex size-8 items-center justify-center rounded-lg border border-white/8 bg-white/[0.04] text-white/45"><Icon size={13} /></span>
                          <p className="text-[11px] text-white/62">{String(text)}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-5 rounded-xl border border-[#d8bb89]/18 bg-[#d8bb89]/[0.07] px-4 py-3 text-[10px] leading-5 text-white/58">
                    {pick(
                      locale,
                      "After the job is queued, this window closes immediately. Progress remains visible on the reports page.",
                      "任务进入队列后弹窗会立即关闭；进度会持续显示在报告页面。",
                      "Al entrar en la cola, esta ventana se cerrará y el progreso seguirá visible en la página de informes.",
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="relative flex items-center justify-end gap-2 border-t border-white/8 px-6 py-4 sm:px-7">
              <button type="button" disabled={isSubmitting} onClick={() => setDialog(null)} className="h-9 rounded-lg px-3 text-[10px] font-semibold text-white/50 transition hover:text-white disabled:opacity-40">
                {pick(locale, "Cancel", "取消", "Cancelar")}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={queueReport}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#d8bb89] px-4 text-[10px] font-semibold text-[#0d1713] transition hover:bg-[#e5c997] disabled:opacity-60"
              >
                {isSubmitting ? <LoaderCircle size={13} className="animate-spin" /> : <Bot size={13} />}
                {isSubmitting
                  ? pick(locale, "Queueing…", "正在创建…", "Creando…")
                  : dialog === "error"
                    ? pick(locale, "Try again", "重试", "Reintentar")
                    : pick(locale, "Start in background", "开始后台生成", "Iniciar en segundo plano")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
