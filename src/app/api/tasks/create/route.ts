import { createTask } from "@/lib/data-store";
import { readRequestData, respond } from "@/lib/request-data";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const body = await readRequestData(request);
  const title = String(body.title || "").trim();
  if (!title) return respond(request, body, { status: "invalid_request", message: "Task title is required." }, "/app/tasks", { status: 400 });
  const id = await createTask({
    siteId: body.siteId ? String(body.siteId) : null,
    eventId: body.eventId ? String(body.eventId) : null,
    title,
    description: String(body.description || ""),
    priority: String(body.priority || "medium"),
    source: body.eventId ? "event" : "manual",
  });
  return respond(request, body, { status: "created", id }, "/app/tasks?created=1");
}
