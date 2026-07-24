interface Env {
  RANKCUES: { fetch(request: Request): Promise<Response> };
  CRON_SECRET: string;
}

type CronController = { cron: string };
type WorkerContext = { waitUntil(promise: Promise<unknown>): void };

const scheduler = {
  async scheduled(controller: CronController, env: Env, ctx: WorkerContext) {
    const path = controller.cron === "0 4 * * 1"
      ? "/api/cron/weekly-reports"
      : controller.cron === "0 3 * * *"
        ? "/api/cron/daily-sync"
        : "/api/cron/report-jobs";
    ctx.waitUntil((async () => {
      const response = await env.RANKCUES.fetch(new Request(`https://rankcues-preview.internal${path}`, {
        method: "GET",
        headers: { authorization: `Bearer ${env.CRON_SECRET}` },
      }));
      const body = await response.text();
      console.log(JSON.stringify({ cron: controller.cron, path, status: response.status, body: body.slice(0, 4000) }));
      if (!response.ok) throw new Error(`${path} returned ${response.status}: ${body.slice(0, 500)}`);
    })());
  },
};

export default scheduler;
