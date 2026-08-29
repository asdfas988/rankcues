import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, BarChart3, CalendarSearch, Crosshair, Search, X } from "lucide-react";
import { AppShell, MetricCard, PageHeader } from "@/components/rankcues-ui";
import { EmptyData } from "@/components/rankcues-dashboard";
import { KeywordTrackingForm, KeywordTrackingToggle } from "@/components/keyword-tracking-controls";
import { getKeywordRankHistory, getKeywordRankings, listGscSites } from "@/lib/data-store";
import { getLocale, pick } from "@/lib/i18n";
import { parseKeywordRankingSort, parseSortDirection, sortKeywordRankings, type KeywordRankingSort } from "@/lib/keyword-ranking";

export const dynamic = "force-dynamic";

type KeywordSearchParams = {
  site?: string;
  q?: string;
  device?: string;
  scope?: string;
  keyword?: string;
  keywordSite?: string;
  days?: string;
  tracked?: string;
  page?: string;
  sort?: string;
  order?: string;
};

function buildUrl(params: KeywordSearchParams, changes: Record<string, string | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...changes })) {
    if (value) next.set(key, value);
  }
  const query = next.toString();
  return `/app/keywords${query ? `?${query}` : ""}`;
}

function cleanSite(value: string) {
  return value.replace(/^sc-domain:/, "").replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function RankHistoryChart({
  values,
  label,
  emptyLabel,
}: {
  values: Array<{ date: string; position: number }>;
  label: string;
  emptyLabel: string;
}) {
  const observed = values.filter((value) => value.position > 0);
  if (!observed.length) {
    return <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-[#d9dee8] bg-[#fafbfc] text-[11px] text-[#8b94a5]">{emptyLabel}</div>;
  }
  const positions = observed.map((value) => value.position);
  const minimum = Math.max(1, Math.floor(Math.min(...positions) - 1));
  const maximum = Math.max(minimum + 1, Math.ceil(Math.max(...positions) + 1));
  const width = 720;
  const height = 220;
  const left = 42;
  const right = 18;
  const top = 22;
  const bottom = 34;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const points = observed.map((value, index) => {
    const x = left + (index / Math.max(observed.length - 1, 1)) * plotWidth;
    const y = top + ((value.position - minimum) / (maximum - minimum)) * plotHeight;
    return { ...value, x, y };
  });
  const path = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");

  return (
    <div className="overflow-hidden rounded-xl border border-[#e3e7ef] bg-[#fbfcfe] p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full" role="img" aria-label={label}>
        {[0, 0.5, 1].map((ratio) => {
          const y = top + ratio * plotHeight;
          const rank = minimum + ratio * (maximum - minimum);
          return (
            <g key={ratio}>
              <line x1={left} y1={y} x2={width - right} y2={y} stroke="#e7eaf0" strokeDasharray="4 5" />
              <text x={left - 8} y={y + 3} textAnchor="end" fill="#8b94a5" fontSize="9">{rank.toFixed(0)}</text>
            </g>
          );
        })}
        <polyline points={path} fill="none" stroke="#5268d9" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((point) => <circle key={point.date} cx={point.x} cy={point.y} r="3" fill="#ffffff" stroke="#5268d9" strokeWidth="2" />)}
        <text x={left} y={height - 9} fill="#8b94a5" fontSize="9">{observed[0].date.slice(5)}</text>
        <text x={width - right} y={height - 9} textAnchor="end" fill="#8b94a5" fontSize="9">{observed.at(-1)?.date.slice(5)}</text>
      </svg>
    </div>
  );
}

function SortableHeader({
  field,
  label,
  params,
  activeField,
  direction,
}: {
  field: KeywordRankingSort;
  label: string;
  params: KeywordSearchParams;
  activeField: KeywordRankingSort | null;
  direction: "asc" | "desc";
}) {
  const active = activeField === field;
  const nextDirection = active ? (direction === "asc" ? "desc" : "asc") : (field === "position" ? "asc" : "desc");
  return (
    <th className="px-4 py-3 font-medium" aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}>
      <Link
        href={buildUrl(params, { sort: field, order: nextDirection, page: undefined })}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap transition hover:text-[#344054] ${active ? "text-[#344054]" : ""}`}
        title={label}
      >
        {label}
        {active ? (direction === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <span className="flex flex-col text-[#c0c6d0]" aria-hidden="true"><ArrowUp size={8} /><ArrowDown size={8} className="-mt-0.5" /></span>}
      </Link>
    </th>
  );
}

export default async function KeywordsPage({ searchParams }: { searchParams: Promise<KeywordSearchParams> }) {
  const rawParams = await searchParams;
  const device = (["DESKTOP", "MOBILE", "TABLET"].includes(rawParams.device || "") ? rawParams.device : "ALL") as "ALL" | "DESKTOP" | "MOBILE" | "TABLET";
  const trackedOnly = rawParams.scope === "tracked";
  const days = [28, 60, 90].includes(Number(rawParams.days)) ? Number(rawParams.days) : 28;
  const sortField = parseKeywordRankingSort(rawParams.sort);
  const sortDirection = parseSortDirection(rawParams.order, sortField);
  const [allSites, rows, locale] = await Promise.all([
    listGscSites(),
    getKeywordRankings({ siteId: rawParams.site, search: rawParams.q, device, trackedOnly }),
    getLocale(),
  ]);
  const sites = allSites.filter((item) => item.active && item.permissionLevel !== "siteUnverifiedUser");
  const sortedRows = sortKeywordRankings(rows, sortField, sortDirection);
  const trackedCount = rows.filter((row) => row.tracked).length;
  const observedCount = rows.filter((row) => row.impressions > 0).length;
  const topTen = rows.filter((row) => row.position > 0 && row.position <= 10).length;
  const moving = rows.filter((row) => row.previousPosition > 0 && Math.abs(row.previousPosition - row.position) >= 2).length;
  const pageSize = 50;
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(Math.max(1, Number.parseInt(rawParams.page || "1", 10) || 1), pageCount);
  const pageRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedRow = rawParams.keyword && rawParams.keywordSite
    ? rows.find((row) => row.siteId === rawParams.keywordSite && row.keyword === rawParams.keyword)
    : undefined;
  const history = selectedRow
    ? await getKeywordRankHistory({ siteId: selectedRow.siteId, keyword: selectedRow.keyword, device, days })
    : [];
  const defaultSiteId = rawParams.site || sites[0]?.id || "";

  return (
    <AppShell active="/app/keywords" locale={locale} localizeChildren={false}>
      <PageHeader
        kicker={pick(locale, "Rank tracking", "排名追踪", "Seguimiento de posiciones")}
        title={pick(locale, "Know exactly which queries are moving", "准确掌握每个关键词的排名变化", "Conoce exactamente qué consultas están cambiando")}
        body={pick(locale, "Track the queries that matter, compare equal seven-day windows, and inspect daily Google Search Console ranking history by device.", "追踪重要关键词，对比相同的 7 天窗口，并按设备查看 Google Search Console 每日平均排名历史。", "Sigue las consultas importantes, compara ventanas iguales de siete días y revisa el historial diario de posición media de Google Search Console por dispositivo.")}
        action={<Link href="/app/keywords/daily" className="group inline-flex h-10 items-center gap-2 rounded-lg bg-[#111827] px-4 text-[11px] font-semibold text-white shadow-[0_1px_2px_rgba(16,24,40,0.2),0_6px_18px_rgba(16,24,40,0.14)] transition hover:bg-[#263244]"><CalendarSearch size={14} /> {pick(locale, "Daily search-term ledger", "每日搜索词台账", "Registro diario de términos")} <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" /></Link>}
      />

      <div className="grid gap-4 px-4 pb-10 sm:px-6 lg:px-8">
        <section className="data-panel p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <KeywordTrackingForm
              sites={sites.map((site) => ({ id: site.id, label: cleanSite(site.siteUrl) }))}
              defaultSiteId={defaultSiteId}
              defaultDevice={device}
              labels={{
                property: pick(locale, "Property", "网站", "Propiedad"),
                keyword: pick(locale, "Keyword to track", "要追踪的关键词", "Palabra clave para seguir"),
                device: pick(locale, "Device", "设备", "Dispositivo"),
                allDevices: pick(locale, "All devices", "所有设备", "Todos"),
                desktop: pick(locale, "Desktop", "桌面设备", "Escritorio"),
                mobile: pick(locale, "Mobile", "移动设备", "Móvil"),
                tablet: pick(locale, "Tablet", "平板设备", "Tableta"),
                placeholder: pick(locale, "e.g. technical SEO monitoring", "例如：技术 SEO 监控", "p. ej. monitoreo SEO técnico"),
                submit: pick(locale, "Track keyword", "开始追踪", "Seguir palabra"),
                submitting: pick(locale, "Adding...", "正在添加...", "Añadiendo..."),
                success: pick(locale, "{keyword} is now tracked.", "已开始监控“{keyword}”。", "Ahora se sigue {keyword}."),
                failed: pick(locale, "Could not update keyword tracking.", "无法更新关键词监控。", "No se pudo actualizar el seguimiento."),
              }}
            />
          </div>
          <p className="mt-3 text-[10px] leading-5 text-[#8b94a5]">
            {pick(locale, "Rankings are Google Search Console average positions, not simulated live SERP positions. New keywords appear after Google records impressions.", "排名来自 Google Search Console 的平均排名，并非模拟的实时搜索结果位置。新关键词会在 Google 记录到展示后出现数据。", "Las posiciones son promedios de Google Search Console, no resultados SERP simulados en vivo. Las palabras nuevas muestran datos cuando Google registra impresiones.")}
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={pick(locale, "Tracked", "已追踪", "Seguidas")} value={trackedCount.toLocaleString()} detail={pick(locale, "Manually monitored queries", "手动监控的关键词", "Consultas supervisadas manualmente")} />
          <MetricCard label={pick(locale, "Observed", "已有数据", "Observadas")} value={observedCount.toLocaleString()} detail={pick(locale, "Queries with GSC impressions", "GSC 已产生展示的关键词", "Consultas con impresiones en GSC")} />
          <MetricCard label={pick(locale, "Top 10", "前 10 名", "Top 10")} value={topTen.toLocaleString()} detail={pick(locale, "Current seven-day average", "当前 7 天平均排名", "Promedio actual de siete días")} />
          <MetricCard label={pick(locale, "Material movers", "明显波动", "Cambios relevantes")} value={moving.toLocaleString()} detail={pick(locale, "Moved at least 2 positions", "至少变化 2 个名次", "Cambio mínimo de 2 posiciones")} />
        </section>

        <section className="data-panel p-4 sm:p-5">
          <form method="get" className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(160px,0.55fr)_140px_150px_auto]">
            {sortField ? <><input type="hidden" name="sort" value={sortField} /><input type="hidden" name="order" value={sortDirection} /></> : null}
            <label className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#98a2b3]" />
              <input name="q" defaultValue={rawParams.q} placeholder={pick(locale, "Search keywords", "搜索关键词", "Buscar palabras clave")} className="h-10 w-full rounded-lg border border-[#dfe3eb] bg-white pl-9 pr-3 text-[11px] outline-none focus:border-[#8da2ff]" />
            </label>
            <select name="site" defaultValue={rawParams.site || ""} aria-label={pick(locale, "Filter by property", "按网站筛选", "Filtrar por propiedad")} className="h-10 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[11px] outline-none focus:border-[#8da2ff]">
              <option value="">{pick(locale, "All properties", "所有网站", "Todas las propiedades")}</option>
              {sites.map((site) => <option key={site.id} value={site.id}>{cleanSite(site.siteUrl)}</option>)}
            </select>
            <select name="device" defaultValue={device} aria-label={pick(locale, "Filter by device", "按设备筛选", "Filtrar por dispositivo")} className="h-10 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[11px] outline-none focus:border-[#8da2ff]">
              <option value="ALL">{pick(locale, "All devices", "所有设备", "Todos")}</option>
              <option value="DESKTOP">{pick(locale, "Desktop", "桌面设备", "Escritorio")}</option>
              <option value="MOBILE">{pick(locale, "Mobile", "移动设备", "Móvil")}</option>
              <option value="TABLET">{pick(locale, "Tablet", "平板设备", "Tableta")}</option>
            </select>
            <select name="scope" defaultValue={rawParams.scope || "all"} aria-label={pick(locale, "Tracking scope", "追踪范围", "Alcance del seguimiento")} className="h-10 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[11px] outline-none focus:border-[#8da2ff]">
              <option value="all">{pick(locale, "All discovered", "所有已发现关键词", "Todas las descubiertas")}</option>
              <option value="tracked">{pick(locale, "Tracked only", "仅已追踪", "Solo seguidas")}</option>
            </select>
            <div className="flex gap-2">
              <button className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-[#111827] px-4 text-[11px] font-semibold text-white">{pick(locale, "Apply filters", "应用筛选", "Aplicar filtros")}</button>
              {(rawParams.q || rawParams.site || rawParams.device || rawParams.scope) ? <Link href="/app/keywords" aria-label={pick(locale, "Clear filters", "清除筛选", "Borrar filtros")} className="inline-flex size-10 items-center justify-center rounded-lg border border-[#dfe3eb] bg-white text-[#667085]"><X size={14} /></Link> : null}
            </div>
          </form>
        </section>

        <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,0.72fr)]">
          <section className="data-panel min-w-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e7eaf0] px-5 py-4">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">{pick(locale, "Comparable seven-day windows", "可比的 7 天窗口", "Ventanas comparables de siete días")}</p>
                <h2 className="mt-1 text-base font-semibold">{pick(locale, "Keyword ranking ledger", "关键词排名明细", "Registro de posiciones")}</h2>
              </div>
              <span className="rounded-md bg-[#f2f4f7] px-2 py-1 font-mono text-[9px] text-[#667085]">{rows.length.toLocaleString()} {pick(locale, "rows", "条", "filas")}</span>
            </div>
            {!rows.length ? (
              <div className="p-5">
                <EmptyData
                  title={pick(locale, "No keyword rankings match these filters", "没有符合筛选条件的关键词排名", "Ninguna posición coincide con estos filtros")}
                  body={pick(locale, "Sync a verified Search Console property or add a keyword above. Tracked keywords remain visible while RankCues waits for Google data.", "请同步已验证的 Search Console 网站，或在上方添加关键词。等待 Google 数据期间，已追踪关键词仍会保留显示。", "Sincroniza una propiedad verificada de Search Console o añade una palabra arriba. Las palabras seguidas permanecen visibles mientras RankCues espera datos de Google.")}
                  action={<Link href="/app/connect" className="inline-flex h-9 items-center rounded-lg bg-[#111827] px-4 text-[11px] font-semibold text-white">{pick(locale, "Manage properties", "管理网站", "Gestionar propiedades")}</Link>}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-[10px]">
                  <thead className="bg-[#f8fafc] font-mono uppercase tracking-[0.08em] text-[#8b94a5]">
                    <tr>
                      <th className="w-12 px-3 py-3 font-medium"><span className="sr-only">{pick(locale, "Tracking", "追踪", "Seguimiento")}</span></th>
                      <th className="px-4 py-3 font-medium">{pick(locale, "Keyword", "关键词", "Palabra clave")}</th>
                      <th className="px-4 py-3 font-medium">{pick(locale, "Property", "网站", "Propiedad")}</th>
                      <SortableHeader field="position" label={pick(locale, "GSC position", "GSC 排名", "Posición GSC")} params={rawParams} activeField={sortField} direction={sortDirection} />
                      <th className="px-4 py-3 font-medium">{pick(locale, "7-day movement", "7 天变化", "Cambio en 7 días")}</th>
                      <SortableHeader field="impressions" label={pick(locale, "Impressions", "展示", "Impresiones")} params={rawParams} activeField={sortField} direction={sortDirection} />
                      <SortableHeader field="clicks" label={pick(locale, "Clicks", "点击", "Clics")} params={rawParams} activeField={sortField} direction={sortDirection} />
                      <th className="px-4 py-3 font-medium">{pick(locale, "Best landing page", "最佳着陆页", "Mejor página de destino")}</th>
                      <th className="px-4 py-3 font-medium">{pick(locale, "Data through", "数据截至", "Datos hasta")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf0f5]">
                    {pageRows.map((row) => {
                      const movement = row.previousPosition > 0 && row.position > 0 ? row.previousPosition - row.position : 0;
                      const detailUrl = buildUrl(rawParams, { keyword: row.keyword, keywordSite: row.siteId });
                      const isSelected = selectedRow?.siteId === row.siteId && selectedRow.keyword === row.keyword;
                      return (
                        <tr key={row.id} className={isSelected ? "bg-[#f5f7ff]" : "hover:bg-[#fafbfc]"}>
                          <td className="px-3 py-3">
                            <KeywordTrackingToggle
                              siteId={row.siteId}
                              keyword={row.keyword}
                              device={row.trackedDevice || device}
                              initialTracked={row.tracked}
                              initialTrackedId={row.trackedId}
                              trackLabel={pick(locale, "Track keyword", "追踪关键词", "Seguir palabra")}
                              untrackLabel={pick(locale, "Stop tracking", "停止追踪", "Dejar de seguir")}
                              failedLabel={pick(locale, "Could not update keyword tracking.", "无法更新关键词监控。", "No se pudo actualizar el seguimiento.")}
                            />
                          </td>
                          <td className="max-w-[270px] px-4 py-3"><Link href={detailUrl} className="block truncate text-[11px] font-semibold text-[#111827] hover:text-[#5268d9]">{row.keyword}</Link></td>
                          <td className="max-w-[170px] truncate px-4 py-3 text-[#667085]">{cleanSite(row.siteUrl)}</td>
                          <td className="px-4 py-3 font-mono text-[11px] font-semibold text-[#111827]">{row.position > 0 ? row.position.toFixed(1) : <span className="font-sans text-[9px] font-medium text-[#98a2b3]">{pick(locale, "Waiting for GSC", "等待 GSC 数据", "Esperando GSC")}</span>}</td>
                          <td className={`px-4 py-3 font-mono font-semibold ${movement > 0 ? "text-[#087f6b]" : movement < 0 ? "text-[#b42318]" : "text-[#98a2b3]"}`}>
                            <span className="inline-flex items-center gap-1">{movement > 0 ? <ArrowUp size={11} /> : movement < 0 ? <ArrowDown size={11} /> : null}{movement ? `${movement > 0 ? "+" : ""}${movement.toFixed(1)}` : "—"}</span>
                          </td>
                          <td className="px-4 py-3 font-mono">{row.impressions.toLocaleString()}</td>
                          <td className="px-4 py-3 font-mono">{row.clicks.toLocaleString()}</td>
                          <td className="max-w-[260px] truncate px-4 py-3 text-[#667085]" title={row.page}>{row.page || "—"}</td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-[#667085]">{row.dataThrough || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {pageCount > 1 ? (
              <div className="flex items-center justify-between border-t border-[#e7eaf0] px-5 py-3 text-[10px] text-[#667085]">
                <span>{pick(locale, `Page ${currentPage} of ${pageCount}`, `第 ${currentPage} 页，共 ${pageCount} 页`, `Página ${currentPage} de ${pageCount}`)}</span>
                <div className="flex gap-2">
                  <Link aria-disabled={currentPage === 1} href={buildUrl(rawParams, { page: String(Math.max(1, currentPage - 1)), keyword: undefined, keywordSite: undefined })} className={`rounded-lg border border-[#dfe3eb] px-3 py-2 font-semibold ${currentPage === 1 ? "pointer-events-none opacity-40" : "bg-white hover:bg-[#f8fafc]"}`}>{pick(locale, "Previous", "上一页", "Anterior")}</Link>
                  <Link aria-disabled={currentPage === pageCount} href={buildUrl(rawParams, { page: String(Math.min(pageCount, currentPage + 1)), keyword: undefined, keywordSite: undefined })} className={`rounded-lg border border-[#dfe3eb] px-3 py-2 font-semibold ${currentPage === pageCount ? "pointer-events-none opacity-40" : "bg-white hover:bg-[#f8fafc]"}`}>{pick(locale, "Next", "下一页", "Siguiente")}</Link>
                </div>
              </div>
            ) : null}
          </section>

          <aside className="data-panel h-fit overflow-hidden 2xl:sticky 2xl:top-20">
            <div className="border-b border-[#e7eaf0] px-5 py-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b94a5]">{pick(locale, "Daily rank history", "每日排名历史", "Historial diario de posición")}</p>
              <h2 className="mt-1 truncate text-base font-semibold">{selectedRow?.keyword || pick(locale, "Select a keyword", "选择一个关键词", "Selecciona una palabra")}</h2>
              {selectedRow ? <p className="mt-1 truncate text-[10px] text-[#8b94a5]">{cleanSite(selectedRow.siteUrl)}</p> : null}
            </div>
            <div className="grid gap-4 p-5">
              {selectedRow ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-baseline gap-2"><span className="text-3xl font-semibold tracking-[-0.04em]">{selectedRow.position > 0 ? selectedRow.position.toFixed(1) : "—"}</span><span className="text-[10px] text-[#8b94a5]">{pick(locale, "average position", "平均排名", "posición media")}</span></div>
                    <div className="flex rounded-lg border border-[#e3e7ef] bg-[#f8fafc] p-0.5">
                      {[28, 60, 90].map((period) => <Link key={period} href={buildUrl(rawParams, { days: String(period), keyword: selectedRow.keyword, keywordSite: selectedRow.siteId })} className={`rounded-md px-2 py-1.5 font-mono text-[8px] font-semibold ${days === period ? "bg-white text-[#111827] shadow-sm" : "text-[#8b94a5]"}`}>{period}{pick(locale, "d", "天", "d")}</Link>)}
                    </div>
                  </div>
                  <RankHistoryChart values={history} label={pick(locale, `Daily average position for ${selectedRow.keyword}`, `${selectedRow.keyword} 的每日平均排名`, `Posición media diaria de ${selectedRow.keyword}`)} emptyLabel={pick(locale, "No daily GSC observations in this period", "该时段暂无 GSC 每日数据", "Sin observaciones diarias de GSC en este periodo")} />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-[#e7eaf0] bg-[#fafbfc] p-3"><p className="font-mono text-[8px] uppercase text-[#8b94a5]">{pick(locale, "Clicks · 7 days", "点击 · 7 天", "Clics · 7 días")}</p><p className="mt-1 text-lg font-semibold">{selectedRow.clicks.toLocaleString()}</p></div>
                    <div className="rounded-xl border border-[#e7eaf0] bg-[#fafbfc] p-3"><p className="font-mono text-[8px] uppercase text-[#8b94a5]">{pick(locale, "Impressions · 7 days", "展示 · 7 天", "Impresiones · 7 días")}</p><p className="mt-1 text-lg font-semibold">{selectedRow.impressions.toLocaleString()}</p></div>
                  </div>
                  <div className="flex items-start gap-2 rounded-xl border border-[#d9def7] bg-[#f5f6ff] px-3 py-3 text-[10px] leading-5 text-[#4659bc]"><Crosshair size={14} className="mt-0.5 shrink-0" />{pick(locale, "A lower position is better. Movement compares the latest complete seven-day window with the preceding seven days.", "排名数值越低越好。变化值对比最近完整 7 天与此前 7 天。", "Una posición menor es mejor. El cambio compara los últimos siete días completos con los siete anteriores.")}</div>
                </>
              ) : (
                <div className="flex min-h-52 flex-col items-center justify-center text-center"><BarChart3 size={22} className="text-[#98a2b3]" /><p className="mt-3 max-w-xs text-[11px] leading-5 text-[#667085]">{pick(locale, "Choose a keyword from the ledger to inspect its daily ranking history.", "从排名明细中选择关键词，即可查看每日排名历史。", "Elige una palabra del registro para revisar su historial diario.")}</p></div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
