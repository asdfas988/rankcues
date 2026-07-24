import { updateTaskWorkflow, verifyTaskOutcome } from "@/lib/data-store";
import { readRequestData, respond } from "@/lib/request-data";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const body = await readRequestData(request);
  const taskId = String(body.taskId || body.id || "");
  const legacyStatus = String(body.status || "");
  const action = String(body.action || (legacyStatus === "in_progress" ? "start" : legacyStatus === "done" ? "complete" : legacyStatus === "open" ? "reopen" : "")) as "approve" | "reject" | "start" | "complete" | "reopen" | "verify";
  if (!taskId || !["approve", "reject", "start", "complete", "reopen", "verify"].includes(action)) {
    return respond(request, body, { status: "invalid_request" }, "/app/tasks", { status: 400 });
  }
  const result = action === "verify"
    ? await verifyTaskOutcome(taskId, true)
    : await updateTaskWorkflow(taskId, action);
  return respond(request, body, { status: "updated", taskId, action, result }, "/app/tasks?updated=1");
}
