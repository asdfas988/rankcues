import { generateWeeklySeoReport } from "@/lib/ai-provider";
import {
  claimQueuedReportJob,
  completeReportJob,
  createTasksFromWeeklyReport,
  failReportJob,
  getWeeklyEvidence,
  saveWeeklyReport,
} from "@/lib/data-store";

function reportPeriod() {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export async function processQueuedReportJobs(options: {
  limit?: number;
  jobId?: string;
} = {}) {
  const limit = Math.max(1, Math.min(options.limit || 1, 3));
  const results: Array<Record<string, unknown>> = [];

  for (let index = 0; index < limit; index += 1) {
    if (options.jobId && index > 0) break;
    const job = await claimQueuedReportJob(options.jobId);
    if (!job) break;

    try {
      const evidence = await getWeeklyEvidence(job.siteId);
      if (!evidence) {
        throw new Error("No live Search Console evidence is available for this property.");
      }
      const generated = await generateWeeklySeoReport({
        request: job.request,
        evidence,
        evidenceMode: "persistent",
        outputLocale: job.outputLocale,
      });
      const period = reportPeriod();
      const reportId = await saveWeeklyReport({
        siteId: job.siteId,
        periodStart: period.start,
        periodEnd: period.end,
        outputLocale: job.outputLocale,
        report: generated.report,
        provider: generated.provider,
        usage: generated.usage,
      });
      const taskIds = await createTasksFromWeeklyReport({
        reportId,
        siteId: job.siteId,
        findings: generated.report.findings,
      });
      await completeReportJob({ jobId: job.id, reportId, taskIds });
      results.push({
        ok: true,
        jobId: job.id,
        siteId: job.siteId,
        reportId,
        taskIds,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown report error.";
      const updated = await failReportJob({
        jobId: job.id,
        attemptCount: job.attemptCount,
        error: message,
      });
      results.push({
        ok: false,
        jobId: job.id,
        siteId: job.siteId,
        status: updated?.status || "failed",
        error: message,
      });
    }
  }

  return results;
}
