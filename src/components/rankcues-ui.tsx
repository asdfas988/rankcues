import Image from "next/image";
import Link from "next/link";
import { cloneElement, isValidElement } from "react";
import type { ComponentType, ReactElement, ReactNode } from "react";
import { ArrowRight, CircleDot, Plus, Radar } from "lucide-react";
import { appLinks, marketingLinks } from "@/lib/rankcues-data";
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
  if (Array.isArray(node)) return node.map((child) => localizeNode(child, locale));
  if (!isValidElement(node)) return node;

  const element = node as ReactElement<Record<string, unknown>>;
  const nextProps: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(element.props)) {
    if (translatedStringProps.has(key) && typeof value === "string") nextProps[key] = translateUi(locale, value);
    else if (translatedNodeProps.has(key)) nextProps[key] = localizeNode(value as ReactNode, locale);
  }
  return Object.keys(nextProps).length ? cloneElement(element, nextProps) : element;
}

export function BrandMark({ inverse = false, locale = "en" }: { inverse?: boolean; locale?: AppLocale }) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-3 ${inverse ? "text-white" : "text-[#111827]"}`}
    >
      <span className={`relative flex size-9 items-center justify-center overflow-hidden rounded-lg border shadow-[0_2px_8px_rgba(0,0,0,0.18)] ${inverse ? "border-white/12 bg-white/[0.08] text-white" : "border-[#111318] bg-[#111318] text-white"}`}>
        <Radar size={18} />
        <span className="absolute inset-x-2 bottom-1.5 h-px bg-current opacity-50" />
      </span>
      <span>
        <span className="block text-[15px] font-semibold tracking-[-0.035em]">RankCues</span>
        <span className={`block font-mono text-[8px] uppercase tracking-[0.16em] ${inverse ? "text-white/32" : "text-[#8b94a5]"}`}>
          {pick(locale, "Search intelligence", "搜索情报", "Inteligencia SEO")}
        </span>
      </span>
    </Link>
  );
}

export function MarketingHeader({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const light = variant === "light";
  return (
    <header className={`relative z-20 mx-auto flex max-w-[1440px] items-center justify-between gap-6 border-b px-5 py-5 backdrop-blur-xl sm:px-8 lg:px-12 ${light ? "border-[#0f1223]/8 bg-white/80" : "border-white/6 bg-[#0b1220]/92"}`}>
      <BrandMark inverse={!light} />
      <nav className={`hidden items-center gap-7 text-[13px] font-medium lg:flex ${light ? "text-[#5b6272]" : "text-white/58"}`}>
        {marketingLinks.map((link) => (
          <Link key={link.href} href={link.href} className={`relative py-1 transition-colors duration-300 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:transition-transform after:duration-300 hover:after:scale-x-100 ${light ? "after:bg-[#4f46e5] hover:text-[#111318]" : "after:bg-[#d8bb89] hover:text-white"}`}>
            {link.label}
          </Link>
        ))}
      </nav>
      <Link href="/login" className={light
        ? "inline-flex h-10 items-center gap-2 rounded-lg bg-[#111318] px-4 text-xs font-semibold text-white shadow-[0_1px_2px_rgba(15,18,35,0.18),0_4px_14px_rgba(15,18,35,0.12)] transition-all duration-300 hover:bg-[#23262e] hover:shadow-[0_2px_4px_rgba(15,18,35,0.18),0_8px_24px_rgba(15,18,35,0.18)]"
        : "inline-flex h-10 items-center gap-2 rounded-lg border border-white/12 bg-white/[0.07] px-4 text-xs font-semibold text-white transition-all duration-300 hover:border-white/24 hover:bg-white/[0.12] hover:shadow-[0_0_24px_rgba(216,187,137,0.15)]"}>
        Private beta <ArrowRight size={14} />
      </Link>
    </header>
  );
}

export async function AppShell({ active, children }: { active: string; children: ReactNode }) {
  const locale = await getLocale();
  return (
    <main className="min-h-screen bg-[#f4f6fa] text-[#111827]">
      <div className="grid min-h-screen min-w-0 grid-cols-[minmax(0,1fr)] lg:grid-cols-[224px_minmax(0,1fr)]">
        <aside className="relative z-20 min-w-0 overflow-hidden border-b border-white/8 bg-[#0e0f13] px-3 py-3 text-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0">
          <div className="px-2 py-2.5"><BrandMark inverse locale={locale} /></div>
          <p className="mt-7 hidden px-3 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-white/26 lg:block">{pick(locale, "Workspace", "工作区", "Espacio")}</p>
          <nav className="mt-3 flex gap-1 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
            {appLinks.map((link) => {
              const Icon = link.icon;
              const selected = active === link.href || active.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex h-10 shrink-0 items-center gap-3 rounded-lg px-3 text-[12px] transition-all duration-200 ${selected ? "bg-gradient-to-r from-white/[0.11] to-white/[0.05] font-semibold text-white shadow-[inset_2px_0_0_#6366f1]" : "text-white/48 hover:bg-white/[0.05] hover:text-white/90"}`}
                >
                  <Icon size={15} />
                  {navLabel(locale, link.label)}
                </Link>
              );
            })}
          </nav>
          <div className="mt-6 hidden rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-3 shadow-[0_2px_12px_rgba(0,0,0,0.2)] lg:block">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-white/74">
              <CircleDot size={13} className="text-[#39d6ba]" /> {pick(locale, "Production workspace", "生产工作区", "Espacio de producción")}
            </div>
            <p className="mt-1.5 text-[10px] leading-4 text-white/34">{pick(locale, "Only connected data is shown.", "仅显示已接入的真实数据。", "Solo se muestran datos conectados.")}</p>
          </div>
        </aside>

        <section className="min-w-0 max-w-full">
          <div className="sticky top-0 z-10 border-b border-[#dfe3eb] bg-white/88 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold text-[#111827]">RankCues Cloud</p>
                <p className="mt-0.5 text-[9px] text-[#8b94a5]">{pick(locale, "Search intelligence workspace", "搜索情报工作区", "Espacio de inteligencia SEO")}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="hidden items-center rounded-lg border border-[#e3e7ef] bg-white p-0.5 md:flex" aria-label={pick(locale, "Interface language", "界面语言", "Idioma de la interfaz")}>
                  {(["en", "zh", "es"] as const).map((value) => (
                    <form key={value} action="/api/preferences/locale" method="post">
                      <input type="hidden" name="locale" value={value} />
                      <button title={value === "en" ? "English" : value === "zh" ? "中文" : "Español"} className={`rounded-md px-2 py-1.5 font-mono text-[8px] font-semibold uppercase transition ${locale === value ? "bg-[#111827] text-white" : "text-[#667085] hover:bg-[#f2f4f7]"}`}>{value === "zh" ? "中" : value.toUpperCase()}</button>
                    </form>
                  ))}
                </div>
                <span className="hidden items-center gap-2 rounded-lg border border-[#e3e7ef] bg-[#f8fafc] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.08em] text-[#667085] sm:inline-flex">
                  <span className="status-dot size-1.5 rounded-full bg-[#39d6ba]" /> {pick(locale, "Live data", "实时数据", "Datos activos")}
                </span>
                <Link href="/app/connect" className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#111827] px-3.5 text-[11px] font-semibold text-white shadow-[0_1px_2px_rgba(16,24,40,0.2),0_4px_12px_rgba(16,24,40,0.12)] transition-all duration-200 hover:bg-[#1f2937] hover:shadow-[0_2px_4px_rgba(16,24,40,0.2),0_8px_20px_rgba(16,24,40,0.16)] active:scale-[0.98]">
                  <Plus size={14} /> {pick(locale, "Add property", "添加网站", "Añadir sitio")}
                </Link>
              </div>
            </div>
          </div>
          {localizeNode(children, locale)}
        </section>
      </div>
    </main>
  );
}

