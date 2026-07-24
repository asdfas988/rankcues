"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ExternalLink,
  FileCode2,
  GitPullRequestDraft,
  LayoutPanelTop,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";

type AppLocale = "en" | "zh" | "es";
type Connector = "wordpress" | "github";

function pick<T>(locale: AppLocale, en: T, zh: T, es: T): T {
  return locale === "zh" ? zh : locale === "es" ? es : en;
}

type Execution = {
  id: string;
  connector: Connector;
  status: string;
  risk: "low" | "medium" | "high";
  plan: Record<string, unknown>;
  externalUrl: string | null;
  error: string | null;
};

type TaskExecutionPanelProps = {
  taskId: string;
  locale: AppLocale;
  canWordPress: boolean;
  canGitHub: boolean;
  execution?: Execution | null;
};

type DialogMode =
  | "confirm_prepare"
  | "preparing"
  | "confirm_execute"
  | "executing"
  | "confirm_revert"
  | "reverting"
  | "error"
  | null;

function textAt(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function TaskExecutionPanel({
  taskId,
  locale,
  canWordPress,
  canGitHub,
  execution,
}: TaskExecutionPanelProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [connector, setConnector] = useState<Connector>(execution?.connector || "wordpress");
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [error, setError] = useState("");
  const [retryAction, setRetryAction] = useState<"prepare" | "execute" | "revert">("prepare");
  const plan = execution?.plan || {};
  const changes = Array.isArray(plan.changes)
    ? plan.changes.slice(0, 6) as Array<{ label?: string; before?: string; after?: string; reason?: string }>
    : [];
  const busy = ["preparing", "executing", "reverting"].includes(dialog || "");
  const isReady = execution?.status === "draft_created" || execution?.status === "pr_created";

  useEffect(() => {
    if (!dialog) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setDialog(null);
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])"));
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [busy, dialog]);

  function askToPrepare(nextConnector: Connector, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setConnector(nextConnector);
    setDialog("confirm_prepare");
  }

  async function runAction(
    endpoint: string,
    payload: Record<string, string>,
    running: DialogMode,
    expected: string[],
  ) {
    setDialog(running);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({})) as { status?: string; message?: string };
      if (!response.ok || !result.status || !expected.includes(result.status)) {
        throw new Error(result.message || pick(locale, "The AI action could not be completed.", "AI 操作未能完成。", "La acción de IA no pudo completarse."));
      }
      setDialog(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : pick(locale, "Unknown execution error.", "发生未知执行错误。", "Error de ejecución desconocido."));
      setDialog("error");
    }
  }

  function prepare() {
    setRetryAction("prepare");
    return runAction(
      "/api/tasks/executions/prepare",
      { taskId, connector },
      "preparing",
      ["preview_ready"],
    );
  }

  function execute() {
    if (!execution) return;
    setRetryAction("execute");
    return runAction(
      "/api/tasks/executions/execute",
      { executionId: execution.id },
      "executing",
      ["draft_created", "pr_created"],
    );
  }

  function revert() {
    if (!execution) return;
    setRetryAction("revert");
    return runAction(
      "/api/tasks/executions/revert",
      { executionId: execution.id },
      "reverting",
      ["reverted"],
    );
  }

  return (
    <>
      <div className="mt-4 overflow-hidden rounded-xl border border-[#dce3df] bg-[#f8fbf9]">
        <div className="flex items-center justify-between gap-3 border-b border-[#e1e8e4] px-3.5 py-3">
          <div className="flex items-center gap-2 text-[9px] font-semibold text-[#21483c]"><Bot size={13} /> {pick(locale, "AI execution", "AI 执行", "Ejecución con IA")}</div>
          <span className="font-mono text-[7px] uppercase tracking-[0.1em] text-[#7c8d86]">{pick(locale, "Second approval required", "需要二次批准", "Segunda aprobación")}</span>
        </div>

        {execution?.status === "preview_ready" ? (
          <div className="p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded bg-white px-2 py-1 font-mono text-[7px] font-semibold uppercase text-[#5268d9]">{execution.connector === "wordpress" ? <LayoutPanelTop size={9} /> : <GitPullRequestDraft size={9} />}{execution.connector === "wordpress" ? "WordPress draft" : "GitHub Draft PR"}</span>
              <span className={`rounded px-2 py-1 font-mono text-[7px] font-semibold uppercase ${execution.risk === "high" ? "bg-[#fff2f0] text-[#b42318]" : execution.risk === "medium" ? "bg-[#fff7e8] text-[#9a6700]" : "bg-[#eafbf6] text-[#087f6b]"}`}>{pick(locale, `${execution.risk} risk`, `${execution.risk === "high" ? "高" : execution.risk === "medium" ? "中" : "低"}风险`, `Riesgo ${execution.risk === "high" ? "alto" : execution.risk === "medium" ? "medio" : "bajo"}`)}</span>
            </div>
            <p className="mt-3 text-[11px] font-semibold leading-5 text-[#1d2939]">{textAt(plan.summary, pick(locale, "AI change preview", "AI 修改预览", "Vista previa de cambios de IA"))}</p>
            <p className="mt-1 text-[9px] leading-5 text-[#667085]">{textAt(plan.rationale)}</p>
            <div className="mt-3 grid gap-2">
              {changes.map((change, index) => (
                <div key={`${change.label}-${index}`} className="rounded-lg border border-[#e2e7ee] bg-white p-3">
                  <p className="text-[9px] font-semibold text-[#344054]">{change.label || pick(locale, "Proposed change", "建议修改", "Cambio propuesto")}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div><p className="font-mono text-[7px] uppercase text-[#98a2b3]">{pick(locale, "Before", "修改前", "Antes")}</p><p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[8px] leading-4 text-[#667085]">{change.before || "—"}</p></div>
                    <div><p className="font-mono text-[7px] uppercase text-[#087f6b]">{pick(locale, "After", "修改后", "Después")}</p><p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[8px] leading-4 text-[#344054]">{change.after || "—"}</p></div>
                  </div>
                </div>
              ))}
            </div>
            <button ref={triggerRef} type="button" onClick={() => setDialog("confirm_execute")} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#111827] text-[9px] font-semibold text-white transition hover:bg-[#1f2937]"><ShieldCheck size={12} /> {pick(locale, execution.connector === "wordpress" ? "Approve and create draft" : "Approve and create Draft PR", execution.connector === "wordpress" ? "批准并创建草稿" : "批准并创建 Draft PR", execution.connector === "wordpress" ? "Aprobar y crear borrador" : "Aprobar y crear Draft PR")}</button>
          </div>
        ) : isReady ? (
          <div className="p-3.5">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#eafbf6] text-[#087f6b]"><CheckCircle2 size={15} /></span>
              <div><p className="text-[10px] font-semibold text-[#1d2939]">{pick(locale, execution?.status === "draft_created" ? "WordPress draft created" : "GitHub Draft PR created", execution?.status === "draft_created" ? "WordPress 草稿已创建" : "GitHub Draft PR 已创建", execution?.status === "draft_created" ? "Borrador de WordPress creado" : "Draft PR de GitHub creado")}</p><p className="mt-1 text-[8px] leading-4 text-[#667085]">{pick(locale, "The live site has not changed. Review and publish or merge it in the connected platform.", "线上网站尚未改变，请前往已连接平台审核后发布或合并。", "El sitio en producción no ha cambiado. Revisa y publica o fusiona en la plataforma conectada.")}</p></div>
            </div>
            <div className="mt-3 flex gap-2">
              {execution?.externalUrl ? <a href={execution.externalUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-[#111827] text-[9px] font-semibold text-white">{pick(locale, "Open result", "打开执行结果", "Abrir resultado")} <ExternalLink size={11} /></a> : null}
              <button ref={triggerRef} type="button" onClick={() => setDialog("confirm_revert")} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[9px] font-semibold text-[#667085] hover:text-[#b42318]"><RotateCcw size={11} /> {pick(locale, "Revert", "撤销", "Revertir")}</button>
            </div>
          </div>
        ) : execution?.status === "failed" ? (
          <div className="p-3.5">
            <p className="text-[9px] font-semibold text-[#b42318]">{pick(locale, "The last AI execution failed", "上次 AI 执行失败", "La última ejecución de IA falló")}</p>
            <p className="mt-1 text-[8px] leading-4 text-[#667085]">{execution.error || pick(locale, "No error details were recorded.", "没有记录错误详情。", "No se registraron detalles del error.")}</p>
            <ExecutionButtons locale={locale} canWordPress={canWordPress} canGitHub={canGitHub} onPrepare={askToPrepare} />
          </div>
        ) : execution?.status === "reverted" ? (
          <div className="p-3.5">
            <p className="text-[9px] font-semibold text-[#667085]">{pick(locale, "AI output reverted", "AI 执行结果已撤销", "Resultado de IA revertido")}</p>
            <ExecutionButtons locale={locale} canWordPress={canWordPress} canGitHub={canGitHub} onPrepare={askToPrepare} />
          </div>
        ) : execution?.status === "preparing" || execution?.status === "executing" ? (
          <div role="status" className="flex items-center gap-3 p-3.5 text-[9px] text-[#667085]"><LoaderCircle size={13} className="animate-spin text-[#5268d9]" /> {pick(locale, "AI execution is running. Refresh in a moment.", "AI 执行正在进行，请稍后刷新。", "La ejecución de IA está en curso. Actualiza en un momento.")}</div>
        ) : (
          <div className="p-3.5">
            <p className="text-[9px] leading-4 text-[#667085]">{pick(locale, "Choose a connected destination. AI will prepare a preview before it writes anything.", "选择已连接的执行位置；AI 会先生成预览，不会立即写入。", "Elige un destino conectado. La IA preparará una vista previa antes de escribir.")}</p>
            <ExecutionButtons locale={locale} canWordPress={canWordPress} canGitHub={canGitHub} onPrepare={askToPrepare} />
          </div>
        )}
      </div>

      {dialog ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#07100d]/72 px-4 py-8 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="execution-dialog-title">
          <div ref={dialogRef} tabIndex={-1} className="relative w-full max-w-[520px] overflow-hidden rounded-[20px] border border-white/10 bg-[#0d1713] text-white shadow-[0_40px_140px_rgba(0,0,0,.58)] outline-none">
            <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:32px_32px]" />
            <div className="relative border-b border-white/8 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div><p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#d8bb89]">{pick(locale, "Controlled execution", "受控执行", "Ejecución controlada")}</p><h2 id="execution-dialog-title" className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{dialog === "error" ? pick(locale, "The action needs attention", "本次操作需要处理", "La acción necesita atención") : busy ? pick(locale, "AI is working", "AI 正在工作", "La IA está trabajando") : dialog === "confirm_revert" ? pick(locale, "Revert this AI output?", "撤销这个 AI 执行结果？", "¿Revertir este resultado de IA?") : dialog === "confirm_execute" ? pick(locale, "Approve the proposed write?", "批准执行这次写入？", "¿Aprobar la escritura propuesta?") : pick(locale, "Prepare an AI change preview?", "让 AI 准备修改预览？", "¿Preparar una vista previa con IA?")}</h2></div>
                {!busy ? <button type="button" onClick={() => setDialog(null)} aria-label={pick(locale, "Close", "关闭", "Cerrar")} className="flex size-8 items-center justify-center rounded-full border border-white/10 text-white/55 hover:text-white"><X size={14} /></button> : null}
              </div>
            </div>
            <div className="relative px-6 py-6">
              {dialog === "error" ? <div role="alert" className="rounded-xl border border-[#e87962]/25 bg-[#e87962]/10 p-4 text-[10px] leading-5 text-[#f5a18e]">{error}</div> : <div className="rounded-xl border border-white/8 bg-white/[0.045] p-4"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-white/[0.06] text-[#d8bb89]">{connector === "wordpress" ? <LayoutPanelTop size={15} /> : <GitPullRequestDraft size={15} />}</span><div><p className="text-[10px] font-semibold">{connector === "wordpress" ? "WordPress draft" : "GitHub Draft PR"}</p><p className="mt-1 text-[8px] text-white/38">{pick(locale, "No direct production publish or merge", "不会直接发布或合并到生产环境", "Sin publicación ni fusión directa")}</p></div></div></div>}
              {busy ? <div role="status" aria-live="polite" className="mt-4 flex items-center justify-between rounded-xl border border-[#d8bb89]/18 bg-[#d8bb89]/7 px-4 py-3"><div><p className="text-[10px] font-semibold text-[#ead1a7]">{dialog === "preparing" ? pick(locale, "Reading evidence and preparing a diff", "正在读取证据并生成差异预览", "Leyendo evidencias y preparando diferencias") : dialog === "executing" ? pick(locale, "Writing the approved draft", "正在写入已批准的草稿", "Escribiendo el borrador aprobado") : pick(locale, "Reverting the external artifact", "正在撤销外部执行结果", "Revirtiendo el resultado externo")}</p><p className="mt-1 text-[8px] text-white/38">{pick(locale, "Keep this page open until the action finishes.", "请保持页面打开，直到操作完成。", "Mantén esta página abierta hasta que termine.")}</p></div><LoaderCircle size={17} className="animate-spin text-[#d8bb89]" /></div> : null}
              {!busy ? <div className="mt-5 flex justify-end gap-2 border-t border-white/8 pt-5"><button type="button" onClick={() => setDialog(null)} className="h-10 rounded-lg border border-white/10 px-4 text-[9px] font-semibold text-white/58 hover:bg-white/5">{pick(locale, "Cancel", "取消", "Cancelar")}</button><button type="button" onClick={dialog === "confirm_prepare" || dialog === "error" && retryAction === "prepare" ? prepare : dialog === "confirm_execute" || dialog === "error" && retryAction === "execute" ? execute : revert} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#d8bb89] px-4 text-[9px] font-semibold text-[#0d1713]">{dialog === "confirm_revert" ? pick(locale, "Confirm revert", "确认撤销", "Confirmar reversión") : dialog === "confirm_execute" ? pick(locale, "Approve write", "批准写入", "Aprobar escritura") : dialog === "error" ? pick(locale, "Try again", "重试", "Reintentar") : pick(locale, "Prepare preview", "准备预览", "Preparar vista")} <ArrowRight size={12} /></button></div> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ExecutionButtons({
  locale,
  canWordPress,
  canGitHub,
  onPrepare,
}: {
  locale: AppLocale;
  canWordPress: boolean;
  canGitHub: boolean;
  onPrepare: (connector: Connector, trigger: HTMLButtonElement) => void;
}) {
  if (!canWordPress && !canGitHub) {
    return <a href="/app/settings" className="mt-3 inline-flex h-8 items-center gap-2 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[8px] font-semibold text-[#5268d9]">{pick(locale, "Connect WordPress or GitHub", "连接 WordPress 或 GitHub", "Conectar WordPress o GitHub")} <ArrowRight size={10} /></a>;
  }
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {canWordPress ? <button type="button" onClick={(event) => onPrepare("wordpress", event.currentTarget)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#cfdde3] bg-white px-3 text-[8px] font-semibold text-[#21759b] hover:border-[#21759b]"><LayoutPanelTop size={11} /> {pick(locale, "Prepare WP draft", "准备 WP 草稿", "Preparar borrador WP")}</button> : null}
      {canGitHub ? <button type="button" onClick={(event) => onPrepare("github", event.currentTarget)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#d5d8dc] bg-white px-3 text-[8px] font-semibold text-[#24292f] hover:border-[#24292f]"><FileCode2 size={11} /> {pick(locale, "Prepare Draft PR", "准备 Draft PR", "Preparar Draft PR")}</button> : null}
    </div>
  );
}
