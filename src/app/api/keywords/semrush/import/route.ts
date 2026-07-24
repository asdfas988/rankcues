import { readRequestData, respond } from "@/lib/request-data";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const body = await readRequestData(request);

  return respond(request, body, {
    status: "not_available",
    message: "Semrush import is not enabled in the private beta. No data was changed.",
  }, "/app/keywords?import=unavailable", { status: 501 });
}
