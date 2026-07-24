import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/rankcues-ui";

export function PublicInfoPage({ eyebrow, title, intro, children }: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f3f0e8] text-[#0a0d0c]">
      <header className="border-b border-[#0a0d0c]/10 px-5 py-5 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-5">
          <BrandMark />
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#66706a]"><ArrowLeft size={14} /> Back to RankCues</Link>
        </div>
      </header>
      <section className="px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="section-kicker">{eyebrow}</p>
            <h1 className="mt-5 font-display text-[clamp(3.2rem,6vw,6rem)] font-medium leading-[0.9] tracking-[-0.055em]">{title}</h1>
            <p className="mt-6 max-w-md text-base leading-8 text-[#66706a]">{intro}</p>
          </div>
          <article className="premium-card info-prose p-6 sm:p-9">{children}</article>
        </div>
      </section>
      <footer className="border-t border-[#0a0d0c]/10 px-5 py-7 text-xs text-[#66706a] sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1180px] flex-wrap gap-x-6 gap-y-3">
          <Link href="/about">About</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Contact</Link>
        </div>
      </footer>
    </main>
  );
}
