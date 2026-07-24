import { setTrackedKeyword, untrackKeyword } from "@/lib/data-store";
import { readRequestData, respond } from "@/lib/request-data";
import { authorizeApiRequest, isAuthFailure } from "@/lib/auth-session";

export async function POST(request: Request) {
  const access = await authorizeApiRequest(request);
  if (isAuthFailure(access)) return access;
  const body = await readRequestData(request);
  const action = body.action?.toString() || "track";
  const fallback = "/app/keywords";

  try {
    if (action === "untrack") {
      const trackedId = body.trackedId?.toString() || "";
      if (!trackedId) {
        return respond(request, body, { status: "invalid_request", message: "Tracked keyword ID is required." }, fallback, { status: 400 });
      }
      await untrackKeyword(trackedId);
      return respond(request, body, { status: "untracked", trackedId }, fallback);
    }

    const siteId = body.siteId?.toString() || "";
    const keyword = body.keyword?.toString() || "";
    if (!siteId || !keyword.trim()) {
      return respond(request, body, { status: "invalid_request", message: "Site and keyword are required." }, fallback, { status: 400 });
    }
    const trackedId = await setTrackedKeyword({
      siteId,
      keyword,
      device: body.device?.toString(),
      source: body.source?.toString() || "manual",
    });
    return respond(request, body, { status: "tracked", trackedId }, fallback);
  } catch (error) {
    return respond(
      request,
      body,
      { status: "failed", message: error instanceof Error ? error.message : "Keyword tracking failed." },
      fallback,
      { status: 400 },
    );
  }
}
