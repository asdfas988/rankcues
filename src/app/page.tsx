import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  Clock,
  FileText,
  Gauge,
  History,
  Link2,
  SearchCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { BrandMark, MarketingHeader } from "@/components/rankcues-ui";

export const metadata: Metadata = {
  title: "SEO Reporting Software for Agencies | RankCues",
  description:
    "RankCues connects GSC, GA4 and website changes to produce evidence-backed SEO investigations and reviewable weekly client reports.",
};

const evidenceLayers = [
  {
    icon: BarChart3,
    number: "01",
    title: "Performance signals",
    body: "Find material movement across pages, queries, countries, devices and conversions without combing through every property.",
    detail: "GSC · GA4 · scheduled baselines",
  },
  {
    icon: History,
    number: "02",
    title: "Change context",
    body: "Keep a durable record of titles, content, links, canonicals, deployments and human annotations beside the affected URLs.",
    detail: "Crawler · CMS · deployment events",
  },
  {
    icon: SearchCheck,
    number: "03",
    title: "Evidence-backed action",
    body: "Separate observed facts from correlations and hypotheses, then turn the investigation into a reviewable client brief.",
    detail: "Confidence · sources · next checks",
  },
];

const workflow = [
  ["Connect", "Add GSC, GA4 and one verified site with read-only access."],
  ["Observe", "RankCues records the baseline and watches meaningful page changes."],
  ["Investigate", "Signals are joined to events, affected entities and external context."],
  ["Review", "Your team approves the evidence and edits the client-facing narrative."],
  ["Measure", "Completed work receives an explicit follow-up window and recorded outcome."],
];

const reportFindings = [
  {
    label: "Detected",
    color: "#059669",
    title: "12 titles and 4 hero sections changed",
    meta: "Crawler snapshot · Tuesday 14:12 UTC",
  },
  {
    label: "Correlated",
    color: "#d97706",
    title: "The affected URLs account for 81% of this week’s click loss",
    meta: "GSC page/query join · 82% confidence",
  },
  {
    label: "Hypothesis",
    color: "#4f46e5",
    title: "New copy may have shifted away from local-service intent",
    meta: "Validate against a fresh mobile SERP capture",
  },
];

