import Link from "next/link";
import { ArrowRight, Radar, Plus } from "lucide-react";
import s from "./marketing.module.css";

export function PublicHeader() {
  return (
    <header className={s.header}>
      <Link href="/" className={s.brand} aria-label="RankCues home">
        <span>
          <Radar size={23} />
        </span>
        RankCues<span className={s.beta}>BETA</span>
      </Link>
      <nav className={s.desktopNav} aria-label="Main navigation">
        <Link href="/#developers">For developers</Link>
        <Link href="/#consultants">For consultants</Link>
        <Link href="/#how-it-works">How it works</Link>
        <Link href="/resources">Resources</Link>
        <Link href="/pricing">Pricing</Link>
      </nav>
      <div className={s.navActions}>
        <Link href="/login" className={s.signIn}>
          Sign in <ArrowRight size={15} />
        </Link>
        <Link href="/#product" className={s.button}>
          Try the sample <ArrowRight size={15} />
        </Link>
        <details className={s.mobileMenu}>
          <summary aria-label="Open navigation">Menu</summary>
          <nav aria-label="Mobile navigation">
            <Link href="/#developers">For developers</Link>
            <Link href="/#consultants">For consultants</Link>
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/resources">Resources</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Sign in</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className={`${s.container} ${s.footer}`}>
      <Link href="/" className={s.brand}>
        <span>
          <Radar size={22} />
        </span>
        RankCues
      </Link>
      <p>Find the change behind every traffic drop.</p>
      <nav aria-label="Footer">
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </nav>
      <small>© {new Date().getFullYear()} RankCues</small>
    </footer>
  );
}

export function PublicFaq({
  questions,
}: {
  questions: readonly (readonly [string, string])[];
}) {
  return (
    <div className={s.faqList}>
      {questions.map(([q, a]) => (
        <details key={q}>
          <summary>
            {q}
            <Plus size={18} aria-hidden="true" />
          </summary>
          <p>{a}</p>
        </details>
      ))}
    </div>
  );
}
