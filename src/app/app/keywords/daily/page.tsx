import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarSearch,
  CircleDashed,
  CircleHelp,
  Clock3,
  RotateCcw,
  Search,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/rankcues-ui";
import { EmptyData } from "@/components/rankcues-dashboard";
import { getDailySearchTermLedger } from "@/lib/daily-search-terms";
import { listGscSites } from "@/lib/data-store";
import { getLocale, pick, type AppLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type DailySearchParams = {
  site?: string;
  date?: string;
  status?: string;
  q?: string;
  page?: string;
};

const SEARCH_TERM_STATUSES = ["baseline", "new", "returning", "growing", "active", "lost"] as const;
type SearchTermStatus = (typeof SEARCH_TERM_STATUSES)[number];
type StatusFilter = SearchTermStatus | "all";

function cleanSite(value: string) {
  return value.replace(/^sc-domain:/, "").replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function cleanLandingPage(value: string | null) {
  if (!value) return "—";
  try {
    const parsed = new URL(value);
    return `${parsed.pathname}${parsed.search}` || "/";
  } catch {
    return value;
  }
}

function buildDailyUrl(params: DailySearchParams, changes: Record<string, string | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...changes })) {
    if (value && !(key === "status" && value === "all")) next.set(key, value);
  }
  const query = next.toString();
  return `/app/keywords/daily${query ? `?${query}` : ""}`;
}

function normalizeStatus(value: string): SearchTermStatus {
  return SEARCH_TERM_STATUSES.includes(value as SearchTermStatus) ? value as SearchTermStatus : "active";
}

function formatDateLabel(value: string | null | undefined, locale: AppLocale) {
  if (!value) return pick(locale, "Not available", "暂无", "No disponible");
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  const language = locale === "zh" ? "zh-CN" : locale === "es" ? "es-ES" : "en-US";
  return new Intl.DateTimeFormat(language, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

function formatSyncTime(value: Date | string | null | undefined, locale: AppLocale) {
  if (!value) return pick(locale, "Not synced", "尚未同步", "Sin sincronizar");
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const language = locale === "zh" ? "zh-CN" : locale === "es" ? "es-ES" : "en-US";
  return `${new Intl.DateTimeFormat(language, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date)} UTC`;
}

function normalizedPercent(value: number) {
  const percentage = Math.abs(value) <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, percentage));
}

function formatPercent(value: number) {
  return `${normalizedPercent(value).toFixed(1)}%`;
}

