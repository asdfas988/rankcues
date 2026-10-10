import Image from "next/image";
import Link from "next/link";
import { cloneElement, isValidElement } from "react";
import type { ComponentType, ReactElement, ReactNode } from "react";
import { ArrowRight, CircleDot, Plus, Radar } from "lucide-react";
import { appLinkGroups, isAppLinkActive, marketingLinks } from "@/lib/rankcues-data";
import { getLocale, navLabel, pick, translateUi, type AppLocale } from "@/lib/i18n";

type IconType = ComponentType<{ size?: number; className?: string }>;

const translatedStringProps = new Set(["title", "body", "kicker", "label", "detail", "placeholder", "aria-label", "alt", "emptyLabel"]);
const translatedNodeProps = new Set(["children", "action"]);

function translateTextNode(locale: AppLocale, value: string) {
  const content = value.trim();
  if (!content) return value;
  const translated = translateUi(locale, content);
  if (translated === content) return value;
  return `${value.slice(0, value.indexOf(content))}${translated}${value.slice(value.indexOf(content) + content.length)}`;
}

function localizeNode(node: ReactNode, locale: AppLocale): ReactNode {
  if (locale === "en" || node == null || typeof node === "boolean" || typeof node === "number") return node;
  if (typeof node === "string") return translateTextNode(locale, node);
  if (Array.isArray(node)) {
    return node.map((child, index) => {
      const localizedChild = localizeNode(child, locale);
      return isValidElement(localizedChild) && localizedChild.key == null
        ? cloneElement(localizedChild, { key: `localized-${index}` })
        : localizedChild;
    });
  }
  if (!isValidElement(node)) return node;

  const element = node as ReactElement<Record<string, unknown>>;
  const nextProps: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(element.props)) {
    if (translatedStringProps.has(key) && typeof value === "string") nextProps[key] = translateUi(locale, value);
    else if (translatedNodeProps.has(key)) nextProps[key] = localizeNode(value as ReactNode, locale);
  }
  return Object.keys(nextProps).length ? cloneElement(element, nextProps) : element;
}

// `locale` is kept for call-site compatibility; the mark itself is language-neutral.
export function BrandMark({ inverse = false }: { inverse?: boolean; locale?: AppLocale }) {
  return (
    <Link href="/" className={`rc-brandmark ${inverse ? "is-inverse" : ""}`}>
      <span className="rc-brandmark-icon" aria-hidden="true"><Radar size={17} /></span>
      <span className="rc-brandmark-name">RankCues</span>
    </Link>
  );
}

