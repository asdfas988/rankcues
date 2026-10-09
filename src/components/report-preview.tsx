"use client";
import { useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  Globe2,
  LayoutDashboard,
  ListChecks,
  Search,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import s from "./marketing.module.css";
const views = [
  { label: "What changed", icon: Activity },
  { label: "What to do", icon: ListChecks },
  { label: "Client brief", icon: FileText },
];
export function ReportPreview() {
  const [view, setView] = useState(0);
  return (
    <div className={s.demo} id="sample-report">
      <div className={s.demoChrome}>
        <div>
          <i />
          <i />
          <i />
        </div>
        <span>RankCues / Your SEO workspace</span>
        <span className={s.sampleBadge}>SAMPLE DATA</span>
      </div>
      <div className={s.demoLayout}>
        <aside className={s.demoSidebar} aria-label="Illustrative workspace">
          <div className={s.demoWorkspace}>
            <span>N</span>
            <div>
              Northstar Dental<small>Example workspace</small>
            </div>
            <ChevronDown size={13} />
          </div>
          <p>WORKSPACE PREVIEW</p>
          <span className={s.demoNavActive}>
            <LayoutDashboard size={16} /> Overview
          </span>
          <span>
            <FileText size={16} /> Reports
          </span>
          <span>
            <ListChecks size={16} /> Tasks
          </span>
          <p>EXPLORE</p>
          <span>
            <Search size={16} /> Keywords
          </span>
          <span>
            <Globe2 size={16} /> Websites
          </span>
          <span>
            <Settings2 size={16} /> Connections
          </span>
          <div className={s.demoConnected}>
            <ShieldCheck size={17} />
            <div>
              Evidence comes first<small>Review before taking action</small>
            </div>
          </div>
        </aside>
        <div className={s.demoMain}>
          <div className={s.demoHeading}>
            <div>
              <p>YOUR WEEK IN SEARCH</p>
              <h2>A signal worth a closer look.</h2>
            </div>
            <span>
              Jul 13–19<small>Illustrative week</small>
            </span>
          </div>
          <div
            className={s.demoTabs}
            role="group"
            aria-label="Explore the sample report"
          >
            {views.map(({ label, icon: Icon }, i) => (
              <button
                type="button"
                key={label}
                aria-pressed={view === i}
                aria-controls="demo-content"
                onClick={() => setView(i)}
              >
                <Icon size={16} />
                {label}
                <span>0{i + 1}</span>
              </button>
            ))}
          </div>
          <div
            id="demo-content"
            className={s.demoContent}
            aria-live="polite"
            aria-atomic="true"
          >
            {view === 0 ? (
              <>
                <div className={s.metrics}>
                  <div>
                    <p>Organic clicks</p>
                    <strong>8,421</strong>
                    <span className={s.decline}>
                      <ArrowDownRight size={13} /> 18.4% vs. previous week
                    </span>
                  </div>
                  <div>
                    <p>Pages to review</p>
                    <strong>
                      12 <small>pages</small>
                    </strong>
                    <span>Start with service pages</span>
                  </div>
                  <div>
                    <p>Evidence sources</p>
                    <strong>
                      02 <small>connected</small>
                    </strong>
                    <span>GSC + page snapshots</span>
                  </div>
                </div>
                <div className={s.analysisGrid}>
                  <div className={s.chartCard}>
                    <div>
                      <strong>Organic search clicks</strong>
                      <span>
                        <i /> This week <i /> Previous
                      </span>
                    </div>
                    <svg
                      viewBox="0 0 600 185"
                      role="img"
                      aria-label="Illustrative clicks decline after a page update. Timing alone does not establish cause."
                    >
                      {[30, 80, 130, 180].map((y) => (
                        <line
                          key={y}
                          x1="0"
                          x2="600"
                          y1={y}
                          y2={y}
                          stroke="#edf0f6"
                        />
                      ))}
                      <path
                        d="M0 48 L50 39 L100 58 L150 29 L200 38 L250 23 L300 36 L350 30 L400 50 L450 36 L500 46 L550 31 L600 42"
                        fill="none"
                        stroke="#b3c3e9"
                        strokeWidth="2"
                        strokeDasharray="5 5"
                      />
                      <path
                        d="M0 48 L50 39 L100 58 L150 29 L200 38 L250 23 L300 36 L350 90 L400 82 L450 119 L500 112 L550 142 L600 151 L600 185 L0 185Z"
                        fill="#edf2ff"
                      />
                      <path
                        d="M0 48 L50 39 L100 58 L150 29 L200 38 L250 23 L300 36 L350 90 L400 82 L450 119 L500 112 L550 142 L600 151"
                        fill="none"
                        stroke="#315efb"
                        strokeWidth="3"
                        strokeLinejoin="round"
                      />
                      <line
                        x1="300"
                        x2="300"
                        y1="12"
                        y2="180"
                        stroke="#8594b2"
                        strokeDasharray="4 5"
                      />
                      <circle
                        cx="300"
                        cy="36"
                        r="5"
                        fill="#315efb"
                        stroke="white"
                        strokeWidth="2"
                      />
                    </svg>
                    <div className={s.chartDates}>
                      <span>Jul 13</span>
                      <span>Jul 16 · Page update</span>
                      <span>Jul 19</span>
                    </div>
                  </div>
                  <div className={s.finding}>
                    <span className={s.findingTag}>
                      <Activity size={13} /> SIGNAL DETECTED
                    </span>
                    <h3>Service pages account for the click loss.</h3>
                    <p>
                      12 titles changed during the same week. Review the
                      affected queries before deciding what to revise.
                    </p>
                    <span className={s.correlation}>
                      Correlation · needs review
                    </span>
                  </div>
                </div>
                <p className={s.demoNote}>
                  Illustrative data. A timing overlap suggests a connection; it
                  does not prove a cause.
                </p>
              </>
            ) : view === 1 ? (
              <div className={s.actionView}>
                <div>
                  <span className={s.findingTag}>SUGGESTED NEXT ACTION</span>
                  <h3>
                    Review the updated
                    <br />
                    service-page titles.
                  </h3>
                  <p>
                    Check what changed before making another change. Keep the
                    decision attached to its evidence.
                  </p>
                  <span className={s.correlation}>
                    <ShieldCheck size={14} /> Human review required
                  </span>
                </div>
                <ol>
                  {[
                    [
                      "Compare old and new titles",
                      "Look for missing service and location terms.",
                    ],
                    [
                      "Check the affected queries",
                      "Separate lower demand from a loss of visibility.",
                    ],
                    [
                      "Choose a change and review date",
                      "Record the decision. Compare the next 14–28 days.",
                    ],
                  ].map(([t, p], i) => (
                    <li key={t}>
                      <span>0{i + 1}</span>
                      <div>
                        <strong>{t}</strong>
                        <p>{p}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className={s.clientView}>
                <div>
                  <FileText size={28} />
                  <h3>
                    The story behind
                    <br />
                    the numbers.
                  </h3>
                  <p>
                    A draft your team can check,
                    <br />
                    refine and use in a client conversation.
                  </p>
                </div>
                <article>
                  <span>NORTHSTAR DENTAL / WEEKLY BRIEF</span>
                  <h3>
                    Search traffic softened.
                    <br />
                    Here’s our next check.
                  </h3>
                  <p>
                    Organic clicks fell 18.4% this week. The decline is
                    concentrated on service pages that also received title
                    updates.
                  </p>
                  <p>
                    We have not established that the title changes caused the
                    drop. Our next step is to compare the updated copy with the
                    queries bringing visitors to these pages.
                  </p>
                  <footer>
                    <Check size={15} /> Next: title review, then a 14–28 day
                    observation window.
                  </footer>
                </article>
              </div>
            )}
          </div>
          <div className={s.demoFooter}>
            <span>
              <span /> Fictional example · no account needed
            </span>
            <button type="button" onClick={() => setView((view + 1) % 3)}>
              {view === 0
                ? "See the next action"
                : view === 1
                  ? "Read the client brief"
                  : "Back to findings"}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
