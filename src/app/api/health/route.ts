import { getAiProviderPublicStatus } from "@/lib/ai-provider";
import { getPersistencePublicStatus } from "@/lib/data-store";
import { getGooglePublicStatus } from "@/lib/google-search-console";
import { ensureDatabaseSchema, getDatabase } from "@/lib/database";
import { getLinkCampaignPublicStatus } from "@/lib/link-campaigns";

export const dynamic = "force-dynamic";

export async function GET() {
  const database = getPersistencePublicStatus();
  const google = getGooglePublicStatus();
  const ai = getAiProviderPublicStatus();
  const linkCampaigns = getLinkCampaignPublicStatus();
  let databaseReachable = false;
  let linkCampaignsReady = !linkCampaigns.enabled;
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
          to_regclass('public.rankcues_task_executions') is not null as executions_ready,
          to_regclass('public.rankcues_link_campaigns') is not null as link_campaigns_ready,
          to_regclass('public.rankcues_link_jobs') is not null as link_jobs_ready,
          to_regclass('public.rankcues_link_verifications') is not null as link_verifications_ready,
          (select count(*) = 9 from pg_constraint where conname = any(array[
            'rankcues_link_campaigns_workspace_site_fk',
            'rankcues_link_opportunities_workspace_campaign_fk',
            'rankcues_link_opportunities_workspace_site_fk',
            'rankcues_link_submissions_workspace_campaign_fk',
            'rankcues_link_submissions_workspace_opportunity_fk',
            'rankcues_link_submissions_workspace_site_fk',
            'rankcues_link_jobs_workspace_submission_fk',
            'rankcues_link_verifications_workspace_submission_fk',
            'rankcues_link_events_workspace_campaign_fk'
          ])) as link_tenant_constraints_ready
      `;
      databaseReachable = Boolean(
        schema?.action_windows_ready
        && schema?.run_lock_ready
        && schema?.wordpress_ready
        && schema?.github_ready
        && schema?.repositories_ready
        && schema?.executions_ready
      );
      linkCampaignsReady = !linkCampaigns.enabled || Boolean(
        schema?.link_campaigns_ready
        && schema?.link_jobs_ready
        && schema?.link_verifications_ready
        && schema?.link_tenant_constraints_ready
      );
    } catch (error) {
      console.error("Health check could not reach the database", error);
    }
  }
  const ready = databaseReachable && google.configured && ai.configured && linkCampaignsReady;
  return Response.json(
    {
      status: ready ? "ready" : "degraded",
      services: {
        database: databaseReachable ? "ready" : "unavailable",
        google: google.configured ? "ready" : "unavailable",
        ai: ai.configured ? "ready" : "unavailable",
        linkCampaigns: linkCampaignsReady ? "ready" : "schema_required",
      },
      checkedAt: new Date().toISOString(),
    },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
