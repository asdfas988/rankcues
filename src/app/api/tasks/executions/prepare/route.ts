import { createHash } from "node:crypto";
import {
  generateGitHubExecutionPlan,
  generateWordPressExecutionPlan,
  type ReportLocale,
} from "@/lib/ai-provider";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";
import {
  createTaskExecution,
  getGitHubRepositoryForSite,
  getTaskForExecution,
  getWordPressCredentialsForSite,
  getWorkspaceLocale,
  setTaskExecutionPreview,
  setTaskExecutionStatus,
} from "@/lib/data-store";
import { getGitHubRepositoryContext } from "@/lib/github-app";
import { enforceActionLimit } from "@/lib/rate-limit";
import { readRequestData, respond } from "@/lib/request-data";
import { findWordPressContent } from "@/lib/wordpress";

export const runtime = "nodejs";
export const maxDuration = 300;

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const limited = await enforceActionLimit({
    workspaceId: access.workspaceId,
    action: "task_execution_prepare",
    limit: 12,
    windowSeconds: 3600,
  });
  if (limited) return limited;
  const body = await readRequestData(request);
  const taskId = String(body.taskId || "");
  const connector = String(body.connector || "");
  const task = taskId ? await getTaskForExecution(taskId) : null;
  if (
    !task
    || !task.siteId
    || task.approvalStatus !== "approved"
    || !["wordpress", "github"].includes(connector)
  ) {
    return respond(request, body, {
      status: "invalid_request",
      message: "Approve a site-specific task before asking AI to prepare execution.",
    }, "/app/tasks?execution=invalid", { status: 400 });
  }

  let executionId: string | null = null;
  try {
    const locale = await getWorkspaceLocale() as ReportLocale;
    const aiTask = {
      title: task.title,
      description: task.description,
      recommendation: task.recommendation,
      evidence: task.evidence,
    };
    if (connector === "wordpress") {
      const connection = await getWordPressCredentialsForSite(task.siteId);
      if (!connection) throw new Error("Connect this site to WordPress before preparing an AI draft.");
      const affectedEntity = String(task.evidence.affectedEntity || task.description || task.siteUrl || "");
      const current = await findWordPressContent(connection, affectedEntity);
      const execution = await createTaskExecution({
        taskId,
        connector: "wordpress",
        beforeSnapshot: {
          sourceId: current.id,
          type: current.type,
          link: current.link,
          status: current.status,
          title: current.title,
          contentHash: digest(current.content),
          contentLength: current.content.length,
        },
      });
      executionId = execution.id;
      const generated = await generateWordPressExecutionPlan({ locale, task: aiTask, current });
      const plan = JSON.parse(JSON.stringify(generated.plan)) as Record<string, unknown>;
      const wordpress = plan.wordpress as Record<string, unknown>;
      wordpress.sourceId = current.id;
      wordpress.type = current.type;
      wordpress.sourceUrl = current.link;
      const prepared = await setTaskExecutionPreview(execution.id, {
        risk: generated.plan.risk,
        plan,
        beforeSnapshot: {
          sourceId: current.id,
          type: current.type,
          link: current.link,
          status: current.status,
          title: current.title,
          contentHash: digest(current.content),
          contentLength: current.content.length,
        },
      });
      return respond(request, body, { status: "preview_ready", execution: prepared }, `/app/tasks?execution=prepared&task=${encodeURIComponent(taskId)}`);
    }

    const repository = await getGitHubRepositoryForSite(task.siteId);
    if (!repository) throw new Error("Map this site to a GitHub repository before preparing a Draft Pull Request.");
    const context = await getGitHubRepositoryContext({
      installationId: repository.remoteInstallationId,
      fullName: repository.fullName,
      defaultBranch: repository.defaultBranch,
      taskText: `${task.title}\n${task.description}\n${task.recommendation}`,
    });
    const execution = await createTaskExecution({
      taskId,
      connector: "github",
      beforeSnapshot: {
        repository: repository.fullName,
        branch: repository.defaultBranch,
        baseSha: context.baseSha,
        files: context.files.map((file) => ({ path: file.path, sha: file.sha, contentHash: digest(file.content) })),
      },
    });
    executionId = execution.id;
    const generated = await generateGitHubExecutionPlan({
      locale,
      task: aiTask,
      repository: {
        fullName: repository.fullName,
        defaultBranch: repository.defaultBranch,
        files: context.files,
      },
    });
    const plan = JSON.parse(JSON.stringify(generated.plan)) as Record<string, unknown>;
    const github = plan.github as Record<string, unknown>;
    const files = github.files as Array<Record<string, unknown>>;
    const sourceByPath = new Map(context.files.map((file) => [file.path, file]));
    github.files = files.map((file) => ({
      ...file,
      sha: sourceByPath.get(String(file.path))?.sha,
    }));
    github.repository = {
      id: repository.id,
      fullName: repository.fullName,
      defaultBranch: repository.defaultBranch,
      installationId: repository.remoteInstallationId,
      baseSha: context.baseSha,
    };
    const prepared = await setTaskExecutionPreview(execution.id, {
      risk: generated.plan.risk,
      plan,
      beforeSnapshot: {
        repository: repository.fullName,
        branch: repository.defaultBranch,
        baseSha: context.baseSha,
        files: context.files.map((file) => ({ path: file.path, sha: file.sha, contentHash: digest(file.content) })),
      },
    });
    return respond(request, body, { status: "preview_ready", execution: prepared }, `/app/tasks?execution=prepared&task=${encodeURIComponent(taskId)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI execution preparation failed.";
    if (executionId) {
      await setTaskExecutionStatus(executionId, { status: "failed", error: message });
    }
    return respond(request, body, { status: "preparation_failed", message }, `/app/tasks?execution=error&task=${encodeURIComponent(taskId)}`, { status: 502 });
  }
}
