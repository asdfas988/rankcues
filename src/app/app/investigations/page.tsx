import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileWarning,
  GitCompareArrows,
  Link2,
  SearchX,
  ShieldAlert,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/rankcues-ui";
import { getWorkspaceSetupProgress, listGa4Properties, listGscSites } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SEO Investigation Playbooks",
};

const playbooks = [
  {
    slug: "traffic-decline",
    title: "Organic traffic decline",
    prompt: "Find where demand, rankings and on-site sessions diverged.",
    icon: BarChart3,
    needs: ["GSC", "GA4"],
    output: "Affected pages and queries, the first divergence date, confidence labels and a verification plan.",
    process: ["Compare equal GSC windows", "Segment landing pages", "Check GA4 sessions", "Overlay recorded changes"],
  },
  {
    slug: "ctr-decline",
    title: "CTR decline",
    prompt: "Separate snippet weakness from ranking or demand changes.",
    icon: Activity,
    needs: ["GSC"],
    output: "High-impression query/page pairs, position-adjusted CTR movement and testable snippet actions.",
    process: ["Hold position bands constant", "Compare query intent", "Inspect title changes", "Define test window"],
  },
  {
    slug: "content-decay",
    title: "Content decay",
    prompt: "Detect sustained loss without mistaking seasonality for decay.",
    icon: FileWarning,
    needs: ["GSC", "Crawl"],
    output: "Decay candidates ranked by lost clicks, structural evidence and refresh priority.",
    process: ["Require sustained decline", "Compare year-over-year", "Inspect page evidence", "Prioritize recoverable loss"],
  },
  {
    slug: "cannibalization",
    title: "Keyword cannibalization",
    prompt: "Find queries where competing URLs create unstable intent ownership.",
    icon: GitCompareArrows,
    needs: ["GSC"],
    output: "Competing URL pairs, switching frequency, intent diagnosis and merge/differentiate recommendations.",
    process: ["Group query by URL", "Detect URL switching", "Compare intent", "Choose a canonical owner"],
  },
  {
    slug: "site-change-impact",
    title: "Site-change impact",
    prompt: "Measure what happened after a recorded page or deployment change.",
    icon: Link2,
    needs: ["GSC", "Crawl"],
    output: "Before/after metrics, nearby confounders, evidence state and the next measurement date.",
    process: ["Set the change date", "Capture a baseline", "Check nearby events", "Measure after the lag window"],
  },
  {
    slug: "indexing-regression",
    title: "Indexing regression",
    prompt: "Trace lost visibility to page-state and crawl changes.",
    icon: SearchX,
    needs: ["GSC", "Crawl"],
    output: "Affected URL groups, detected technical changes, likely scope and prioritized inspection tasks.",
    process: ["Find impression loss", "Group URL patterns", "Compare crawl evidence", "Separate detection from cause"],
  },
] as const;

export default async function InvestigationsPage() {
  const [sites, ga4, setup] = await Promise.all([listGscSites(), listGa4Properties(), getWorkspaceSetupProgress()]);
  const sourceReady = {
    GSC: sites.some((site) => site.pageCount > 0 || site.queryCount > 0),
    GA4: ga4.some((property) => property.siteId && property.lastSyncedAt),
    Crawl: setup.crawledSiteIds.length > 0,
  };

  return (
    <AppShell active="/app/investigations">
      <PageHeader
        kicker="Investigation playbooks"
        title="Start with a question, not an empty prompt."
        body="Each playbook defines the required evidence, comparison steps and expected output before AI analysis begins. Availability reflects the data connected to this workspace."
        action={<Link href="/app/connect" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dfe3eb] bg-white px-3.5 text-[11px] font-semibold text-[#344054]">Review sources <ArrowRight size={13} /></Link>}
      />

      <div className="grid gap-4 px-4 pb-8 sm:px-6 lg:px-8">
        <section className="data-panel grid overflow-hidden md:grid-cols-[1fr_auto]">
          <div className="px-5 py-5">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#eef1ff] text-[#5268d9]"><ShieldAlert size={16} /></span>
              <div><h2 className="text-[12px] font-semibold">Evidence boundary</h2><p className="mt-1 max-w-3xl text-[10px] leading-5 text-[#667085]">Playbooks organize an investigation; they do not prove causation. Outputs keep detected facts, correlations and hypotheses separate, then attach a follow-up window to every recommended action.</p></div>
            </div>
          </div>
          <div className="flex items-center gap-4 border-t border-[#edf0f5] px-5 py-4 md:border-l md:border-t-0">
            {Object.entries(sourceReady).map(([source, ready]) => <span key={source} className={`inline-flex items-center gap-1.5 font-mono text-[9px] uppercase ${ready ? "text-[#087f6b]" : "text-[#98a2b3]"}`}>{ready ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}{source}</span>)}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          {playbooks.map(({ slug, title, prompt, icon: Icon, needs, output, process }) => {
            const available = needs.every((source) => sourceReady[source]);
            return (
              <article key={slug} className="data-panel overflow-hidden">
                <div className="flex items-start justify-between gap-4 border-b border-[#edf0f5] px-5 py-5">
                  <div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f2f4f7] text-[#475467]"><Icon size={16} /></span><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-[10px] leading-5 text-[#667085]">{prompt}</p></div></div>
                  <span className={`shrink-0 rounded-md px-2 py-1 font-mono text-[8px] font-semibold uppercase ${available ? "bg-[#eafbf6] text-[#087f6b]" : "bg-[#fff7e8] text-[#9a6700]"}`}>{available ? "Ready" : "Needs data"}</span>
                </div>
                <div className="grid gap-5 px-5 py-5 sm:grid-cols-[0.8fr_1.2fr]">
                  <div><p className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#98a2b3]">Required sources</p><div className="mt-2 flex flex-wrap gap-1.5">{needs.map((source) => <span key={source} className={`rounded-md border px-2 py-1 font-mono text-[8px] ${sourceReady[source] ? "border-[#b7ebdf] bg-[#effbf8] text-[#087f6b]" : "border-[#e3e7ef] bg-[#f8fafc] text-[#667085]"}`}>{source}</span>)}</div><p className="mt-4 font-mono text-[8px] uppercase tracking-[0.12em] text-[#98a2b3]">Expected output</p><p className="mt-2 text-[10px] leading-5 text-[#667085]">{output}</p></div>
                  <div><p className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#98a2b3]">Investigation sequence</p><ol className="mt-2 grid gap-2">{process.map((step, index) => <li key={step} className="flex items-center gap-2 text-[10px] text-[#475467]"><span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-[#f2f4f7] font-mono text-[8px] text-[#667085]">{index + 1}</span>{step}</li>)}</ol></div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-[#edf0f5] bg-[#fafbfc] px-5 py-3"><span className="text-[9px] text-[#8b94a5]">Uses stored, comparable evidence windows</span><Link href={available ? "/app/reports" : "/app/connect"} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#4659bc]">{available ? "Open report generator" : "Connect sources"}<ArrowRight size={11} /></Link></div>
              </article>
            );
          })}
        </section>
      </div>
    </AppShell>
  );
}