function getStatusMeta(status: SearchTermStatus, locale: AppLocale) {
  switch (status) {
    case "baseline":
      return {
        label: pick(locale, "Baseline", "基线词", "Base"),
        definition: pick(locale, "Imported from the initial history window and excluded from new-term alerts.", "来自初始历史窗口，不计入新增词提醒。", "Importada del historial inicial y excluida de alertas de términos nuevos."),
        Icon: CircleDashed,
        badge: "border-[#d9dee8] bg-[#f2f4f7] text-[#667085]",
        card: "border-[#d9dee8] bg-gradient-to-br from-white to-[#f5f7fa]",
        icon: "bg-[#e9edf2] text-[#667085]",
      };
    case "new":
      return {
        label: pick(locale, "New", "新增", "Nueva"),
        definition: pick(locale, "First-ever appearance in the stored Search Console history.", "在已保存的 Search Console 历史中首次出现。", "Primera aparición en el historial guardado de Search Console."),
        Icon: Sparkles,
        badge: "border-[#cbd2ff] bg-[#eef1ff] text-[#4659bc]",
        card: "border-[#cbd2ff] bg-gradient-to-br from-white to-[#f0f2ff]",
        icon: "bg-[#e3e7ff] text-[#5268d9]",
      };
    case "returning":
      return {
        label: pick(locale, "Returning", "再次出现", "Recurrente"),
        definition: pick(locale, "Observed again after at least seven complete data days without an impression.", "连续至少 7 个完整数据日没有展示后再次出现。", "Observada de nuevo tras al menos siete días completos sin impresiones."),
        Icon: RotateCcw,
        badge: "border-[#f1d6a4] bg-[#fff8e9] text-[#8a5b00]",
        card: "border-[#f1d6a4] bg-gradient-to-br from-white to-[#fff9ed]",
        icon: "bg-[#fff0cf] text-[#9a6700]",
      };
    case "growing":
      return {
        label: pick(locale, "Growing", "持续增长", "En crecimiento"),
        definition: pick(locale, "Current evidence crosses the growth threshold versus its previous observation.", "当前证据相较上次观测达到增长阈值。", "La evidencia actual supera el umbral de crecimiento frente a la observación anterior."),
        Icon: TrendingUp,
        badge: "border-[#b7ebdf] bg-[#eafbf6] text-[#087f6b]",
        card: "border-[#b7ebdf] bg-gradient-to-br from-white to-[#edfbf7]",
        icon: "bg-[#dff8f1] text-[#087f6b]",
      };
    case "lost":
      return {
        label: pick(locale, "Recently lost", "近期消失", "Perdida reciente"),
        definition: pick(locale, "Seen recently, then absent for 7–28 complete data days through the selected date.", "近期曾出现，但截至所选日期已连续 7–28 个完整数据日缺失。", "Vista recientemente y luego ausente durante 7–28 días completos hasta la fecha seleccionada."),
        Icon: CircleDashed,
        badge: "border-[#f5c8c2] bg-[#fff2f0] text-[#b42318]",
        card: "border-[#f5c8c2] bg-gradient-to-br from-white to-[#fff3f1]",
        icon: "bg-[#ffe6e2] text-[#b42318]",
      };
    default:
      return {
        label: pick(locale, "Active", "持续出现", "Activa"),
        definition: pick(locale, "Observed on the selected date without a stronger lifecycle signal.", "在所选日期有展示，但没有触发更强的生命周期信号。", "Observada en la fecha seleccionada sin una señal de ciclo de vida más fuerte."),
        Icon: Activity,
        badge: "border-[#c9d7ee] bg-[#eef5ff] text-[#315e9c]",
        card: "border-[#c9d7ee] bg-gradient-to-br from-white to-[#f1f6fd]",
        icon: "bg-[#e2edfb] text-[#315e9c]",
      };
  }
}

