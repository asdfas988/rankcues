import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";
import { disconnectWordPressConnection } from "@/lib/data-store";
import { readRequestData, respond } from "@/lib/request-data";

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const body = await readRequestData(request);
  const connectionId = String(body.connectionId || "");
  if (!connectionId) {
    return respond(request, body, { status: "invalid_request" }, "/app/settings?wordpress=invalid", { status: 400 });
  }
  const removed = await disconnectWordPressConnection(connectionId);
  return respond(request, body, { status: removed ? "disconnected" : "not_found" }, "/app/settings?wordpress=disconnected");
}
