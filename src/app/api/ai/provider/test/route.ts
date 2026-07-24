import { testAiProvider } from "@/lib/ai-provider";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";
import { enforceActionLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const limited = await enforceActionLimit({ workspaceId: access.workspaceId, action: "ai_provider_test", limit: 2, windowSeconds: 3600 });
  if (limited) return limited;
  const wantsJson = request.headers.get("accept")?.includes("application/json");

  try {
    const result = await testAiProvider();
    if (wantsJson) return Response.json(result);

    const redirect = new URL("/app/settings", request.url);
    redirect.searchParams.set("provider", result.ok ? "connected" : "unexpected");
    return Response.redirect(redirect, 303);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI provider test failed.";
    if (wantsJson) {
      return Response.json({ ok: false, error: message }, { status: 502 });
    }

    const redirect = new URL("/app/settings", request.url);
    redirect.searchParams.set("provider", "error");
    return Response.redirect(redirect, 303);
  }
}
