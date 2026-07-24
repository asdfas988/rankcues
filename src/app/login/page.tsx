import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/rankcues-ui";
import { getCurrentSession } from "@/lib/auth-session";

export const metadata: Metadata = {
  title: "Private beta sign in",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ returnTo?: string; google?: string; signedOut?: string }>;
}) {
  const [session, params] = await Promise.all([getCurrentSession(), searchParams]);
  const requested = params.returnTo || "/app/overview";
  const returnTo = requested.startsWith("/app") && !requested.startsWith("//") ? requested : "/app/overview";
  if (session) redirect(returnTo);

  const error = params.google === "not-invited"
    ? "This Google account is not on the private-beta access list."
    : params.google === "denied"
      ? "Google access was not granted. No account data was stored."
      : params.google === "invalid-state"
        ? "The sign-in attempt expired. Please start again."
        : params.google === "error"
          ? "Google sign-in could not be completed. Please try again."
          : null;

  return (
    <main className="grain relative min-h-screen overflow-hidden bg-[#0a0d0c] px-5 py-6 text-white sm:px-8">
      <div className="luxury-grid absolute inset-0" />
      <div className="absolute left-[58%] top-[-25%] size-[700px] rounded-full bg-[#31574b]/30 blur-[150px]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1240px] flex-col">
        <header className="flex items-center justify-between border-b border-white/8 pb-5">
          <BrandMark inverse />
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-white/52 transition hover:text-white">
            <ArrowLeft size={14} /> Back to website
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="max-w-2xl">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d8bb89]">Private beta access</p>
            <h1 className="mt-6 font-display text-[clamp(3.8rem,7vw,7.2rem)] font-light leading-[0.88] tracking-[-0.06em]">
              Your search data stays <em className="text-[#d8bb89]">behind the door.</em>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-white/52">
              Sign in with the approved Google account. RankCues uses read-only access to import the Search Console and Analytics properties visible to that account.
            </p>
            <div className="mt-9 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                [ShieldCheck, "Read-only Google scopes"],
                [LockKeyhole, "Encrypted stored tokens"],
                [CheckCircle2, "No customer API keys"],
              ].map(([Icon, label]) => (
                <div key={String(label)} className="rounded-2xl border border-white/9 bg-white/[0.035] p-4 text-xs leading-5 text-white/58">
                  <Icon size={17} className="mb-3 text-[#59b8a7]" /> {String(label)}
                </div>
              ))}
            </div>
          </div>

          <div className="justify-self-stretch lg:max-w-md lg:justify-self-end">
            <div className="rounded-[24px] border border-white/11 bg-[#121915]/92 p-6 shadow-[0_36px_120px_rgba(0,0,0,0.42)] backdrop-blur sm:p-8">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/36">RankCues Cloud</p>
              <h2 className="mt-3 font-display text-4xl font-medium tracking-[-0.04em]">Continue to your workspace</h2>
              <p className="mt-3 text-sm leading-6 text-white/45">Access is limited to invited private-beta accounts.</p>
              {error ? <div role="alert" className="mt-5 rounded-xl border border-[#e87962]/25 bg-[#e87962]/10 px-4 py-3 text-xs leading-5 text-[#f3ad9e]">{error}</div> : null}
              {params.signedOut ? <div className="mt-5 rounded-xl border border-[#59b8a7]/25 bg-[#59b8a7]/10 px-4 py-3 text-xs text-[#8ed8ca]">You have been signed out.</div> : null}
              <Link href={`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`} className="mt-7 inline-flex h-12 w-full items-center justify-between rounded-xl bg-[#d8bb89] px-4 text-sm font-semibold text-[#0a0d0c] transition hover:bg-[#e7cea2]">
                Sign in with Google <ArrowRight size={16} />
              </Link>
              <p className="mt-4 text-[11px] leading-5 text-white/30">By continuing, you agree to the Terms and acknowledge the Privacy Notice.</p>
              <div className="mt-5 flex gap-4 border-t border-white/8 pt-4 text-[11px] text-white/40">
                <Link href="/privacy" className="hover:text-white">Privacy</Link>
                <Link href="/terms" className="hover:text-white">Terms</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
