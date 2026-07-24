import { readRequestData, respond } from "@/lib/request-data";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const body = await readRequestData(request);

  return respond(request, body, {
    status: "not_available",
    message: "Outreach approval and sending are not enabled in the private beta. No message was sent.",
  }, "/app/overview", { status: 501 });
}
