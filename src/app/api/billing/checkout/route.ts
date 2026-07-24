import { readRequestData, respond } from "@/lib/request-data";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const body = await readRequestData(request);

  return respond(request, body, {
    status: "private_beta",
    requestedPlan: body.plan ?? "Private beta",
    message: "Self-serve billing is not open during the private beta. No charge was created.",
  }, "/pricing?billing=private-beta", { status: 501 });
}
