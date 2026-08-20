interface Env {
  RANKCUES: { fetch(request: Request): Promise<Response> };
  CRON_SECRET: string;
}

type CronController = { cron: string };
type WorkerContext = { waitUntil(promise: Promise<unknown>): void };

function pathsForCron(cron: string) {
  switch (cron) {
    case "*/2 * * * *":
      return ["/api/cron/report-jobs", "/api/cron/link-jobs"];
    case "0 3 * * *":
      return ["/api/cron/daily-sync"];
    case "0 4 * * 1":
      return ["/api/cron/weekly-reports"];
    default:
      throw new Error(`Unsupported cron schedule: ${cron}`);
  }
}

const scheduler = {
  async scheduled(controller: CronController, env: Env, ctx: WorkerContext) {
    const paths = pathsForCron(controller.cron);
    ctx.waitUntil((async () => {
      const results = await Promise.allSettled(paths.map(async (path) => {
        const response = await env.RANKCUES.fetch(new Request(`https://rankcues-preview.internal${path}`, {
          method: "GET",
          headers: { authorization: `Bearer ${env.CRON_SECRET}` },
        }));
        await response.text();
        console.log(JSON.stringify({ cron: controller.cron, path, status: response.status }));
        if (!response.ok) throw new Error(`${path} returned ${response.status}`);
      }));

      const failures = results.flatMap((result, index) => result.status === "rejected"
        ? [`${paths[index]}: ${result.reason instanceof Error ? result.reason.message : "unknown failure"}`]
        : []);
      if (failures.length) throw new Error(`Scheduled invocation failed: ${failures.join("; ")}`);
    })());
  },
};

export default scheduler;
