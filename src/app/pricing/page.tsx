import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Search,
  BarChart3,
  Layers3,
  FileText,
  ListChecks,
  Globe2,
  Radar,
  ShieldCheck,
} from "lucide-react";
import {
  PublicHeader,
  PublicFooter,
  PublicFaq,
} from "@/components/marketing-site";
import s from "@/components/marketing.module.css";
export const metadata: Metadata = {
  title: "Pricing & Private Beta Access",
  description:
    "Explore RankCues private beta access, included SEO reporting capabilities and what you need to get started. Commercial pricing is not published yet.",
  alternates: { canonical: "/pricing" },
};
const capabilities = [
  {
    icon: Search,
    title: "Search Console performance",
    body: "Clicks, impressions, queries and pages. Start with the search data behind your client’s website.",
  },
  {
    icon: BarChart3,
    title: "GA4 context",
    body: "Map an Analytics property to add sessions and conversion context to your investigation.",
  },
  {
    icon: Layers3,
    title: "Page-change evidence",
    body: "Use snapshots to review page updates alongside movement in search performance.",
  },
  {
    icon: FileText,
    title: "AI investigation reports",
    body: "Generate a weekly draft with findings and next steps, ready for your team to review.",
  },
  {
    icon: ListChecks,
    title: "Reviewable SEO tasks",
    body: "Turn findings into follow-up work and keep the decision connected to its evidence.",
  },
  {
    icon: Globe2,
    title: "A view across your sites",
    body: "Move between connected properties and investigate the pages that need attention.",
  },
];
const questions = [
  [
    "How much does RankCues cost?",
    "Commercial prices and plan limits have not been published. RankCues is currently an invitation-only private beta, with no self-serve checkout. Review your invitation for the terms of your beta access.",
  ],
  [
    "Can I sign up today?",
    "Invited users can sign in with their approved Google account. Public self-serve registration is not available yet. Everyone can explore the fictional sample on the homepage without an account.",
  ],
  [
    "What do I need to connect my first site?",
    "Your approved Google account needs access to a verified Search Console property. Sign in, choose a website and sync its search data. GA4 mapping and page snapshots are optional additions.",
  ],
  [
    "Does the beta include white-label report delivery?",
    "White-label PDF export and automatic client email delivery are not currently offered. Generated investigation reports are drafts to review in the workspace before using their findings with a client.",
  ],
  [
    "Does connecting Google let RankCues edit my website?",
    "No. Google access is read-only. Website execution integrations and reviewed tasks are separate from connecting your reporting data.",
  ],
] as const;
export default function PricingPage() {
  return (
    <div className={s.page} lang="en">
      <a href="#main-content" className={s.skip}>
        Skip to content
      </a>
      <PublicHeader />
      <main id="main-content">
        <section className={s.pricingHero}>
          <p className={s.pill}>
            <span /> Pricing and access
          </p>
          <h1>Early access, by invitation.</h1>
          <p className={s.lead}>
            RankCues is in private beta for developers running many sites and
            for SEO consultants and small teams. Try the sample on the homepage
            now, and connect your own sites once you are invited.
          </p>
        </section>
        <section
          className={`${s.container} ${s.accessGrid}`}
          aria-label="Private beta access"
        >
          <article className={s.accessCard}>
            <div className={s.accessTop}>
              <span className={s.iconTile}>
                <Radar size={25} />
              </span>
              <span className={s.status}>
                <i /> PRIVATE BETA
              </span>
            </div>
            <p className={s.kicker}>ONE CONNECTED WORKSPACE</p>
            <h2>Early access.</h2>
            <p className={s.accessSubtitle}>
              Every site you look after, yours or your clients&apos;.
            </p>
            <div className={s.accessTerms}>
              <strong>By invitation</strong>
              <span>Commercial pricing is not published yet.</span>
            </div>
            <Link href="/login?returnTo=%2Fapp%2Fconnect" className={s.button}>
              Invited? Open your workspace <ArrowRight size={17} />
            </Link>
            <p className={s.accessNote}>
              Use the Google account approved for your beta access.
            </p>
            <ul>
              {[
                "Search Console data across connected sites",
                "Optional GA4 context and page snapshots",
                "AI reports with evidence for your review",
                "Tasks and follow-up measurement",
                "Approved fixes drafted as GitHub pull requests or WordPress drafts",
              ].map((t) => (
                <li key={t}>
                  <Check size={17} />
                  {t}
                </li>
              ))}
            </ul>
            <div className={s.accessBottom}>
              <ShieldCheck size={16} /> Read-only Google access
            </div>
          </article>
          <aside className={s.accessAside}>
            <div className={s.orbit} aria-hidden="true">
              <div />
              <div />
              <span>
                <Radar size={45} />
              </span>
              <i className={s.orbitSearch}>
                <Search size={22} />
              </i>
              <i className={s.orbitChart}>
                <BarChart3 size={22} />
              </i>
              <i className={s.orbitFile}>
                <FileText size={22} />
              </i>
              <i className={s.orbitCheck}>
                <Check size={21} />
              </i>
            </div>
            <p className={s.kicker}>BUILT FOR THE PERSON DOING THE WORK</p>
            <h2>
              More context.
              <br />
              Better next steps.
            </h2>
            <p>
              For consultants and small teams who need to explain what changed,
              decide what to check and keep client work moving.
            </p>
            <Link href="/#sample-report" className={s.secondary}>
              Explore a sample first <ArrowUpRight size={16} />
            </Link>
            <span className={s.asideNote}>
              Interactive demo · No account needed
            </span>
          </aside>
        </section>
        <section className={`${s.container} ${s.section}`}>
          <div className={s.sectionHeading}>
            <div>
              <p className={s.kicker}>INSIDE THE BETA</p>
              <h2>
                The pieces you need.
                <br />A more connected picture.
              </h2>
            </div>
            <p>
              Start with search performance.
              <br />
              Bring in the context that helps
              <br className={s.desktopBreak} /> you decide what comes next.
            </p>
          </div>
          <div className={s.capabilities}>
            {capabilities.map(({ icon: Icon, title, body }) => (
              <article key={title}>
                <span className={s.iconTile}>
                  <Icon size={22} />
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>
        <section className={s.faqBand}>
          <div className={`${s.container} ${s.faq}`}>
            <div>
              <p className={s.kicker}>THE DETAILS</p>
              <h2>
                Clear from
                <br />
                the first click.
              </h2>
              <p>
                Access, pricing and what
                <br />
                to expect in the beta.
              </p>
            </div>
            <PublicFaq questions={questions} />
          </div>
        </section>
        <section className={`${s.container} ${s.pricingClosing}`}>
          <h2>See a signal become a plan.</h2>
          <p>Get a feel for RankCues with an interactive example.</p>
          <Link href="/#sample-report" className={s.button}>
            Explore the demo <ArrowRight size={17} />
          </Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
