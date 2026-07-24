import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, CircleAlert, DatabaseZap } from "lucide-react";
import { getLocale, pick } from "@/lib/i18n";

export async function SiteFilter({ sites, selected, basePath }: {
  sites: Array<{ id: string; siteUrl: string }>;
  selected?: string | null;
  basePath: string;
}) {
  const locale = await getLocale();
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={basePath} className={`rounded-lg border px-3 py-2 text-[10px] font-semibold ${!selected ? "border-[#111827] bg-[#111827] text-white" : "border-[#dfe3eb] bg-white text-[#667085]"}`}>{pick(locale, "All sites", "全部网站", "Todos los sitios")}</Link>
      {sites.map((site) => (
        <Link key={site.id} href={`${basePath}?site=${encodeURIComponent(site.id)}`} className={`max-w-[240px] truncate rounded-lg border px-3 py-2 text-[10px] font-semibold ${selected === site.id ? "border-[#111827] bg-[#111827] text-white" : "border-[#dfe3eb] bg-white text-[#667085]"}`}>
          {site.siteUrl.replace(/^sc-domain:/, "")}
        </Link>
      ))}
    </div>
  );
}

export function EmptyData({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfd6e2] bg-[#f9fafb] px-6 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl border border-[#dfe3eb] bg-white text-[#667085]"><DatabaseZap size={18} /></span>
      <h3 className="mt-4 text-sm font-semibold text-[#111827]">{title}</h3>
      <p className="mt-2 max-w-lg text-[11px] leading-5 text-[#667085]">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function DeltaBadge({ current, previous, inverse = false }: { current: number; previous: number; inverse?: boolean }) {
  const delta = previous ? ((current - previous) / previous) * 100 : current ? 100 : 0;
  const positive = inverse ? delta <= 0 : delta >= 0;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[9px] font-semibold ${positive ? "bg-[#eafbf6] text-[#087f6b]" : "bg-[#fff2f0] text-[#b42318]"}`}>
      {delta >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{Math.abs(delta).toFixed(1)}%
    </span>
  );
}

export function SourceBadge({ source }: { source: string }) {
  const tones: Record<string, string> = {
    gsc: "bg-[#eef1ff] text-[#5268d9]", crawler: "bg-[#fff7e8] text-[#9a6700]",
    ga4: "bg-[#eafbf6] text-[#087f6b]", backlink: "bg-[#f4efff] text-[#6941c6]",
    automation: "bg-[#f2f4f7] text-[#475467]", manual: "bg-[#f2f4f7] text-[#475467]",
  };
  return <span className={`rounded-md px-2 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] ${tones[source] || tones.manual}`}>{source}</span>;
}

export function Notice({ children, tone = "warning" }: { children: ReactNode; tone?: "warning" | "error" | "success" }) {
  const style = tone === "success" ? "border-[#b7ebdf] bg-[#effbf8] text-[#087f6b]" : tone === "error" ? "border-[#f5c8c2] bg-[#fff4f2] text-[#b5473c]" : "border-[#f1d6a4] bg-[#fff9ee] text-[#835500]";
  return <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-[10px] leading-5 ${style}`}><CircleAlert size={14} className="mt-0.5 shrink-0" />{children}</div>;
}

export function TrendBars({ values, color = "#6177f2" }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-16 items-end gap-1" aria-label="28-day trend">
      {values.map((value, index) => <span key={index} className="min-w-0 flex-1 rounded-t-sm opacity-80" style={{ height: `${Math.max(4, (value / max) * 100)}%`, backgroundColor: color }} />)}
    </div>
  );
}
