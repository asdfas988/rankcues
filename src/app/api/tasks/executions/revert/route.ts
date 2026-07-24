import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";
import {
  getGitHubRepositoryForSite,
  getTaskExecutionById,
  getTaskForExecution,
  getWordPressCredentialsForSite,
  setTaskExecutionStatus,
} from "@/lib/data-store";
import { closeGitHubPullRequest } from "@/lib/github-app";
import { readRequestData, respond } from "@/lib/request-data";
import { trashWordPressDraft } from "@/lib/wordpress";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const body = await readRequestData(request);
  const execution = await getTaskExecutionById(String(body.executionId || ""));
  if (!execution || !["draft_created", "pr_created"].includes(execution.status)) {
    return respond(request, body, { status: "invalid_state" }, "/app/tasks?execution=invalid", { status: 409 });
  }
  const task = await getTaskForExecution(execution.taskId);
  if (!task?.siteId || !execution.externalId) {
    return respond(request, body, { status: "invalid_task" }, "/app/tasks?execution=invalid", { status: 409 });
  }
  try {
    if (execution.connector === "wordpress") {
      const connection = await getWordPressCredentialsForSite(task.siteId);
      if (!connection) throw new Error("The WordPress connection is no longer available.");
      const wordpress = execution.plan.wordpress as Record<string, unknown>;
      const type = wordpress.type === "pages" ? "pages" : "posts";
      await trashWordPressDraft(connection, type, Number(execution.externalId));
    } else {
      const repository = await getGitHubRepositoryForSite(task.siteId);
      if (!repository) throw new Error("The GitHub repository is no longer available.");
      await closeGitHubPullRequest({
        installationId: repository.remoteInstallationId,
        fullName: repository.fullName,
        pullNumber: Number(execution.externalId),
      });
    }
    const reverted = await setTaskExecutionStatus(execution.id, { status: "reverted" });
    return respond(request, body, { status: "reverted", execution: reverted }, `/app/tasks?execution=reverted&task=${encodeURIComponent(task.id)}`);
  } catch (error) {
    return respond(request, body, {
      status: "revert_failed",
      message: error instanceof Error ? error.message : "Revert failed.",
    }, `/app/tasks?execution=error&task=${encodeURIComponent(task.id)}`, { status: 502 });
  }
}
