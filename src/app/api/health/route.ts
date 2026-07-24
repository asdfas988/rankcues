import { getAiProviderPublicStatus } from "@/lib/ai-provider";
import { getPersistencePublicStatus } from "@/lib/data-store";
import { getGooglePublicStatus } from "@/lib/google-search-console";
import { ensureDatabaseSchema, getDatabase } from "@/lib/database";

export const dynamic = "force-dynamic";

export async function GET() {
  const database = getPersistencePublicStatus();
  const google = getGooglePublicStatus();
  const ai = getAiProviderPublicStatus();
  let databaseReachable = false;
  if (database.ready) {
    try {
      await ensureDatabaseSchema();
      const [schema] = await getDatabase()`
        select
          to_regclass('public.rankcues_action_windows') is not null as action_windows_ready,
          to_regclass('public.rankcues_sync_runs_one_active_idx') is not null as run_lock_ready,
          to_regclass('public.rankcues_wordpress_connections') is not null as wordpress_ready,
          to_regclass('public.rankcues_github_installations') is not null as github_ready,
          to_regclass('public.rankcues_github_repositories') is not null as repositories_ready,
          to_regclass('public.rankcues_task_executions') is not null as executions_ready
      `;
      databaseReachable = Boolean(
        schema?.action_windows_ready
        && schema?.run_lock_ready
        && schema?.wordpress_ready
        && schema?.github_ready
        && schema?.repositories_ready
        && schema?.executions_ready
      );
    } catch (error) {
      console.error("Health check could not reach the database", error);
    }
  }
  const ready = databaseReachable && google.configured && ai.configured;
  return Response.json(
    {
      status: ready ? "ready" : "degraded",
      services: {
        database: databaseReachable ? "ready" : "unavailable",
        google: google.configured ? "ready" : "unavailable",
        ai: ai.configured ? "ready" : "unavailable",
      },
      checkedAt: new Date().toISOString(),
    },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
