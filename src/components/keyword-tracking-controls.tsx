"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, Plus, Star } from "lucide-react";

const trackingEvent = "rankcues:keyword-tracking";

type TrackingEventDetail = {
  siteId: string;
  keyword: string;
  tracked: boolean;
  trackedId: string | null;
};

type TrackingLabels = {
  property: string;
  keyword: string;
  device: string;
  allDevices: string;
  desktop: string;
  mobile: string;
  tablet: string;
  placeholder: string;
  submit: string;
  submitting: string;
  success: string;
  failed: string;
};

function announceTracking(detail: TrackingEventDetail) {
  window.dispatchEvent(new CustomEvent<TrackingEventDetail>(trackingEvent, { detail }));
}

async function postTracking(payload: Record<string, string>) {
  const response = await fetch("/api/keywords/track", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({})) as { message?: string; trackedId?: string };
  if (!response.ok) throw new Error(result.message || "Keyword tracking failed.");
  return result;
}

export function KeywordTrackingForm({
  sites,
  defaultSiteId,
  defaultDevice,
  labels,
}: {
  sites: Array<{ id: string; label: string }>;
  defaultSiteId: string;
  defaultDevice: "ALL" | "DESKTOP" | "MOBILE" | "TABLET";
  labels: TrackingLabels;
}) {
  const keywordRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const siteId = String(form.get("siteId") || "");
    const keyword = String(form.get("keyword") || "").trim();
    const device = String(form.get("device") || "ALL");
    if (!siteId || !keyword) return;

    setPending(true);
    setNotice(null);
    try {
      const result = await postTracking({ siteId, keyword, device, source: "manual" });
      announceTracking({ siteId, keyword, tracked: true, trackedId: result.trackedId || null });
      setNotice({ tone: "success", text: labels.success.replace("{keyword}", keyword) });
      if (keywordRef.current) keywordRef.current.value = "";
      keywordRef.current?.focus();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : labels.failed });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex-1">
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[minmax(150px,0.8fr)_minmax(220px,1.4fr)_140px_auto]">
        <label className="grid gap-1.5 text-[10px] font-semibold text-[#667085]">
          {labels.property}
          <select name="siteId" defaultValue={defaultSiteId} required className="h-10 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[11px] text-[#111827] outline-none focus:border-[#8da2ff]">
            {sites.map((site) => <option key={site.id} value={site.id}>{site.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-[10px] font-semibold text-[#667085]">
          {labels.keyword}
          <input ref={keywordRef} name="keyword" required maxLength={300} placeholder={labels.placeholder} className="h-10 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[11px] text-[#111827] outline-none placeholder:text-[#a7afbd] focus:border-[#8da2ff]" />
        </label>
        <label className="grid gap-1.5 text-[10px] font-semibold text-[#667085]">
          {labels.device}
          <select name="device" defaultValue={defaultDevice} className="h-10 rounded-lg border border-[#dfe3eb] bg-white px-3 text-[11px] text-[#111827] outline-none focus:border-[#8da2ff]">
            <option value="ALL">{labels.allDevices}</option>
            <option value="DESKTOP">{labels.desktop}</option>
            <option value="MOBILE">{labels.mobile}</option>
            <option value="TABLET">{labels.tablet}</option>
          </select>
        </label>
        <button type="submit" disabled={!sites.length || pending} className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#111827] px-4 text-[11px] font-semibold text-white transition hover:bg-[#263244] disabled:cursor-not-allowed disabled:opacity-40">
          {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Plus size={14} />}
          {pending ? labels.submitting : labels.submit}
        </button>
      </form>
      <div aria-live="polite" className="min-h-6 pt-2">
        {notice ? (
          <p className={`inline-flex items-center gap-1.5 text-[10px] ${notice.tone === "success" ? "text-[#087f6b]" : "text-[#b42318]"}`}>
            {notice.tone === "success" ? <CheckCircle2 size={12} /> : null}{notice.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function KeywordTrackingToggle({
  siteId,
  keyword,
  device,
  initialTracked,
  initialTrackedId,
  trackLabel,
  untrackLabel,
  failedLabel,
}: {
  siteId: string;
  keyword: string;
  device: string;
  initialTracked: boolean;
  initialTrackedId: string | null;
  trackLabel: string;
  untrackLabel: string;
  failedLabel: string;
}) {
  const [tracked, setTracked] = useState(initialTracked);
  const [trackedId, setTrackedId] = useState(initialTrackedId);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleTracking(event: Event) {
      const detail = (event as CustomEvent<TrackingEventDetail>).detail;
      if (detail.siteId !== siteId || detail.keyword.trim().toLowerCase() !== keyword.trim().toLowerCase()) return;
      setTracked(detail.tracked);
      setTrackedId(detail.trackedId);
      setError(null);
    }
    window.addEventListener(trackingEvent, handleTracking);
    return () => window.removeEventListener(trackingEvent, handleTracking);
  }, [keyword, siteId]);

  async function toggle() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      if (tracked) {
        if (!trackedId) throw new Error(failedLabel);
        await postTracking({ action: "untrack", trackedId });
        setTracked(false);
        setTrackedId(null);
        announceTracking({ siteId, keyword, tracked: false, trackedId: null });
      } else {
        const result = await postTracking({ siteId, keyword, device, source: "ledger" });
        const nextTrackedId = result.trackedId || null;
        setTracked(true);
        setTrackedId(nextTrackedId);
        announceTracking({ siteId, keyword, tracked: true, trackedId: nextTrackedId });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : failedLabel);
    } finally {
      setPending(false);
    }
  }

  const label = tracked ? untrackLabel : trackLabel;
  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-label={label}
        aria-pressed={tracked}
        title={error || label}
        className={`flex size-8 items-center justify-center rounded-lg border transition disabled:cursor-wait disabled:opacity-60 ${error ? "border-[#f5c8c2] bg-[#fff2f0] text-[#b42318]" : tracked ? "border-[#c8d0ff] bg-[#eef1ff] text-[#5268d9]" : "border-[#e3e7ef] bg-white text-[#a7afbd] hover:text-[#5268d9]"}`}
      >
        {pending ? <LoaderCircle size={13} className="animate-spin" /> : <Star size={13} fill={tracked ? "currentColor" : "none"} />}
      </button>
      {error ? <span role="alert" className="sr-only">{error}</span> : null}
    </>
  );
}
