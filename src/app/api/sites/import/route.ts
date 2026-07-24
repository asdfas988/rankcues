import { readRequestData, respond, splitLines } from "@/lib/request-data";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const body = await readRequestData(request);
  splitLines(body.sites);
  return respond(request, body, {
    status: "not_available",
    message: "Manual site import is disabled. Connect Google to import only verified properties.",
  }, "/app/connect?import=unavailable", { status: 501 });
}