function StatusBadge({ status, locale }: { status: SearchTermStatus; locale: AppLocale }) {
  const meta = getStatusMeta(status, locale);
  const Icon = meta.Icon;
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] ${meta.badge}`}>
      <Icon size={10} /> {meta.label}
    </span>
  );
}

function StatusSummaryCard({ status, count, selected, href, locale }: { status: SearchTermStatus; count: number; selected: boolean; href: string; locale: AppLocale }) {
  const meta = getStatusMeta(status, locale);
  const Icon = meta.Icon;
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={`group relative overflow-hidden rounded-xl border p-3 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(16,24,40,0.08)] ${meta.card} ${selected ? "ring-2 ring-[#6177f2] ring-offset-2" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`flex size-8 items-center justify-center rounded-lg ${meta.icon}`}><Icon size={14} /></span>
        <span className="font-mono text-xl font-semibold tracking-[-0.05em] text-[#111827]">{count.toLocaleString()}</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold text-[#344054]">{meta.label}</p>
        <ArrowRight size={11} className="text-[#98a2b3] transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function DeltaValue({ value, inverse = false, suffix = "" }: { value: number; inverse?: boolean; suffix?: string }) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.005) return <span className="text-[#98a2b3]">—</span>;
  const positive = inverse ? value < 0 : value > 0;
  return <span className={positive ? "text-[#087f6b]" : "text-[#b42318]"}>{value > 0 ? "+" : ""}{value.toFixed(suffix ? 1 : 0)}{suffix}</span>;
}

export default async function DailySearchTermsPage({ searchParams }: { searchParams: Promise<DailySearchParams> }) {
  const rawParams = await searchParams;
  const selectedStatus = (SEARCH_TERM_STATUSES.includes(rawParams.status as SearchTermStatus) ? rawParams.status : "all") as StatusFilter;
  const requestedPage = Math.max(1, Number.parseInt(rawParams.page || "1", 10) || 1);
  const [sites, locale] = await Promise.all([listGscSites(), getLocale()]);
  const activeSites = sites.filter((item) => item.active && item.permissionLevel !== "siteUnverifiedUser");
  const selectedSite = activeSites.find((site) => site.id === rawParams.site) || activeSites[0] || null;
  const loadedLedger = selectedSite ? await getDailySearchTermLedger({
    siteId: selectedSite.id,
    date: rawParams.date || undefined,
    status: selectedStatus,
    search: rawParams.q?.trim() || undefined,
    page: requestedPage,
    pageSize: 40,
  }) : null;
  const ledger = loadedLedger || {
    siteId: selectedSite?.id || "",
    siteUrl: selectedSite?.siteUrl || "",
    dataDate: null,
    availableDates: [],
    baselineThrough: null,
    lastSyncedAt: null,
    dataComplete: false,
    rows: [],
    counts: { total: 0, baseline: 0, new: 0, returning: 0, growing: 0, active: 0, lost: 0 },
    page: 1,
    pageSize: 40,
    total: 0,
    pageCount: 0,
  };
  const counts = ledger.counts as Record<string, number>;
  const statusTotal = SEARCH_TERM_STATUSES.reduce((sum, status) => sum + Number(counts[status] || 0), 0);
  const allCount = Number(counts.total ?? (statusTotal || ledger.total));
  const hasFilters = Boolean(rawParams.site || rawParams.date || rawParams.q || (rawParams.status && rawParams.status !== "all"));
  const pageCount = Math.max(1, ledger.pageCount);
  const currentPage = Math.min(Math.max(1, ledger.page), pageCount);
  const hasDataDate = Boolean(ledger.dataDate);

  return (
    <AppShell active="/app/keywords">
      <PageHeader
        kicker={pick(locale, "Search evidence · daily ledger", "搜索证据 · 每日台账", "Evidencia de búsqueda · registro diario")}
        title={pick(locale, "Every observed search term, placed on a timeline", "把每个已观测搜索词放进时间线", "Cada término observado, situado en el tiempo")}
        body={pick(locale, "Review the latest available Search Console day, distinguish first-observed queries from returning or growing ones, and keep the landing-page evidence attached.", "查看 Search Console 最近一个可用数据日，区分首次观测、再次出现和持续增长的查询，并保留对应着陆页证据。", "Revisa el último día disponible de Search Console, distingue consultas observadas por primera vez, recurrentes o en crecimiento y conserva la evidencia de la página de destino.")}
        action={<Link href="/app/keywords" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dfe3eb] bg-white px-3.5 text-[11px] font-semibold text-[#344054] shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:border-[#c7cfdd] hover:bg-[#f8fafc]"><ArrowLeft size={13} /> {pick(locale, "Rank tracking", "返回排名追踪", "Seguimiento de posiciones")}</Link>}
      />

      <div className="grid gap-4 px-4 pb-10 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-2xl border border-white/8 bg-[#11151d] text-white shadow-[0_18px_50px_rgba(15,23,42,0.16)]">
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:38px_38px]" />
          <div className="relative grid lg:grid-cols-[minmax(0,1.25fr)_minmax(440px,1fr)]">
            <div className="border-b border-white/8 p-5 sm:p-6 lg:border-b-0 lg:border-r">
              <div className={`flex items-center gap-2 font-mono text-[8px] font-semibold uppercase tracking-[0.2em] ${!hasDataDate ? "text-white/38" : ledger.dataComplete ? "text-[#8da2ff]" : "text-[#f3c86a]"}`}>
                <span className={`size-1.5 rounded-full ${!hasDataDate ? "bg-white/35" : ledger.dataComplete ? "bg-[#7ee8d1] shadow-[0_0_0_4px_rgba(126,232,209,0.1)]" : "bg-[#f3c86a] shadow-[0_0_0_4px_rgba(243,200,106,0.1)]"}`} />
                {!hasDataDate
                  ? pick(locale, "Awaiting GSC evidence", "等待 GSC 证据", "Esperando evidencia GSC")
                  : ledger.dataComplete
                    ? pick(locale, "Complete GSC data day", "GSC 完整数据日", "Día completo de datos GSC")
                    : pick(locale, "Partial GSC data day", "GSC 部分数据日", "Día parcial de datos GSC")}
              </div>
              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/38">{pick(locale, "Data date", "数据日期", "Fecha de datos")}</p>
                  <p className="mt-1 font-mono text-[clamp(2rem,5vw,3.8rem)] font-medium leading-none tracking-[-0.07em] text-white">{ledger.dataDate?.replaceAll("-", ".") || "—"}</p>
                  <p className="mt-2 text-[10px] text-white/45">{formatDateLabel(ledger.dataDate, locale)}</p>
                </div>
                <div className="max-w-sm rounded-xl border border-white/8 bg-white/[0.045] px-4 py-3 text-[10px] leading-5 text-white/52">
                  {!hasDataDate
                    ? pick(locale, "Connect and sync a verified property to establish the first dated evidence window.", "连接并同步一个已验证的网站，即可建立首个带日期的证据窗口。", "Conecta y sincroniza una propiedad verificada para crear la primera ventana de evidencia fechada.")
                    : ledger.dataComplete
                    ? pick(locale, "This is when Google finalized the evidence—not a live view of searches performed today.", "这是 Google 已完成结算的证据日期，并非今天实时发生的搜索。", "Esta es la fecha en que Google cerró la evidencia, no una vista en vivo de las búsquedas de hoy.")
                    : pick(locale, "Collection for this date was incomplete. Absence-based lifecycle labels stay withheld until a complete sync.", "该日期的数据采集不完整；在完成一次完整同步前，基于“缺失”的生命周期标签会暂不生成。", "La recopilación de esta fecha quedó incompleta. Las etiquetas basadas en ausencias se omiten hasta una sincronización completa.")}
                </div>
              </div>
            </div>
            <dl className="relative grid grid-cols-2 divide-x divide-y divide-white/8 sm:divide-y-0 lg:grid-cols-3">
              <div className="p-4 sm:p-5">
                <dt className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-white/35"><Clock3 size={10} /> {pick(locale, "Synced at", "同步时间", "Sincronizado")}</dt>
                <dd className="mt-3 text-[10px] font-semibold leading-5 text-white/82">{formatSyncTime(ledger.lastSyncedAt, locale)}</dd>
              </div>
              <div className="p-4 sm:p-5">
                <dt className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/35">{pick(locale, "Baseline through", "基线截至", "Base hasta")}</dt>
                <dd className="mt-3 font-mono text-sm font-semibold text-white/82">{ledger.baselineThrough || "—"}</dd>
                <p className="mt-1 text-[9px] leading-4 text-white/35">{pick(locale, "Earlier terms are history", "更早词归入历史", "Los términos previos son historial")}</p>
              </div>
              <div className="col-span-2 p-4 sm:p-5 lg:col-span-1">
                <dt className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/35">{pick(locale, "Terms in evidence", "证据中的词", "Términos en evidencia")}</dt>
                <dd className="mt-2 text-3xl font-semibold tracking-[-0.05em]">{allCount.toLocaleString()}</dd>
                <p className="mt-1 text-[9px] leading-4 text-white/35">{pick(locale, "After site and query filters", "应用网站与搜索筛选后", "Tras filtros de sitio y consulta")}</p>
              </div>
            </dl>
          </div>
        </section>

        <section className="data-panel p-4 sm:p-5">
          <form method="get" className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(185px,0.7fr)_minmax(190px,0.8fr)_minmax(170px,0.65fr)_minmax(240px,1.25fr)_auto] xl:items-end">
            <label className="grid gap-1.5 text-[10px] font-semibold text-[#667085]">
              {pick(locale, "Data date", "数据日期", "Fecha de datos")}
              <select name="date" defaultValue={rawParams.date || ""} className="h-10 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[11px] text-[#111827] outline-none focus:border-[#8da2ff]">
                <option value="">{ledger.dataDate ? pick(locale, `Latest available · ${ledger.dataDate}`, `最近可用日期 · ${ledger.dataDate}`, `Última disponible · ${ledger.dataDate}`) : pick(locale, "No available dates", "暂无可用日期", "Sin fechas disponibles")}</option>
                {ledger.availableDates.map((date) => <option key={date} value={date}>{date}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-[10px] font-semibold text-[#667085]">
              {pick(locale, "Property", "网站", "Propiedad")}
              <select name="site" defaultValue={selectedSite?.id || ""} disabled={!activeSites.length} className="h-10 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[11px] text-[#111827] outline-none focus:border-[#8da2ff] disabled:cursor-not-allowed disabled:bg-[#f2f4f7] disabled:text-[#98a2b3]">
                {!activeSites.length ? <option value="">{pick(locale, "No connected properties", "暂无已连接网站", "Sin propiedades conectadas")}</option> : null}
                {activeSites.map((site) => <option key={site.id} value={site.id}>{cleanSite(site.siteUrl)}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-[10px] font-semibold text-[#667085]">
              {pick(locale, "Lifecycle status", "生命周期状态", "Estado del ciclo")}
              <select name="status" defaultValue={selectedStatus} className="h-10 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[11px] text-[#111827] outline-none focus:border-[#8da2ff]">
                <option value="all">{pick(locale, "All statuses", "所有状态", "Todos los estados")}</option>
                {SEARCH_TERM_STATUSES.map((status) => <option key={status} value={status}>{getStatusMeta(status, locale).label}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-[10px] font-semibold text-[#667085]">
              {pick(locale, "Search the ledger", "搜索台账", "Buscar en el registro")}
              <span className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#98a2b3]" />
                <input name="q" defaultValue={rawParams.q} placeholder={pick(locale, "Search term", "搜索词", "Término de búsqueda")} className="h-10 w-full rounded-lg border border-[#dfe3eb] bg-white pl-9 pr-3 text-[11px] text-[#111827] outline-none placeholder:text-[#a7afbd] focus:border-[#8da2ff]" />
              </span>
            </label>
            <div className="flex gap-2 md:col-span-2 xl:col-span-1">
              <button className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-[#111827] px-4 text-[11px] font-semibold text-white transition hover:bg-[#263244]">{pick(locale, "Apply", "应用筛选", "Aplicar")}</button>
              {hasFilters ? <Link href="/app/keywords/daily" aria-label={pick(locale, "Clear filters", "清除筛选", "Borrar filtros")} className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#dfe3eb] bg-white text-[#667085] transition hover:bg-[#f8fafc]"><X size={14} /></Link> : null}
            </div>
          </form>
        </section>

        <section aria-label={pick(locale, "Search term status summary", "搜索词状态概览", "Resumen de estados de términos")} className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
          {SEARCH_TERM_STATUSES.map((status) => (
            <StatusSummaryCard
              key={status}
              status={status}
              count={Number(counts[status] || 0)}
              selected={selectedStatus === status}
              href={buildDailyUrl(rawParams, { status, page: undefined })}
              locale={locale}
            />
          ))}
        </section>

        <section className="data-panel min-w-0 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-[#e7eaf0] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">{pick(locale, "Forensic query ledger", "搜索词取证台账", "Registro forense de consultas")}</p>
              <h2 className="mt-1 text-base font-semibold">{pick(locale, "Daily search-term evidence", "每日搜索词证据", "Evidencia diaria de términos")}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedStatus !== "all" ? <StatusBadge status={selectedStatus} locale={locale} /> : null}
              <span className="rounded-md bg-[#f2f4f7] px-2 py-1 font-mono text-[9px] text-[#667085]">{ledger.total.toLocaleString()} {pick(locale, "matching terms", "个匹配词", "términos coincidentes")}</span>
            </div>
          </div>

          {!ledger.rows.length ? (
            <div className="p-5">
              <EmptyData
                title={ledger.dataDate ? pick(locale, "No search terms match this evidence view", "没有搜索词符合当前证据视图", "Ningún término coincide con esta vista") : pick(locale, "No daily search evidence yet", "暂无每日搜索词证据", "Aún no hay evidencia diaria")}
                body={ledger.dataDate ? pick(locale, "Try another status, date, property, or search phrase. The underlying history remains unchanged.", "请尝试其他状态、日期、网站或搜索内容；底层历史数据不会被更改。", "Prueba otro estado, fecha, propiedad o texto. El historial subyacente no cambia.") : pick(locale, "Complete a Search Console sync first. RankCues will establish a history baseline before identifying terms observed for the first time in stored GSC data.", "请先完成一次 Search Console 同步。RankCues 会先建立历史基线，再识别在已存储 GSC 数据中首次观测到的词。", "Completa primero una sincronización de Search Console. RankCues establecerá una base histórica antes de identificar términos observados por primera vez en los datos guardados de GSC.")}
                action={ledger.dataDate ? <Link href="/app/keywords/daily" className="inline-flex h-9 items-center rounded-lg bg-[#111827] px-4 text-[11px] font-semibold text-white">{pick(locale, "Reset evidence view", "重置证据视图", "Restablecer vista")}</Link> : <Link href="/app/connect" className="inline-flex h-9 items-center rounded-lg bg-[#111827] px-4 text-[11px] font-semibold text-white">{pick(locale, "Manage Search Console", "管理 Search Console", "Gestionar Search Console")}</Link>}
              />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1260px] text-left text-[10px]">
                  <thead className="bg-[#f8fafc] font-mono uppercase tracking-[0.08em] text-[#8b94a5]">
                    <tr>
                      {[pick(locale, "Status", "状态", "Estado"), pick(locale, "Search term", "搜索词", "Término"), pick(locale, "Clicks", "点击", "Clics"), pick(locale, "Impressions", "展示", "Impresiones"), "CTR", pick(locale, "Avg. position", "平均排名", "Posición media"), pick(locale, "Primary landing page", "主要着陆页", "Página de destino principal"), pick(locale, "Lifecycle evidence", "生命周期证据", "Evidencia del ciclo")].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf0f5]">
                    {ledger.rows.map((row) => {
                      const status = normalizeStatus(row.status);
                      const impressionDelta = row.impressions - row.previousImpressions;
                      const clickDelta = row.clicks - row.previousClicks;
                      const positionDelta = row.position > 0 && row.previousPosition > 0 ? row.previousPosition - row.position : 0;
                      const landingShare = normalizedPercent(row.landingPageShare);
                      return (
                        <tr key={row.id} className="align-top transition hover:bg-[#fafbfc]">
                          <td className="whitespace-nowrap px-4 py-4"><StatusBadge status={status} locale={locale} /></td>
                          <td className="max-w-[280px] px-4 py-4">
                            <p className="break-words text-[11px] font-semibold leading-5 text-[#111827]">{row.query}</p>
                            <p className="mt-1 truncate text-[9px] text-[#8b94a5]" title={row.siteUrl}>{cleanSite(row.siteUrl)}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-mono text-[11px] font-semibold text-[#111827]">{row.clicks.toLocaleString()}</p>
                            <p className="mt-1 font-mono text-[8px]"><DeltaValue value={clickDelta} /></p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-mono text-[11px] font-semibold text-[#111827]">{row.impressions.toLocaleString()}</p>
                            <p className="mt-1 font-mono text-[8px]"><DeltaValue value={impressionDelta} /></p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 font-mono text-[11px] font-semibold text-[#344054]">{formatPercent(row.ctr)}</td>
                          <td className="px-4 py-4">
                            <p className="font-mono text-[11px] font-semibold text-[#111827]">{row.position > 0 ? row.position.toFixed(1) : "—"}</p>
                            <p className="mt-1 font-mono text-[8px]"><DeltaValue value={positionDelta} suffix={pick(locale, " pos", " 位", " pos")} /></p>
                          </td>
                          <td className="max-w-[310px] px-4 py-4">
                            <p className="truncate text-[10px] font-semibold text-[#344054]" title={row.landingPage || undefined}>{cleanLandingPage(row.landingPage)}</p>
                            {row.landingPage ? (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="h-1.5 w-20 overflow-hidden rounded-full bg-[#edf0f5]"><span className="block h-full rounded-full bg-[#6177f2]" style={{ width: `${landingShare}%` }} /></span>
                                <span className="whitespace-nowrap font-mono text-[8px] text-[#8b94a5]">{formatPercent(row.landingPageShare)} · {row.pageCount} {pick(locale, "pages", "个页面", "páginas")}</span>
                              </div>
                            ) : <p className="mt-1 text-[8px] text-[#98a2b3]">{pick(locale, "No landing page on this date", "该日期无着陆页", "Sin página en esta fecha")}</p>}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4">
                            <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 font-mono text-[8px]">
                              <dt className="text-[#98a2b3]">{pick(locale, "First", "首次", "Primera")}</dt><dd className="text-[#475467]">{row.firstSeenOn}</dd>
                              <dt className="text-[#98a2b3]">{pick(locale, "Previous", "上次", "Anterior")}</dt><dd className="text-[#475467]">{row.previousSeenOn || "—"}</dd>
                              <dt className="text-[#98a2b3]">{pick(locale, "Last", "最近", "Última")}</dt><dd className="text-[#475467]">{row.lastSeenOn}</dd>
                              <dt className="text-[#98a2b3]">{pick(locale, "Observed", "出现天数", "Observada")}</dt><dd className="font-semibold text-[#111827]">{row.observedDays} {pick(locale, "days", "天", "días")}</dd>
                            </dl>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-[#edf0f5] lg:hidden">
                {ledger.rows.map((row) => {
                  const status = normalizeStatus(row.status);
                  const positionDelta = row.position > 0 && row.previousPosition > 0 ? row.previousPosition - row.position : 0;
                  return (
                    <article key={row.id} className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-[12px] font-semibold leading-5 text-[#111827]">{row.query}</p>
                          <p className="mt-1 truncate text-[9px] text-[#8b94a5]">{cleanSite(row.siteUrl)}</p>
                        </div>
                        <StatusBadge status={status} locale={locale} />
                      </div>
                      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#e7eaf0] bg-[#e7eaf0] sm:grid-cols-4">
                        <div className="bg-[#fafbfc] p-3"><dt className="font-mono text-[8px] uppercase text-[#98a2b3]">{pick(locale, "Clicks", "点击", "Clics")}</dt><dd className="mt-1 font-mono text-sm font-semibold">{row.clicks.toLocaleString()} <span className="ml-1 text-[8px]"><DeltaValue value={row.clicks - row.previousClicks} /></span></dd></div>
                        <div className="bg-[#fafbfc] p-3"><dt className="font-mono text-[8px] uppercase text-[#98a2b3]">{pick(locale, "Impressions", "展示", "Impresiones")}</dt><dd className="mt-1 font-mono text-sm font-semibold">{row.impressions.toLocaleString()} <span className="ml-1 text-[8px]"><DeltaValue value={row.impressions - row.previousImpressions} /></span></dd></div>
                        <div className="bg-[#fafbfc] p-3"><dt className="font-mono text-[8px] uppercase text-[#98a2b3]">CTR</dt><dd className="mt-1 font-mono text-sm font-semibold">{formatPercent(row.ctr)}</dd></div>
                        <div className="bg-[#fafbfc] p-3"><dt className="font-mono text-[8px] uppercase text-[#98a2b3]">{pick(locale, "Position", "排名", "Posición")}</dt><dd className="mt-1 font-mono text-sm font-semibold">{row.position > 0 ? row.position.toFixed(1) : "—"} <span className="ml-1 text-[8px]"><DeltaValue value={positionDelta} suffix={pick(locale, " pos", " 位", " pos")} /></span></dd></div>
                      </dl>
                      <div className="mt-3 rounded-xl border border-[#e7eaf0] bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0"><p className="font-mono text-[8px] uppercase tracking-[0.08em] text-[#98a2b3]">{pick(locale, "Primary landing page", "主要着陆页", "Página principal")}</p><p className="mt-1 truncate text-[10px] font-semibold text-[#344054]" title={row.landingPage || undefined}>{cleanLandingPage(row.landingPage)}</p></div>
                          {row.landingPage ? <span className="shrink-0 rounded-md bg-[#eef1ff] px-2 py-1 font-mono text-[8px] font-semibold text-[#5268d9]">{formatPercent(row.landingPageShare)} · {row.pageCount} {pick(locale, "pages", "页", "pág.")}</span> : null}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[8px] text-[#8b94a5]">
                        <span>{pick(locale, "First", "首次", "Primera")} <strong className="text-[#475467]">{row.firstSeenOn}</strong></span>
                        <span>{pick(locale, "Previous", "上次", "Anterior")} <strong className="text-[#475467]">{row.previousSeenOn || "—"}</strong></span>
                        <span>{pick(locale, "Last", "最近", "Última")} <strong className="text-[#475467]">{row.lastSeenOn}</strong></span>
                        <span>{pick(locale, "Observed", "出现", "Observada")} <strong className="text-[#475467]">{row.observedDays} {pick(locale, "days", "天", "días")}</strong></span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}

          {ledger.rows.length && pageCount > 1 ? (
            <div className="flex items-center justify-between border-t border-[#e7eaf0] px-4 py-3 text-[10px] text-[#667085] sm:px-5">
              <span>{pick(locale, `Page ${currentPage} of ${pageCount}`, `第 ${currentPage} 页，共 ${pageCount} 页`, `Página ${currentPage} de ${pageCount}`)}</span>
              <div className="flex gap-2">
                <Link aria-disabled={currentPage === 1} href={buildDailyUrl(rawParams, { page: String(Math.max(1, currentPage - 1)) })} className={`rounded-lg border border-[#dfe3eb] px-3 py-2 font-semibold ${currentPage === 1 ? "pointer-events-none opacity-40" : "bg-white hover:bg-[#f8fafc]"}`}>{pick(locale, "Previous", "上一页", "Anterior")}</Link>
                <Link aria-disabled={currentPage === pageCount} href={buildDailyUrl(rawParams, { page: String(Math.min(pageCount, currentPage + 1)) })} className={`rounded-lg border border-[#dfe3eb] px-3 py-2 font-semibold ${currentPage === pageCount ? "pointer-events-none opacity-40" : "bg-white hover:bg-[#f8fafc]"}`}>{pick(locale, "Next", "下一页", "Siguiente")}</Link>
              </div>
            </div>
          ) : null}
        </section>

        <section className="data-panel overflow-hidden">
          <div className="flex items-start gap-3 border-b border-[#e7eaf0] px-5 py-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#eef1ff] text-[#5268d9]"><CircleHelp size={15} /></span>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">{pick(locale, "Reading the evidence", "如何阅读证据", "Cómo leer la evidencia")}</p>
              <h2 className="mt-1 text-sm font-semibold">{pick(locale, "Lifecycle definitions", "生命周期状态定义", "Definiciones del ciclo de vida")}</h2>
            </div>
          </div>
          <div className="grid gap-px bg-[#edf0f5] sm:grid-cols-2 2xl:grid-cols-3">
            {SEARCH_TERM_STATUSES.map((status) => {
              const meta = getStatusMeta(status, locale);
              return (
                <div key={status} className="bg-white p-4">
                  <StatusBadge status={status} locale={locale} />
                  <p className="mt-2 text-[10px] leading-5 text-[#667085]">{meta.definition}</p>
                </div>
              );
            })}
          </div>
          <div className="flex items-start gap-2 border-t border-[#e7eaf0] bg-[#fafbfc] px-5 py-3 text-[9px] leading-5 text-[#667085]">
            <CalendarSearch size={13} className="mt-1 shrink-0 text-[#5268d9]" />
            {pick(locale, "A term is labeled “new” only after the baseline closes. Changing the viewed date never rewrites first-seen or last-seen history.", "只有在基线关闭后，搜索词才会被标记为“新增”。切换查看日期不会改写首次或最近出现历史。", "Un término se marca como «nuevo» solo después de cerrar la base. Cambiar la fecha visible nunca reescribe su historial.")}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