export default function Home() {
  return (
    <main className="overflow-hidden bg-[#fafbfc] text-[#111318]">
      {/* ── Hero ─────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[#0f1223]/8">
        <div className="dot-grid absolute inset-0" />
        <div className="absolute left-1/2 top-[-340px] size-[760px] -translate-x-1/2 rounded-full bg-[#4f46e5]/[0.07] blur-[130px]" />
        <div className="absolute right-[-10%] top-[30%] size-[420px] rounded-full bg-[#4f46e5]/[0.05] blur-[110px]" />
        <MarketingHeader variant="light" />

        <div className="relative mx-auto max-w-[1200px] px-5 pb-16 pt-16 text-center sm:px-8 lg:pt-24">
          <div className="reveal chip mx-auto">
            <Sparkles size={13} className="animate-pulse-soft" /> SEO reporting software for agencies
          </div>
          <h1 className="reveal reveal-delay-1 mx-auto mt-7 max-w-[900px] text-[clamp(2.9rem,6.2vw,5.4rem)] font-semibold leading-[1.02] tracking-[-0.055em]">
            Know <span className="text-[#4f46e5]">why</span> organic performance changed.
          </h1>
          <p className="reveal reveal-delay-2 mx-auto mt-6 max-w-[640px] text-base leading-7 text-[#5b6272] sm:text-lg sm:leading-8">
            RankCues connects Search Console, Analytics and website changes so
            your team can explain what moved, show the evidence, and decide
            what happens next—before the client asks.
          </p>
          <div className="reveal reveal-delay-3 mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="btn-primary">
              Open private beta <ArrowRight size={16} />
            </Link>
            <Link href="#how-it-works" className="btn-secondary">
              See the workflow
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[12px] text-[#8a90a0]">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={14} className="text-[#4f46e5]" /> Read-only Google access
            </span>
            <span className="inline-flex items-center gap-2">
              <Check size={14} className="text-[#4f46e5]" /> Human review before delivery
            </span>
          </div>
        </div>

        {/* Product preview */}
        <div className="relative mx-auto max-w-[1080px] px-5 pb-24 sm:px-8">
          <div className="reveal reveal-delay-2 relative overflow-hidden rounded-2xl border border-[#e6e8ef] bg-white shadow-[0_2px_6px_rgba(15,18,35,0.05),0_28px_90px_rgba(15,18,35,0.09)]">
            <span className="absolute inset-x-0 top-0 z-10 h-[2px] bg-gradient-to-r from-transparent via-[#4f46e5] to-transparent" />
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef0f4] px-5 py-4">
              <div>
                <p className="text-xs font-semibold">Northstar Dental</p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8a90a0]">
                  Illustrative workflow · INV-042
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#fecaca] bg-[#fef2f2] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[#dc2626]">
                <span className="size-1.5 animate-pulse-soft rounded-full bg-[#dc2626]" /> High impact
              </span>
            </div>

            <div className="grid gap-0 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="border-b border-[#eef0f4] p-5 xl:border-b-0 xl:border-r">
                <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-[#8a90a0]">
                  Organic clicks · 7 days
                </p>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-5xl font-semibold tracking-[-0.05em]">8,421</p>
                    <p className="mt-1 text-xs font-medium text-[#dc2626]">−18.4% vs previous period</p>
                  </div>
                  <span className="flex size-11 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f46e5]">
                    <BarChart3 size={22} />
                  </span>
                </div>
                <svg viewBox="0 0 360 116" className="mt-7 h-28 w-full" aria-label="Organic clicks trend">
                  <path d="M4 30 C42 26, 54 42, 88 38 S138 22, 168 31 S219 46, 244 43 S298 81, 356 92" fill="none" stroke="#4f46e5" strokeWidth="2" />
                  <path d="M4 30 C42 26, 54 42, 88 38 S138 22, 168 31 S219 46, 244 43 S298 81, 356 92 L356 116 L4 116 Z" fill="url(#trendFill)" />
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#4f46e5" stopOpacity=".18" />
                      <stop offset="1" stopColor="#4f46e5" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#eef0f4] pt-3">
                  {[["Impressions", "−9.7%"], ["Position", "−2.4"], ["Leads", "−11"]].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-[9px] text-[#8a90a0]">{label}</p>
                      <p className="mt-1 font-mono text-xs text-[#3f4653]">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-[#8a90a0]">
                    Evidence rail
                  </p>
                  <span className="font-mono text-[9px] font-semibold text-[#4f46e5]">82% confidence</span>
                </div>
                <div className="mt-5 grid gap-5">
                  {reportFindings.map((finding) => (
                    <div key={finding.label} className="evidence-rail grid grid-cols-[18px_1fr] gap-3">
                      <span
                        className="relative z-10 mt-1 size-[9px] rounded-full border-2 border-white"
                        style={{ backgroundColor: finding.color, boxShadow: `0 0 0 1px ${finding.color}` }}
                      />
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.1em]" style={{ color: finding.color }}>
                          {finding.label}
                        </p>
                        <p className="mt-1 text-[13px] font-medium leading-5 text-[#2b303b]">{finding.title}</p>
                        <p className="mt-1 text-[10px] leading-4 text-[#8a90a0]">{finding.meta}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-xl border border-[#dfe3fb] bg-[#eef2ff] p-3.5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#4f46e5]">Next decision</p>
                  <p className="mt-2 text-xs leading-5 text-[#3f4653]">
                    Compare the previous title against current local intent before restoring or testing new copy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Evidence layers ──────────────────── */}
      <section id="product" className="px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="section-kicker">From reporting to reasoning</p>
              <h2 className="section-title">Charts are easy. Context is the work.</h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-[#5b6272] lg:justify-self-end">
              Most reporting software assembles metrics. RankCues reconstructs
              the event: which segment moved, what changed around it, what the
              evidence supports, and what still needs checking.
            </p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {evidenceLayers.map((layer) => {
              const Icon = layer.icon;
              return (
                <article key={layer.number} className="premium-card group relative overflow-hidden p-6 transition-transform duration-500 hover:-translate-y-1.5 sm:p-7">
                  <div className="absolute right-5 top-4 text-6xl font-semibold text-[#111318]/[0.05] transition-colors duration-500 group-hover:text-[#4f46e5]/[0.1]">{layer.number}</div>
                  <span className="flex size-11 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f46e5] transition-colors duration-300 group-hover:bg-[#4f46e5] group-hover:text-white">
                    <Icon size={20} />
                  </span>
                  <h3 className="mt-7 text-2xl font-semibold tracking-[-0.035em]">{layer.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#5b6272]">{layer.body}</p>
                  <p className="mt-7 border-t border-[#0f1223]/8 pt-4 font-mono text-[9px] uppercase tracking-[0.11em] text-[#8a90a0]">{layer.detail}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Workflow ─────────────────────────── */}
      <section id="how-it-works" className="border-y border-[#0f1223]/8 bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="section-kicker">Weekly operating rhythm</p>
            <h2 className="section-title">A brief your strategist can defend.</h2>
            <p className="mt-6 max-w-lg text-sm leading-7 text-[#5b6272]">
              Every narrative is traceable to source data. Your team keeps the
              final say before anything reaches a client.
            </p>
            <Link href="/features/automated-seo-reports" className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#4f46e5]">
              Explore weekly reports <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#e7e9ef] bg-white shadow-[0_2px_6px_rgba(15,18,35,0.04),0_20px_60px_rgba(15,18,35,0.06)]">
            {workflow.map(([title, body], index) => (
              <div key={title} className="group grid gap-2 border-b border-[#eef0f4] px-5 py-5 transition-colors duration-300 last:border-b-0 hover:bg-[#f7f8fa] sm:grid-cols-[56px_120px_1fr] sm:items-center sm:gap-3">
                <span className="font-mono text-[10px] font-semibold text-[#4f46e5] transition-transform duration-300 group-hover:translate-x-0.5">0{index + 1}</span>
                <span className="text-sm font-semibold">{title}</span>
                <span className="text-xs leading-6 text-[#5b6272]">{body}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Report preview + trust ───────────── */}
      <section className="px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative overflow-hidden rounded-2xl bg-[#0f1216] p-6 text-white shadow-[0_24px_80px_rgba(15,18,35,0.25)] sm:p-8">
            <span className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#4f46e5] to-transparent" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a5b4fc]">Friday client brief</p>
                <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Northstar Dental · Week 29</h3>
              </div>
              <FileText size={28} className="text-[#a5b4fc]" />
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[["Material findings", "3"], ["Decisions required", "2"], ["Evidence sources", "8"]].map(([label, value]) => (
                <div key={label} className="dark-card p-4">
                  <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-white/35">{label}</p>
                  <p className="mt-3 text-4xl font-semibold tracking-[-0.04em]">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-white/9 bg-white/[0.04] p-5">
              <p className="text-sm font-semibold">Executive summary</p>
              <p className="mt-3 text-sm leading-7 text-white/52">
                Organic acquisition weakened on local-service pages after a
                coordinated copy change. Indexing is healthy; the next decision
                is to validate intent before reverting or running a controlled test.
              </p>
            </div>
          </div>

          <div className="premium-card flex flex-col justify-between p-7 sm:p-9">
            <div>
              <p className="section-kicker">Trust by construction</p>
              <h3 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.045em]">AI explains. Evidence decides.</h3>
              <p className="mt-5 text-sm leading-7 text-[#5b6272]">
                Platform-managed inference keeps provider configuration internal while
                source citations, confidence labels and human approval keep the
                output accountable.
              </p>
            </div>
            <div className="mt-10 grid gap-3">
              {[
                [ShieldCheck, "Provider credentials stay platform-side"],
                [Link2, "Every finding links to its evidence"],
                [Gauge, "Detected, correlated and hypothesis states"],
                [Clock, "Human review before any delivery"],
              ].map(([Icon, text]) => (
                <div key={String(text)} className="flex items-center gap-3 border-t border-[#0f1223]/8 pt-3 text-sm font-medium">
                  <Icon size={17} className="text-[#4f46e5]" /> {String(text)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0e1013] px-5 py-24 text-center text-white sm:px-8 lg:px-12">
        <div className="absolute left-1/2 top-1/2 size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4f46e5]/[0.16] blur-[140px]" />
        <div className="relative mx-auto max-w-4xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a5b4fc]">The next client question</p>
          <h2 className="mt-5 text-[clamp(2.6rem,6vw,5.4rem)] font-semibold leading-[1.02] tracking-[-0.055em]">
            Answer it with evidence.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-white/50">
            Start with one Search Console property and see which changes are already hiding behind the chart.
          </p>
          <Link href="/login" className="mt-9 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#111318] shadow-[0_2px_12px_rgba(255,255,255,0.2),0_12px_40px_rgba(79,70,229,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(255,255,255,0.28),0_16px_56px_rgba(79,70,229,0.4)] active:translate-y-0">
            Open private beta <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────── */}
      <footer className="border-t border-[#0f1223]/8 px-5 py-7 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1200px] flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <BrandMark />
          <p className="text-[11px] text-[#8a90a0]">Evidence-backed SEO reporting for teams managing client trust.</p>
          <div className="flex flex-wrap gap-5 text-[11px] text-[#5b6272]">
            <Link href="/pricing" className="transition-colors hover:text-[#111318]">Pricing</Link>
            <Link href="/about" className="transition-colors hover:text-[#111318]">About</Link>
            <Link href="/privacy" className="transition-colors hover:text-[#111318]">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-[#111318]">Terms</Link>
            <Link href="/contact" className="transition-colors hover:text-[#111318]">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
