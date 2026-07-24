import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth-session";
import { getLocale, pick } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: pick(locale, "RankCues workspace", "RankCues 工作区", "Espacio de RankCues"),
    description: pick(
      locale,
      "Connected search rankings, traffic, changes, backlinks, AI reports and measured SEO work.",
      "集中查看已连接网站的排名、流量、变化、外链、AI 报告与可验证 SEO 工作。",
      "Consulta posiciones, tráfico, cambios, enlaces, informes de IA y trabajo SEO medible.",
    ),
    robots: { index: false, follow: false, noarchive: true },
  };
}

export default async function ProductLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return children;
}
