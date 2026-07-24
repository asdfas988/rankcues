import {
  githubExecutionPlanSchema,
  wordpressExecutionPlanSchema,
} from "@/lib/ai-provider";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";
import {
  claimTaskExecution,
  getGitHubRepositoryForSite,
  getTaskForExecution,
  getWordPressCredentialsForSite,
  setTaskExecutionStatus,
} from "@/lib/data-store";
import { createGitHubDraftPullRequest } from "@/lib/github-app";
import { enforceActionLimit } from "@/lib/rate-limit";
import { readRequestData, respond } from "@/lib/request-data";
import { createWordPressDraft } from "@/lib/wordpress";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const limited = await enforceActionLimit({
    workspaceId: access.workspaceId,
    action: "task_execution_execute",
    limit: 20,
    windowSeconds: 3600,
  });
  if (limited) return limited;
  const body = await readRequestData(request);
  const executionId = String(body.executionId || "");
  const execution = executionId ? await claimTaskExecution(executionId) : null;
  if (!execution) {
    return respond(request, body, {
      status: "invalid_state",
      message: "This execution preview is no longer awaiting approval.",
    }, "/app/tasks?execution=invalid", { status: 409 });
  }
  const task = await getTaskForExecution(execution.taskId);
  if (!task || !task.siteId || task.approvalStatus !== "approved") {
    await setTaskExecutionStatus(execution.id, { status: "failed", error: "The task is no longer approved." });
    return respond(request, body, { status: "invalid_task" }, "/app/tasks?execution=invalid", { status: 409 });
  }
  try {
    if (execution.connector === "wordpress") {
      const connection = await getWordPressCredentialsForSite(task.siteId);
      if (!connection) throw new Error("The WordPress connection is no longer available.");
      const plan = wordpressExecutionPlanSchema.parse(execution.plan);
      const draft = await createWordPressDraft(connection, {
        type: plan.wordpress.type,
        sourceId: plan.wordpress.sourceId,
        title: plan.wordpress.title,
        content: plan.wordpress.content,
        excerpt: plan.wordpress.excerpt,
      });
      const completed = await setTaskExecutionStatus(execution.id, {
        status: "draft_created",
        afterSnapshot: draft,
        externalId: String(draft.id),
        externalUrl: draft.editUrl,
        approved: true,
      });
      return respond(request, body, { status: "draft_created", execution: completed }, `/app/tasks?execution=draft_created&task=${encodeURIComponent(task.id)}`);
    }

    const repository = await getGitHubRepositoryForSite(task.siteId);
    if (!repository) throw new Error("The mapped GitHub repository is no longer available.");
    const plan = githubExecutionPlanSchema.passthrough().parse(execution.plan);
    const repositoryPlan = (execution.plan.github as Record<string, unknown>).repository as Record<string, unknown> | undefined;
    if (!repositoryPlan || String(repositoryPlan.id) !== repository.id || String(repositoryPlan.fullName) !== repository.fullName) {
      throw new Error("The GitHub repository mapping changed after this preview was generated.");
    }
    const files = ((execution.plan.github as Record<string, unknown>).files || []) as Array<Record<string, unknown>>;
    const pull = await createGitHubDraftPullRequest({
      installationId: repository.remoteInstallationId,
      fullName: repository.fullName,
      defaultBranch: repository.defaultBranch,
      taskId: execution.id,
      taskTitle: task.title,
      prTitle: plan.github.prTitle,
      prBody: `${plan.github.prBody}\n\n---\nPrepared by RankCues from approved task \`${task.id}\`.`,
      files: files.map((file) => ({
        path: String(file.path || ""),
        content: String(file.content || ""),
        sha: file.sha ? String(file.sha) : undefined,
      })),
    });
    const completed = await setTaskExecutionStatus(execution.id, {
      status: "pr_created",
      afterSnapshot: pull,
      externalId: String(pull.number),
      externalUrl: pull.url,
      approved: true,
    });
    return respond(request, body, { status: "pr_created", execution: completed }, `/app/tasks?execution=pr_created&task=${encodeURIComponent(task.id)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI execution failed.";
    await setTaskExecutionStatus(execution.id, { status: "failed", error: message });
    return respond(request, body, { status: "execution_failed", message }, `/app/tasks?execution=error&task=${encodeURIComponent(task.id)}`, { status: 502 });
  }
}