export function PageHeader({ kicker, title, body, action }: { kicker: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-5 px-4 pb-5 pt-7 sm:px-6 lg:flex-row lg:items-end lg:px-8 lg:pt-8">
      <div>
        <p className="section-kicker">{kicker}</p>
        <h1 className="mt-2 max-w-4xl text-[clamp(1.8rem,3vw,2.65rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-[#111827]">{title}</h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[#667085]">{body}</p>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
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

export function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="data-card group relative overflow-hidden p-4">
      <span className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-gradient-to-r from-[#6177f2] to-[#8da2ff] transition-transform duration-300 group-hover:scale-x-100" />
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#8b94a5]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#111827]">{value}</p>
      <p className="mt-1 text-[10px] text-[#8b94a5]">{detail}</p>
    </div>
  );
}

export function ActionLink({ href, children, tone = "dark" }: { href: string; children: ReactNode; tone?: "dark" | "light" | "yellow" }) {
  const className = tone === "dark"
    ? "bg-[#111827] text-white shadow-[0_1px_2px_rgba(16,24,40,0.2)] hover:bg-[#1f2937] hover:shadow-[0_4px_12px_rgba(16,24,40,0.2)]"
    : tone === "yellow"
      ? "bg-[#4f46e5] text-white shadow-[0_1px_2px_rgba(79,70,229,0.35)] hover:bg-[#4338ca] hover:shadow-[0_4px_14px_rgba(79,70,229,0.4)]"
      : "border border-[#dfe3eb] bg-white text-[#344054] shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:border-[#c7cfdd] hover:bg-[#f8fafc]";
  return <Link href={href} className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-[11px] font-semibold transition-all duration-200 active:scale-[0.98] ${className}`}>{children}</Link>;
}

export function SubmitAction({ action, children }: { action: string; children: ReactNode }) {
  return (
    <form action={action} method="post">
      <button type="submit" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#111827] px-3.5 text-[11px] font-semibold text-white shadow-[0_1px_2px_rgba(16,24,40,0.2)] transition-all duration-200 hover:bg-[#1f2937] hover:shadow-[0_4px_12px_rgba(16,24,40,0.2)] active:scale-[0.98]">{children}</button>
    </form>
  );
}

export function IconTile({ icon: Icon, title, body, href }: { icon: IconType; title: string; body: string; href: string }) {
  return (
    <Link href={href} className="data-card group block p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[#bac5f8]">
      <span className="flex size-10 items-center justify-center rounded-xl bg-[#eef1ff] text-[#5268d9] transition-colors duration-300 group-hover:bg-[#5268d9] group-hover:text-white"><Icon size={18} /></span>
      <h2 className="mt-5 text-lg font-semibold tracking-[-0.025em]">{title}</h2>
      <p className="mt-2 text-[12px] leading-6 text-[#667085]">{body}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-[11px] font-semibold">Explore <ArrowRight size={13} className="transition group-hover:translate-x-1" /></span>
    </Link>
  );
}
