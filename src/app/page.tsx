import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, GitPullRequest, Globe2, Search } from "lucide-react";
import { PublicHeader, PublicFooter, PublicFaq } from "@/components/marketing-site";
import { ReportPreview } from "@/components/report-preview";
import { RegressionDemo } from "@/components/regression-demo";
import s from "@/components/marketing.module.css";
import h from "@/components/home.module.css";

export const metadata: Metadata = {
  title: { absolute: "Find the Change Behind a Traffic Drop | RankCues" },
  description:
    "RankCues watches Search Console for every site you run, lines up traffic drops with the page edits recorded on that site, and turns the evidence into a fix you can review.",
  alternates: { canonical: "/" },
};

const questions = [
  [
    "Who is RankCues for?",
    "People who look after several websites at once: developers and indie makers running their own portfolio of sites, and SEO consultants or small teams managing client sites.",
  ],
  [
    "What do I need to get started?",
    "A private-beta invitation and access to a verified Google Search Console property. GA4, page snapshots and a GitHub or WordPress connection add context and are optional.",
  ],
  [
    "What access does connecting Google give RankCues?",
    "Read-only access to Search Console and, if you add it, GA4. Connecting Google never gives RankCues permission to edit a website.",
  ],
  [
    "Does RankCues change my code or my site?",
    "Not on its own. With GitHub connected, a fix you approve is opened as a draft pull request in your repository. With WordPress connected, it is saved as a separate draft. You review and merge or publish it yourself.",
  ],
  [
    "Can I trust the explanations?",
    "Treat them as a starting point. Each finding is labelled as observed, correlated or still to verify, and a change near a drop is never presented as proof that it caused the drop.",
  ],
  [
    "Can I try it without connecting anything?",
    "Yes. The chart at the top of this page and the sample brief below use fictional data and are open to everyone. Connecting your own sites currently needs a private-beta invitation.",
  ],
] as const;

export default function Home() {
  return (
    <div className={s.page} lang="en">
      <a href="#main-content" className={s.skip}>
        Skip to content
      </a>
      <PublicHeader />
      <main id="main-content">
        <section className={`${s.container} ${h.hero}`} id="product">
          <div>
            <h1>Find the change behind every traffic drop.</h1>
            <p className={h.lead}>
              RankCues watches Search Console for every site you run, lines up drops with the page edits
              recorded on that site, and turns what it finds into a fix you can review, ship and measure.
            </p>
            <div className={h.heroActions}>
              <Link href="#how-it-works" className={s.button}>
                See how it works <ArrowRight size={17} />
              </Link>
              <Link href="/login?returnTo=%2Fapp%2Fconnect" className={s.secondary}>
                Invited? Connect a site
              </Link>
            </div>
            <p className={h.heroNote}>Pick a marker on the chart to see what was recorded that day. Sample data.</p>
          </div>
          <RegressionDemo />
        </section>

        <section className={`${s.container} ${s.sources}`} aria-label="Data sources">
          <p>
            Built on data
            <br />
            <strong>you already have.</strong>
          </p>
          <div>
            <Search size={25} />
            <span>
              Search Console<small>Required</small>
            </span>
          </div>
          <div>
            <Globe2 size={25} />
            <span>
              Page snapshots<small>Records on-page changes</small>
            </span>
          </div>
          <div>
            <GitPullRequest size={25} />
            <span>
              GitHub or WordPress<small>Optional, for drafting fixes</small>
            </span>
          </div>
          <div>
            <BarChart3 size={25} />
            <span>
              Google Analytics 4<small>Optional conversion context</small>
            </span>
          </div>
        </section>

        <section className={h.audiences} aria-labelledby="audiences-heading">
          <div className={s.container}>
            <div className={h.sectionHead}>
              <h2 id="audiences-heading">One workspace for every site you look after.</h2>
              <p>Whether the sites are yours or your clients&apos;, the job is the same: notice what moved, find out why, and fix it before it costs you.</p>
            </div>
            <div className={h.audienceGrid}>
              <article className={h.audience} id="developers">
                <h3>For developers running many sites</h3>
                <p>You ship often and nobody checks Search Console after every deploy. RankCues does.</p>
                <ul>
                  <li>All your Search Console properties on one screen, with the sites that dropped listed first.</li>
                  <li>Page edits caught by daily snapshots, shown next to the traffic they may have affected.</li>
                  <li>Approved fixes opened as draft pull requests in your own repository.</li>
                  <li>A follow-up check after each fix, so you know whether it worked.</li>
                </ul>
                <p className={h.later}>Linking drops to Git commits and deploys is not available yet.</p>
              </article>
              <article className={h.audience} id="consultants">
                <h3>For SEO consultants and small teams</h3>
                <p>Clients ask why traffic moved. Answer with the evidence instead of a pile of charts.</p>
                <ul>
                  <li>Every client site in one portfolio, sorted by what needs attention.</li>
                  <li>Findings that keep what was observed apart from what is only suspected.</li>
                  <li>A weekly brief you review and edit before it goes to the client.</li>
                  <li>Tasks with a measurement window, so results are reported, not guessed.</li>
                </ul>
                <p className={h.later}>White-label PDFs and client logins are not available yet.</p>
              </article>
            </div>
          </div>
        </section>

        <section className={h.loop} id="how-it-works" aria-labelledby="loop-heading">
          <div className={s.container}>
            <div className={h.sectionHead}>
              <h2 id="loop-heading">From a drop to a verified fix.</h2>
              <p>Each finding moves through the same four steps, and stays attached to its evidence the whole way.</p>
            </div>
            <ol className={h.loopSteps}>
              <li>
                <h3>Notice</h3>
                <p>Daily Search Console syncs compare each site with its previous week and flag real drops, not daily noise.</p>
              </li>
              <li>
                <h3>Line it up</h3>
                <p>The drop is placed next to the page edits recorded on that site, so you start from the likely change.</p>
              </li>
              <li>
                <h3>Fix</h3>
                <p>Turn a finding into a task. With GitHub or WordPress connected, the fix is prepared as a draft for your review.</p>
              </li>
              <li>
                <h3>Verify</h3>
                <p>After the fix ships, the same pages are measured again over a set window and the outcome is recorded.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className={`${s.container} ${h.brief}`} aria-labelledby="brief-heading">
          <div className={h.sectionHead}>
            <h2 id="brief-heading">The weekly brief, ready to review.</h2>
            <p>For consultants who report to clients: changes, next actions and a client summary in one place. Switch views below. Sample data.</p>
          </div>
          <div className={h.briefDemo}>
            <ReportPreview />
          </div>
        </section>

        <section className={`${s.container} ${s.section} ${s.faq}`}>
          <div>
            <h2>Questions before you connect a site.</h2>
            <p>What RankCues can access, what it changes, and how the private beta works.</p>
            <Link href="/pricing" className={s.textLink}>
              Beta access and pricing <ArrowRight size={16} />
            </Link>
          </div>
          <PublicFaq questions={questions} />
        </section>

        <section className={`${s.container} ${s.finalCta}`}>
          <div>
            <h2>Know what changed before anyone asks.</h2>
            <p>Connect one site to see its first findings.</p>
          </div>
          <Link href="/login?returnTo=%2Fapp%2Fconnect" className={s.button}>
            Invited? Connect a site <ArrowRight size={17} />
          </Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
