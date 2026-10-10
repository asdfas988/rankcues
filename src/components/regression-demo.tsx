"use client";

import { useState } from "react";
import s from "./home.module.css";

// Fictional site and numbers. The demo shows the product loop on one chart:
// a recorded change, the movement that followed, the fix, and the check.
const clicks = [
  842, 861, 830, 874, 858, 869, 851, 880, 866, 872, 859, 884, 870, 863, 876, 868,
  790, 671, 612, 598, 604, 589, 601, 596, 662, 701, 718, 731,
];

type Phase = "steady" | "drop" | "recovery";
const phaseOf = (index: number): Phase => (index >= 24 ? "recovery" : index >= 16 ? "drop" : "steady");

type Evidence = { state: "Observed" | "Correlated" | "To verify" | "Measuring"; text: string };
type Marker = {
  index: number;
  date: string;
  source: string;
  ref?: string;
  title: string;
  impact: string;
  evidence: Evidence[];
  next: string;
};

const markers: Marker[] = [
  {
    index: 7,
    date: "Sep 14",
    source: "Page snapshot",
    title: "Footer links reordered on 212 pages",
    impact: "No page or query moved beyond normal day-to-day variation.",
    evidence: [
      { state: "Observed", text: "Footer markup changed on 212 pages between two snapshots." },
      { state: "To verify", text: "No related movement found. Kept for later comparisons." },
    ],
    next: "Nothing to do.",
  },
  {
    index: 16,
    date: "Sep 22",
    source: "Page snapshot",
    title: "Title template changed on 148 /guides/ pages",
    impact: "/guides/* clicks −31% over 7 days across 148 pages. Positions held; CTR fell from 2.6% to 1.7%.",
    evidence: [
      { state: "Observed", text: "Titles changed on 148 pages between two snapshots." },
      { state: "Correlated", text: "CTR dropped the next day on the same 148 pages, not elsewhere." },
      { state: "To verify", text: "Whether search intent for these queries also shifted." },
    ],
    next: "Restore keyword-first titles on /guides/*. Prepared as a draft pull request for review.",
  },
  {
    index: 24,
    date: "Sep 30",
    source: "Fix from draft pull request",
    ref: "#212",
    title: "Keyword-first titles restored on /guides/ pages",
    impact: "/guides/* clicks +18% in 4 days, still 14% below the earlier baseline.",
    evidence: [
      { state: "Observed", text: "The fix was merged and the new titles are live." },
      { state: "Measuring", text: "Verification window closes Oct 28." },
    ],
    next: "Check again when the 28-day window closes.",
  },
];

const W = 640;
const H = 210;
const TOP = 14;
const BOTTOM = 22;
const max = Math.max(...clicks);
const min = Math.min(...clicks);
const x = (i: number) => (i / (clicks.length - 1)) * W;
const y = (v: number) => TOP + (1 - (v - (min - 60)) / (max - (min - 60))) * (H - TOP - BOTTOM);

function segment(from: number, to: number) {
  const points: string[] = [];
  for (let i = from; i <= to; i += 1) points.push(`${x(i).toFixed(1)},${y(clicks[i]).toFixed(1)}`);
  return points.join(" ");
}

export function RegressionDemo() {
  const [selected, setSelected] = useState(1);
  const marker = markers[selected];
  return (
    <figure className={s.demoCard} aria-label="Sample: clicks for a fictional site with recorded changes">
      <figcaption className={s.demoHead}>
        <span className={s.demoSite}>trailguide.example</span>
        <span className={s.demoTag}>Sample data</span>
      </figcaption>

      <div className={s.chartWrap}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={s.chart} role="img" aria-label="Organic clicks over 28 days. Steady, then a 31% drop after a title change, then partial recovery after a fix.">
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1="0" x2={W} y1={TOP + f * (H - TOP - BOTTOM)} y2={TOP + f * (H - TOP - BOTTOM)} className={s.gridLine} vectorEffect="non-scaling-stroke" />
          ))}
          {markers.map((m, i) => (
            <line key={m.index} x1={x(m.index)} x2={x(m.index)} y1="4" y2={H - BOTTOM} className={i === selected ? s.markerLineActive : s.markerLine} vectorEffect="non-scaling-stroke" />
          ))}
          <polyline points={segment(0, 16)} className={s.lineSteady} vectorEffect="non-scaling-stroke" />
          <polyline points={segment(16, 24)} className={s.lineDrop} vectorEffect="non-scaling-stroke" />
          <polyline points={segment(24, clicks.length - 1)} className={s.lineRecovery} vectorEffect="non-scaling-stroke" />
        </svg>
        {markers.map((m, i) => (
          <button
            key={m.index}
            type="button"
            className={s.markerDot}
            style={{ left: `${(m.index / (clicks.length - 1)) * 100}%` }}
            aria-pressed={i === selected}
            aria-label={`${m.date}: ${m.title}`}
            onClick={() => setSelected(i)}
          >
            <span>{m.date}</span>
          </button>
        ))}
        <div className={s.axis} aria-hidden="true"><span>Sep 7</span><span>Oct 4</span></div>
      </div>

      <div className={s.detail} aria-live="polite">
        <p className={s.detailSource}>
          <span>{marker.date}</span>
          <span>{marker.source}{marker.ref ? <> <code>{marker.ref}</code></> : null}</span>
        </p>
        <h3>{marker.title}</h3>
        <p className={s.detailImpact} data-phase={phaseOf(marker.index)}>{marker.impact}</p>
        <ul className={s.evidence}>
          {marker.evidence.map((item) => (
            <li key={item.text}>
              <span data-state={item.state}>{item.state}</span>
              {item.text}
            </li>
          ))}
        </ul>
        <p className={s.next}><strong>Next step</strong> {marker.next}</p>
      </div>
    </figure>
  );
}
