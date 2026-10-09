import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/rankcues-ui";
import { getCurrentSession } from "@/lib/auth-session";

export const metadata: Metadata = {
  title: "Private beta sign in",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    returnTo?: string;
    google?: string;
    signedOut?: string;
  }>;
}) {
  const [session, params] = await Promise.all([
    getCurrentSession(),
    searchParams,
  ]);
  const requested = params.returnTo || "/app/overview";
  const returnTo =
    requested.startsWith("/app") && !requested.startsWith("//")
      ? requested
      : "/app/overview";
  if (session) redirect(returnTo);
  const error =
    params.google === "not-invited"
      ? "This account is not on the beta invitation list. Use your invited Google account, or explore the public sample below."
      : params.google === "denied"
        ? "Google access was not granted. You can try again when you are ready."
        : params.google === "invalid-state"
          ? "The sign-in attempt expired. Please start again."
          : params.google === "error"
            ? "Google sign-in could not be completed. Please try again."
            : null;
  return (
    <main className="rc-login" lang="en">
      <header className="rc-login-header rc-container">
        <BrandMark />
        <Link href="/" className="rc-text-link">
          <ArrowLeft size={14} />
          Back to website
        </Link>
      </header>
      <section className="rc-login-grid rc-container">
        <div className="rc-login-intro">
          <p className="eyebrow">YOUR FIRST REPORT STARTS HERE</p>
          <h1>
            One connected site.
            <br />
            <em>A clearer next step.</em>
          </h1>
          <p>
            See what moved in search, understand what needs a closer look, and
            build a weekly report from your own data.
          </p>
          <ol className="rc-login-steps">
            <li>
              <span>01</span>Sign in with your invited Google account
            </li>
            <li>
              <span>02</span>Open a website and sync its search data
            </li>
            <li>
              <span>03</span>Generate and review your first report
            </li>
          </ol>
        </div>
        <div className="rc-login-card">
          <p className="eyebrow">
            <span className="tiny-dot" />
            INVITATION-ONLY PRIVATE BETA
          </p>
          <h2>Welcome to RankCues.</h2>
          <p>
            Use the Google account that received your beta invitation and has
            access to your Search Console properties.
          </p>
          {error ? (
            <div className="login-alert" role="alert">
              {error}
            </div>
          ) : null}
          {params.signedOut ? (
            <p role="status">You have been signed out.</p>
          ) : null}
          <Link
            href={`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`}
            className="rc-button"
          >
            Continue with Google <ArrowRight size={16} />
          </Link>
          <div className="rc-permission">
            <strong>
              <ShieldCheck size={15} />
              Read-only Google access
            </strong>
            Your account’s visible Search Console properties are imported when
            you connect. You choose which site to investigate. This connection
            cannot edit your website.
          </div>
          <p className="login-legal">
            By continuing, you agree to the <Link href="/terms">Terms</Link> and
            acknowledge the <Link href="/privacy">Privacy Notice</Link>.
          </p>
          <div className="login-alternative">
            No invitation yet? You can still see how it works.
            <Link href="/#sample-report">
              Explore the sample report <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
