import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  FileText,
  Globe2,
  Search,
  ShieldCheck,
  Activity,
  Layers3,
  MousePointer2,
} from "lucide-react";
import {
  PublicHeader,
  PublicFooter,
  PublicFaq,
} from "@/components/marketing-site";
import { ReportPreview } from "@/components/report-preview";
import s from "@/components/marketing.module.css";

export const metadata: Metadata = {
  title: { absolute: "SEO Reporting Software for Agencies | RankCues" },
  description:
    "SEO reporting for consultants and small agencies. Connect Search Console, investigate changes and turn the evidence into clear next steps. Explore the interactive demo.",
  alternates: { canonical: "/" },
};

const questions = [
  [
    "Who is RankCues built for?",
    "Independent SEO consultants and small SEO teams managing multiple client websites. It brings search performance, page changes and reviewable recommendations into one workspace.",
  ],
  [
    "What do I need for my first report?",
    "An invited RankCues account and access to a verified Google Search Console property. Sign in with your approved Google account, open a website, sync its search data and generate your first report. GA4 and page snapshots add optional context.",
  ],
  [
    "What access does Google connection give you?",
    "Google access is read-only. Signing in imports the Search Console properties visible to your Google account. Connecting Google does not grant website editing access; execution integrations and task review are separate.",
  ],
  [
    "How should I use the AI findings?",
    "Treat generated findings as a draft for your review. RankCues distinguishes observations, correlations and hypotheses. A page change near a traffic drop does not prove causation. Check the underlying evidence before sharing conclusions.",
  ],
  [
    "Can I try it without connecting my account?",
    "Yes. The interactive sample on this page is open to everyone and uses fictional data. Connecting your own websites currently requires a private-beta invitation. Public self-serve registration is not available yet.",
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
        <section className={s.hero} id="product">
          <div className={s.heroGrid} aria-hidden="true" />
          <div className={s.heroIntro}>
            <p className={s.pill}>
              <span /> SEO REPORTING FOR CONSULTANTS & SMALL AGENCIES
            </p>
            <h1>
              Your SEO data.
              <br />
              <span>Your next best move.</span>
            </h1>
            <p className={s.lead}>
              Connect Search Console. Find what needs a closer look.
              <br className={s.desktopBreak} /> Turn search data into a clear
              plan for every client.
            </p>
            <div className={s.actions}>
              <Link href="#sample-report" className={s.button}>
                Explore the live demo <ArrowRight size={17} />
              </Link>
              <Link
                href="/login?returnTo=%2Fapp%2Fconnect"
                className={s.secondary}
              >
                Connect your first site <ArrowUpRight size={17} />
              </Link>
            </div>
            <p className={s.heroNote}>
              <Check size={14} /> No account needed for the demo <span>·</span>{" "}
              Site connection is invite-only
            </p>
          </div>
          <div className={`${s.container} ${s.showcase}`}>
            <div className={s.showcaseLabel}>
              <span>
                <MousePointer2 size={14} /> A little less guesswork. Try the
                workflow below.
              </span>
              <span>INTERACTIVE PRODUCT PREVIEW</span>
            </div>
            <ReportPreview />
          </div>
        </section>
        <section
          className={`${s.container} ${s.sources}`}
          aria-label="Supported data sources"
        >
          <p>
            A clearer view starts with
            <br />
            <strong>the data you already trust.</strong>
          </p>
          <div>
            <Search size={25} />
            <span>
              Search Console<small>Your starting point</small>
            </span>
          </div>
          <div>
            <BarChart3 size={25} />
            <span>
              Google Analytics 4<small>Optional conversion context</small>
            </span>
          </div>
          <div>
            <Globe2 size={25} />
            <span>
              Page snapshots<small>Optional change history</small>
            </span>
          </div>
        </section>
        <section className={`${s.container} ${s.section}`}>
          <div className={s.sectionHeading}>
            <div>
              <p className={s.kicker}>FROM SIGNAL TO NEXT STEP</p>
              <h2>
                More clarity.
                <br />
                Across every client site.
              </h2>
            </div>
            <p>
              The numbers are a starting point.
              <br />
              Keep the evidence, the explanation and
              <br className={s.desktopBreak} /> the next action together.
            </p>
          </div>
          <div className={s.benefits}>
            <article>
              <div className={s.iconTile}>
                <Activity size={23} />
              </div>
              <h3>
                Spot the change.
                <br />
                Find your starting point.
              </h3>
              <p>
                Move from your website portfolio to the pages and queries behind
                a change in search performance.
              </p>
              <div className={s.signalVisual} aria-hidden="true">
                <span>/services</span>
                <div>
                  <i style={{ width: "82%" }} />
                </div>
                <span>−18.4%</span>
                <span>/locations</span>
                <div>
                  <i style={{ width: "55%" }} />
                </div>
                <span>−7.2%</span>
                <span>/blog</span>
                <div>
                  <i style={{ width: "32%" }} />
                </div>
                <span>−2.1%</span>
              </div>
              <Link href="/resources/seo-anomaly-detection">
                Explore SEO signals <ArrowUpRight size={16} />
              </Link>
            </article>
            <article>
              <div className={s.iconTile}>
                <Layers3 size={23} />
              </div>
              <h3>
                Check the evidence.
                <br />
                Keep the context.
              </h3>
              <p>
                Review search movement alongside page updates. Separate what
                happened from what still needs checking.
              </p>
              <div className={s.evidenceVisual}>
                <span>
                  <i /> Search Console <b>Observed</b>
                </span>
                <span>
                  <i /> Title update <b>Correlated</b>
                </span>
                <span>
                  <i /> Search intent <b>To verify</b>
                </span>
              </div>
              <Link href="/resources/seo-change-tracking">
                Follow the evidence <ArrowUpRight size={16} />
              </Link>
            </article>
            <article>
              <div className={s.iconTile}>
                <FileText size={23} />
              </div>
              <h3>
                Make the next call
                <br />a clearer conversation.
              </h3>
              <p>
                Generate a weekly brief with findings and follow-up tasks.
                Review the story before using it with your client.
              </p>
              <div className={s.briefVisual}>
                <span>YOUR WEEKLY BRIEF</span>
                <strong>What changed → What’s next</strong>
                <i />
                <i />
                <i />
              </div>
              <Link href="/features/automated-seo-reports">
                See how reporting works <ArrowUpRight size={16} />
              </Link>
            </article>
          </div>
          <p className={s.visualNote}>
            Illustrative examples. No real client results are shown.
          </p>
        </section>
        <section className={s.workflow} id="how-it-works">
          <div className={s.container}>
            <div className={s.sectionHeading}>
              <div>
                <p className={s.kicker}>A SIMPLE FIRST STEP</p>
                <h2>
                  One website.
                  <br />
                  Your first clear next move.
                </h2>
              </div>
              <p>
                Start with Search Console.
                <br />
                Add more context when you need it.
              </p>
            </div>
            <ol className={s.steps}>
              {[
                [
                  "01",
                  "Connect your Google account",
                  "Use your invited account with access to Search Console. Your available properties appear in the workspace.",
                ],
                [
                  "02",
                  "Open a site. Sync the data.",
                  "Choose a property and bring in its search performance. GA4 and page snapshots can come later.",
                ],
                [
                  "03",
                  "Generate. Review. Take action.",
                  "Read your report, check the evidence and decide what to do next. Keep the follow-up attached to the finding.",
                ],
              ].map(([n, t, p]) => (
                <li key={n}>
                  <span>{n}</span>
                  <h3>{t}</h3>
                  <p>{p}</p>
                </li>
              ))}
            </ol>
            <div className={s.workflowBottom}>
              <span>
                <ShieldCheck size={17} /> Read-only Google access. Your team
                reviews the findings.
              </span>
              <Link
                href="/login?returnTo=%2Fapp%2Fconnect"
                className={s.button}
              >
                Set up your first site <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
        <section className={`${s.container} ${s.section} ${s.faq}`}>
          <div>
            <p className={s.kicker}>GOOD QUESTIONS</p>
            <h2>
              Before your
              <br />
              first connection.
            </h2>
            <p>
              A few things to know about
              <br />
              the product and private beta.
            </p>
            <Link href="/pricing" className={s.textLink}>
              About beta access <ArrowUpRight size={16} />
            </Link>
          </div>
          <PublicFaq questions={questions} />
        </section>
        <section className={`${s.container} ${s.finalCta}`}>
          <div>
            <p className={s.kicker}>LESS GUESSWORK. A CLEARER NEXT STEP.</p>
            <h2>Make sense of the movement.</h2>
            <p>Explore a sample. See how a signal becomes a plan.</p>
          </div>
          <Link href="#sample-report" className={s.button}>
            Take a look inside <ArrowRight size={17} />
          </Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
