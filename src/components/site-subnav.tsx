import Link from "next/link";
import { pick, type AppLocale } from "@/lib/i18n";

export type SiteTab = "performance" | "queries" | "traffic" | "changes";

// One site, four views. The views live on separate routes (they predate this
// navigation); the tabs make them read as one place.
export function SiteSubnav({ siteId, current, locale }: { siteId: string; current: SiteTab; locale: AppLocale }) {
  const id = encodeURIComponent(siteId);
  const tabs: Array<[SiteTab, string, string]> = [
    ["performance", `/app/sites/${id}`, pick(locale, "Performance", "表现", "Rendimiento")],
    ["queries", `/app/keywords?site=${id}`, pick(locale, "Queries", "查询词", "Consultas")],
    ["traffic", `/app/traffic?site=${id}`, pick(locale, "GA4 traffic", "GA4 流量", "Tráfico GA4")],
    ["changes", `/app/audit?site=${id}`, pick(locale, "Changes", "改动", "Cambios")],
  ];
  return (
    <nav className="ws-subnav" aria-label={pick(locale, "Site views", "网站视图", "Vistas del sitio")}>
      {tabs.map(([key, href, label]) => (
        <Link key={key} href={href} aria-current={current === key ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}
