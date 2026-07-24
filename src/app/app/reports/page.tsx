import { Bot, CheckCircle2, Languages, ShieldAlert } from "lucide-react";
import { AppShell, PageHeader } from "@/components/rankcues-ui";
import { MessageResponse } from "@/components/ai-elements/message";
import { EmptyData, Notice, SiteFilter } from "@/components/rankcues-dashboard";
import { GenerateReportFlow } from "@/components/generate-report-flow";
import { getAiProviderPublicStatus } from "@/lib/ai-provider";
import { listGscSites, listReportJobs, listReports } from "@/lib/data-store";
import { getLocale, pick } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Finding = { title?: string; impact?: string; confidence?: number; affectedEntity?: string; recommendedAction?: string; verificationWindow?: string; evidence?: Array<{ state?: string; statement?: string; source?: string }> };

function languageName(locale: string | null | undefined) {
  return locale === "zh" ? "中文" : locale === "es" ? "Español" : locale === "en" ? "English" : null;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ site?: string; generated?: string }> }) {
  const params = await searchParams;
  const [storedSites, reports, reportJobs, locale] = await Promise.all([
    listGscSites(),
    listReports(params.site),
    listReportJobs(params.site, 6),
    getLocale(),
  ]);
  const sites = storedSites.filter((item) => item.active && item.permissionLevel !== "siteUnverifiedUser");
  const provider = getAiProviderPublicStatus();
  const latestJob = reportJobs[0];
  const latest = reports[0];
  const report = latest?.report || {};
  const findings = Array.isArray(report.findings) ? report.findings as Finding[] : [];
  const wins = Array.isArray(report.wins) ? report.wins.map(String) : [];
  const risks = Array.isArray(report.risks) ? report.risks.map(String) : [];
  const selectedLanguage = languageName(locale) || "English";
  const generatedLanguage = languageName(latest?.outputLocale);
  return (
    <AppShell active="/app/reports">
      <PageHeader
        kicker={pick(locale, "Evidence-first AI", "证据优先的 AI", "IA basada en evidencia")}
        title={pick(locale, "Weekly reports that explain what to do next", "每周告诉你下一步该做什么", "Informes semanales que explican el siguiente paso")}
        body={pick(locale, "The model receives stored GSC comparisons, GA4 context, backlink snapshots, crawl coverage and the change ledger. Correlation is never presented as proven causation.", "模型会读取已保存的 GSC 对比、GA4 背景、外链快照、抓取覆盖和变化记录；相关性不会被表述成已证实的因果关系。", "El modelo recibe comparaciones de GSC, contexto de GA4, enlaces, rastreo y cambios, sin presentar correlación como causalidad.")}
        action={(
          <GenerateReportFlow
            key={params.site || sites[0]?.id || "report-flow"}
            sites={sites.map((site) => ({ id: site.id, label: site.siteUrl.replace(/^sc-domain:/, "") }))}
            locale={locale}
            providerReady={provider.configured}
            initialSiteId={params.site}
            initialJob={latestJob ? {
              id: latestJob.id,
              siteId: latestJob.siteId,
              siteUrl: latestJob.siteUrl,
              outputLocale: latestJob.outputLocale,
              status: latestJob.status,
              reportId: latestJob.reportId,
              taskIds: latestJob.taskIds,
              error: latestJob.error,
              createdAt: latestJob.createdAt.toISOString(),
              updatedAt: latestJob.updatedAt.toISOString(),
            } : null}
          />
        )}
      />
      <div className="grid gap-4 px-4 pb-8 sm:px-6 lg:px-8">
        <Notice tone="success">{pick(locale, `New manual and weekly automatic reports will be generated in ${selectedLanguage}. Change the workspace language in the top bar to change future report output.`, `新的手动报告和每周自动报告都会使用${selectedLanguage}生成。若要更改后续报告语言，请使用顶部的后台语言切换。`, `Los nuevos informes manuales y automáticos semanales se generarán en ${selectedLanguage}. Cambia el idioma del espacio en la barra superior para modificar los próximos informes.`)}</Notice>
        {!provider.configured ? <Notice>{pick(locale, "Managed AI analysis is temporarily unavailable. Existing reports remain readable; no customer API configuration is required.", "托管 AI 分析暂时不可用；已有报告仍可查看，用户无需配置任何 API。", "El análisis de IA gestionado no está disponible temporalmente; los informes existentes siguen accesibles y no se requiere configurar ninguna API.")}</Notice> : null}
        <SiteFilter sites={sites} selected={params.site} basePath="/app/reports" />
        {!latest ? <EmptyData title={pick(locale, "No AI reports generated", "还没有 AI 报告", "Aún no hay informes de IA")} body={pick(locale, "Generate the first report above. Weekly automation will then create one report per monitored site in the selected workspace language.", "请在上方生成首份报告；之后系统会按照当前选择的后台语言，每周为每个监控网站自动生成报告。", "Genera el primer informe arriba; después se creará uno semanal por sitio en el idioma seleccionado del espacio.")} /> : (
          <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="data-panel h-fit overflow-hidden"><div className="border-b border-[#e7eaf0] px-4 py-4"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">{pick(locale, "Report archive", "报告归档", "Archivo de informes")}</p><h2 className="mt-1 text-sm font-semibold">{pick(locale, `${reports.length} generated`, `已生成 ${reports.length} 份`, `${reports.length} generados`)}</h2></div><div className="divide-y divide-[#edf0f5]">{reports.slice(0, 12).map((item, index) => <a key={item.id} href={`/app/reports?site=${encodeURIComponent(item.siteId)}`} className={`block px-4 py-4 ${index === 0 ? "bg-[#f7f8ff]" : "hover:bg-[#fafbfc]"}`}><div className="flex items-center justify-between gap-2"><p className="truncate text-[10px] font-semibold">{item.siteUrl.replace(/^sc-domain:/, "")}</p>{languageName(item.outputLocale) ? <span className="shrink-0 font-mono text-[7px] uppercase text-[#5268d9]">{languageName(item.outputLocale)}</span> : null}</div><p className="mt-1 font-mono text-[8px] text-[#98a2b3]">{item.periodStart} → {item.periodEnd}</p></a>)}</div></aside>
            <article className="data-panel overflow-hidden"><header className="border-b border-[#e7eaf0] bg-[#0b1220] px-6 py-6 text-white"><div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/40">{pick(locale, "Weekly investigation", "每周分析报告", "Investigación semanal")} · {latest.periodEnd}</p>{generatedLanguage ? <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 font-mono text-[8px] text-white/65"><Languages size={10} /> {generatedLanguage}</span> : null}</div><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">{latest.siteUrl.replace(/^sc-domain:/, "")}</h2></div><div className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-[#8da2ff]"><Bot size={20} /></div></div>{typeof report.healthScore === "number" ? <div className="mt-5 flex items-end gap-2"><span className="text-4xl font-semibold">{report.healthScore}</span><span className="pb-1 text-[10px] text-white/45">{pick(locale, "/100 evidence health", "/100 证据健康度", "/100 salud de evidencias")}</span></div> : null}</header>
              <div className="grid gap-6 p-6"><section><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">{pick(locale, "Executive summary", "执行摘要", "Resumen ejecutivo")}</p><MessageResponse className="mt-3 text-[12px] leading-6 text-[#344054]">{String(report.executiveSummary || pick(locale, "No summary was returned.", "模型没有返回摘要。", "No se devolvió ningún resumen."))}</MessageResponse></section>
                {(wins.length || risks.length) ? <section className="grid gap-4 md:grid-cols-2"><div className="rounded-xl border border-[#b7ebdf] bg-[#f2fcf9] p-4"><div className="flex items-center gap-2 text-[10px] font-semibold text-[#087f6b]"><CheckCircle2 size={14} /> {pick(locale, "Wins", "积极信号", "Avances")}</div><ul className="mt-3 grid gap-2">{wins.map((item) => <li key={item} className="text-[10px] leading-5 text-[#344054]">• {item}</li>)}</ul></div><div className="rounded-xl border border-[#f1d6a4] bg-[#fff9ee] p-4"><div className="flex items-center gap-2 text-[10px] font-semibold text-[#835500]"><ShieldAlert size={14} /> {pick(locale, "Risks", "风险", "Riesgos")}</div><ul className="mt-3 grid gap-2">{risks.map((item) => <li key={item} className="text-[10px] leading-5 text-[#344054]">• {item}</li>)}</ul></div></section> : null}
                <section><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">{pick(locale, "Prioritized findings", "优先发现", "Hallazgos prioritarios")}</p><div className="mt-3 grid gap-3">{findings.map((finding, index) => <div key={`${finding.title}-${index}`} className="rounded-xl border border-[#e2e7ef] p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-[12px] font-semibold">{index + 1}. {finding.title}</h3><span className="rounded-md bg-[#f2f4f7] px-2 py-1 font-mono text-[8px] uppercase text-[#667085]">{finding.impact} · {Math.round((finding.confidence || 0) * 100)}%</span></div><p className="mt-2 font-mono text-[8px] text-[#98a2b3]">{finding.affectedEntity}</p><div className="mt-4 grid gap-2">{finding.evidence?.map((evidence, evidenceIndex) => <div key={evidenceIndex} className="flex gap-2 text-[10px] leading-5"><span className="mt-1 h-fit rounded bg-[#eef1ff] px-1.5 py-0.5 font-mono text-[7px] uppercase text-[#5268d9]">{evidence.state}</span><span className="text-[#667085]">{evidence.statement} <em className="text-[#98a2b3]">({evidence.source})</em></span></div>)}</div><div className="mt-4 rounded-lg bg-[#f8fafc] p-3"><p className="text-[10px] font-semibold text-[#111827]">{pick(locale, "Recommended action", "建议动作", "Acción recomendada")}</p><MessageResponse className="mt-1 text-[10px] leading-5 text-[#667085]">{finding.recommendedAction || ""}</MessageResponse><p className="mt-2 font-mono text-[8px] text-[#5268d9]">{pick(locale, "Verify", "验证", "Verificar")}: {finding.verificationWindow}</p></div></div>)}</div></section>
              </div>
            </article>
          </div>
        )}
      </div>
    </AppShell>
  );
}
