import { getAiProviderPublicStatus } from "@/lib/ai-provider";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  try {
    return Response.json(getAiProviderPublicStatus());
  } catch (error) {
    return Response.json(
      {
        configured: false,
        error: error instanceof Error ? error.message : "Invalid AI provider configuration.",
      },
      { status: 500 },
    );
  }
}