export function MarketingHeader({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const light = variant === "light";
  return (
    <header className={`rc-nav ${light ? "" : "rc-nav-dark"}`}>
      <BrandMark inverse={!light} />
      <nav className="rc-nav-desktop" aria-label="Main navigation">
        {marketingLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
      </nav>
      <div className="rc-nav-actions">
        <Link href="/#sample-report">View sample</Link>
        <Link href="/login" className="rc-button">Invited? Sign in <ArrowRight size={13} /></Link>
        <details className="rc-mobile-menu"><summary aria-label="Open navigation">Menu</summary><nav aria-label="Mobile navigation">{marketingLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}<Link href="/#sample-report">Sample report</Link></nav></details>
      </div>
    </header>
  );
}

const languages = [
  ["en", "EN", "English"],
  ["zh", "中", "中文"],
  ["es", "ES", "Español"],
] as const;

export async function AppShell({
  active,
  children,
  localizeChildren = true,
  locale: providedLocale,
}: {
  active: string;
  children: ReactNode;
  localizeChildren?: boolean;
  locale?: AppLocale;
}) {
  const locale = providedLocale || await getLocale();
  const allLinks = appLinkGroups.flatMap((group) => group.links);
  const current = allLinks.find((link) => isAppLinkActive(link, active));
  return (
    <main className="rc-workspace">
      <div className="ws-frame">
        <aside className="ws-sidebar" aria-label={pick(locale, "Workspace navigation", "工作区导航", "Navegación")}>
          <div className="ws-brand"><BrandMark /></div>
          {appLinkGroups.map((group) => (
            <div key={group.en} className="ws-nav-group">
              <p>{pick(locale, group.en, group.zh, group.es)}</p>
              <nav aria-label={pick(locale, group.en, group.zh, group.es)}>
                {group.links.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link key={link.href} href={link.href} aria-current={isAppLinkActive(link, active) ? "page" : undefined} className="ws-nav-link">
                      <Icon size={17} />
                      {navLabel(locale, link.label)}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
          <div className="ws-sidebar-note">
            <span><CircleDot size={12} /> {pick(locale, "Private beta", "内测版", "Beta privada")}</span>
            <p>{pick(locale, "Only data from your connected sites is shown.", "仅显示你已连接网站的真实数据。", "Solo se muestran datos de tus sitios conectados.")}</p>
          </div>
        </aside>

        <section className="ws-main">
          <header className="ws-topbar">
            <div className="ws-mobile-brand"><BrandMark /></div>
            <p className="ws-title">{navLabel(locale, current?.label || "Overview")}</p>
            <div className="ws-topbar-actions">
              <div className="ws-lang" role="group" aria-label={pick(locale, "Interface language", "界面语言", "Idioma de la interfaz")}>
                {languages.map(([value, short, name]) => (
                  <form key={value} action="/api/preferences/locale" method="post">
                    <input type="hidden" name="locale" value={value} />
                    <button title={name} aria-pressed={locale === value}>{short}</button>
                  </form>
                ))}
              </div>
              <Link href="/app/connect" className="ws-button">
                <Plus size={15} /> {pick(locale, "Add site", "添加网站", "Añadir sitio")}
              </Link>
            </div>
          </header>
          <nav className="ws-tabs" aria-label={pick(locale, "Workspace sections", "工作区页面", "Secciones")}>
            {allLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href} aria-current={isAppLinkActive(link, active) ? "page" : undefined}>
                  <Icon size={15} />
                  {navLabel(locale, link.label)}
                </Link>
              );
            })}
          </nav>
          {localizeChildren ? localizeNode(children, locale) : children}
        </section>
      </div>
    </main>
  );
}

export function PageHeader({ kicker, title, body, action }: { kicker: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="ws-page-header">
      <div>
        <p className="ws-page-kicker">{kicker}</p>
        <h1>{title}</h1>
        <p className="ws-page-body">{body}</p>
      </div>
      {action ? <div className="ws-page-actions">{action}</div> : null}
    </div>
  );
}

export function VisualFrame({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.035] p-2 shadow-[0_36px_120px_rgba(0,0,0,0.35)]">
      <Image src={src} alt={alt} width={1400} height={788} priority={priority} fetchPriority={priority ? "high" : undefined} className="h-auto w-full rounded-[16px] bg-white" sizes="(min-width: 1024px) 58vw, 100vw" />
    </div>
  );
}

export function MetricCard({ label, value, detail, href, active = false, tone = "neutral" }: { label: string; value: string; detail: string; href?: string; active?: boolean; tone?: "neutral" | "up" | "down" }) {
  const className = `ws-metric ${href ? "is-link" : ""} ${active ? "is-active" : ""}`;
  const content = (
    <>
      <p className="ws-metric-label">{label}</p>
      <p className="ws-metric-value">{value}</p>
      <p className={`ws-metric-detail tone-${tone}`}>{detail}</p>
    </>
  );
  return href
    ? <Link href={href} scroll={false} prefetch={false} aria-current={active ? "true" : undefined} className={className}>{content}</Link>
    : <div className={className}>{content}</div>;
}

export function ActionLink({ href, children, tone = "dark" }: { href: string; children: ReactNode; tone?: "dark" | "light" | "yellow" }) {
  const className = tone === "light" ? "ws-button is-secondary" : "ws-button";
  return <Link href={href} className={className}>{children}</Link>;
}

export function SubmitAction({ action, children }: { action: string; children: ReactNode }) {
  return (
    <form action={action} method="post">
      <button type="submit" className="ws-button">{children}</button>
    </form>
  );
}

export function IconTile({ icon: Icon, title, body, href }: { icon: IconType; title: string; body: string; href: string }) {
  return (
    <Link href={href} className="data-card group block p-5">
      <span className="flex size-10 items-center justify-center rounded-xl bg-[#eef2ff] text-[#315efb]"><Icon size={18} /></span>
      <h2 className="mt-5 text-lg font-semibold tracking-[-0.025em]">{title}</h2>
      <p className="mt-2 text-[13px] leading-6 text-[#65718b]">{body}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-[#315efb]">Open <ArrowRight size={14} /></span>
    </Link>
  );
}
