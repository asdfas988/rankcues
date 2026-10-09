import Link from "next/link";
import { ArrowRight, ArrowUpRight, Sprout } from "lucide-react";
import { pick, type AppLocale } from "@/lib/i18n";

export function WorkspaceOnboarding({ locale }: { locale: AppLocale }) {
  const steps = [
    [
      pick(locale, "Connect Google", "连接 Google", "Conectar Google"),
      pick(
        locale,
        "Use an account with access to a verified Search Console property. Its visible properties will be imported.",
        "使用能访问已验证 Search Console 网站的账号；系统会导入该账号可见的网站。",
        "Usa una cuenta con acceso a Search Console. Se importarán sus propiedades visibles.",
      ),
    ],
    [
      pick(locale, "Sync one website", "同步一个网站", "Sincronizar un sitio"),
      pick(
        locale,
        "Open an imported site and sync its search data. Start here; Analytics and page snapshots can be added later.",
        "打开已导入的网站并同步搜索数据。Analytics 和页面快照可以稍后接入。",
        "Abre un sitio e importa sus datos. Puedes añadir Analytics y capturas más adelante.",
      ),
    ],
    [
      pick(
        locale,
        "Review your first report",
        "查看第一份报告",
        "Revisar tu primer informe",
      ),
      pick(
        locale,
        "Generate findings from the connected data, check the sources and choose your first task.",
        "基于已接入数据生成报告，查看证据来源，再选择第一项任务。",
        "Genera hallazgos, revisa las fuentes y elige tu primera tarea.",
      ),
    ],
  ];
  return (
    <section className="setup-guide" aria-labelledby="setup-title">
      <div className="setup-guide-heading">
        <div>
          <p className="eyebrow">
            {pick(
              locale,
              "START HERE / YOUR FIRST REPORT",
              "从这里开始 / 第一份报告",
              "EMPIEZA AQUÍ / TU PRIMER INFORME",
            )}
          </p>
          <h2 id="setup-title">
            {pick(
              locale,
              "A useful first step for your website.",
              "从一个网站，找到值得做的下一步。",
              "Un primer paso útil para tu sitio.",
            )}
          </h2>
          <p>
            {pick(
              locale,
              "Connect search data to see where traffic is moving and what deserves attention. Follow these three steps to your first report.",
              "连接搜索数据，了解流量的变化和需要关注的问题。完成下面三步，就能开始查看第一份报告。",
              "Conecta tus datos para ver qué cambia y qué necesita atención. Sigue estos tres pasos.",
            )}
          </p>
        </div>
        <span className="setup-guide-icon">
          <Sprout size={24} />
        </span>
      </div>
      <ol>
        {steps.map(([title, body], i) => (
          <li key={title}>
            <span>0{i + 1}</span>
            <h3>{title}</h3>
            <p>{body}</p>
          </li>
        ))}
      </ol>
      <div className="setup-guide-actions">
        <Link href="/app/connect" className="rc-button">
          {pick(
            locale,
            "Set up my first site",
            "开始连接网站",
            "Configurar mi primer sitio",
          )}
          <ArrowRight size={15} />
        </Link>
        <Link href="/#sample-report" className="rc-text-link">
          {pick(
            locale,
            "See a sample first",
            "先看看报告示例",
            "Ver un ejemplo primero",
          )}
          <ArrowUpRight size={15} />
        </Link>
      </div>
      <p className="setup-guide-footnote">
        {pick(
          locale,
          "Google access is read-only. Initial results depend on the data available in your Search Console property.",
          "Google 数据权限为只读。首次分析的内容取决于 Search Console 中已有的数据。",
          "El acceso a Google es de solo lectura. Los resultados dependen de los datos disponibles.",
        )}
      </p>
    </section>
  );
}

export function WorkspaceNextStep({
  locale,
  syncedSiteId,
  reportCount,
}: {
  locale: AppLocale;
  syncedSiteId?: string;
  reportCount: number;
}) {
  if (reportCount > 0) return null;
  return (
    <section className="workspace-next">
      <div>
        <p className="eyebrow">
          {pick(locale, "NEXT STEP", "下一步", "SIGUIENTE PASO")}
        </p>
        <h2>
          {syncedSiteId
            ? pick(
                locale,
                "Your search data is ready for a first report.",
                "搜索数据已就绪，可以生成首份报告。",
                "Tus datos están listos para el primer informe.",
              )
            : pick(
                locale,
                "Your sites are connected. Bring in their search data.",
                "网站已连接，接下来同步搜索数据。",
                "Tus sitios están conectados. Importa sus datos.",
              )}
        </h2>
        <p>
          {pick(
            locale,
            "Start with one site. You can add Analytics and page snapshots as you go.",
            "从一个网站开始，Analytics 和页面快照可按需添加。",
            "Empieza con un sitio. Añade Analytics y capturas cuando los necesites.",
          )}
        </p>
      </div>
      <Link
        href={
          syncedSiteId
            ? `/app/reports?site=${encodeURIComponent(syncedSiteId)}`
            : "/app/connect#properties"
        }
        className="rc-button"
      >
        {syncedSiteId
          ? pick(
              locale,
              "Create my first report",
              "生成第一份报告",
              "Crear mi primer informe",
            )
          : pick(
              locale,
              "Choose a site to sync",
              "选择网站并同步",
              "Elegir un sitio",
            )}
        <ArrowRight size={15} />
      </Link>
    </section>
  );
}
