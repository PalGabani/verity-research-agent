"use client";

import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  ExternalLink,
  FileText,
  FlaskConical,
  LoaderCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type RunStatus = "queued" | "running" | "completed" | "failed";
type ClaimStatus = "supported" | "conflicting" | "unverified";

type Source = {
  id: number;
  title: string;
  url: string;
  domain: string;
  excerpt: string;
};

type Claim = {
  id: number;
  text: string;
  status: ClaimStatus;
  excerpt: string;
  source_id: number | null;
  source_title: string | null;
  source_url: string | null;
};

type ResearchRun = {
  id: number;
  question: string;
  status: RunStatus;
  created_at: string;
  source_count?: number;
  claim_count?: number;
  objective?: string | null;
  subquestions?: string[];
  report_markdown?: string | null;
  sources?: Source[];
  claims?: Claim[];
  error?: string | null;
};

type ApiError = { detail?: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) {
    throw new Error(body.detail ?? `Request failed (${response.status})`);
  }
  return body;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function StatusPill({ status }: { status: RunStatus }) {
  const labels: Record<RunStatus, string> = {
    queued: "Queued",
    running: "In progress",
    completed: "Complete",
    failed: "Failed",
  };
  return <span className={`status-pill status-${status}`}>{labels[status]}</span>;
}

function ClaimBadge({ status }: { status: ClaimStatus }) {
  const labels: Record<ClaimStatus, string> = {
    supported: "Supported",
    conflicting: "Conflicting",
    unverified: "Needs review",
  };
  return (
    <span className={`claim-badge claim-${status}`}>
      {status === "supported" ? <Check size={12} /> : <TriangleAlert size={12} />}
      {labels[status]}
    </span>
  );
}

export default function Home() {
  const [runs, setRuns] = useState<ResearchRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<ResearchRun | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadRuns = useCallback(async () => {
    try {
      const result = await request<ResearchRun[]>("/research/runs");
      setRuns(result);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load research runs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    request<ResearchRun[]>("/research/runs")
      .then((result) => {
        if (active) {
          setRuns(result);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Could not load research runs.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function createRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length < 12) {
      setError("Please enter a research question with at least 12 characters.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const created = await request<ResearchRun>("/research/runs", {
        method: "POST",
        body: JSON.stringify({ question: trimmedQuestion }),
      });
      setSelectedRun(created);
      setQuestion("");
      await loadRuns();
    } catch (reason) {
      await loadRuns();
      setError(reason instanceof Error ? reason.message : "Could not start this research run.");
    } finally {
      setSubmitting(false);
    }
  }

  async function openRun(run: ResearchRun) {
    setError("");
    try {
      const detail = await request<ResearchRun>(`/research/runs/${run.id}`);
      setSelectedRun(detail);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not open this research run.");
    }
  }

  const completedCount = runs.filter((run) => run.status === "completed").length;
  const sourceCount = runs.reduce((total, run) => total + (run.sources?.length ?? 0), 0);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => setSelectedRun(null)}>
          <span className="brand-mark"><FlaskConical size={18} strokeWidth={2.2} /></span>
          <span>verity<span className="brand-period">.</span></span>
        </a>

        <div className="workspace-switcher">
          <div className="workspace-avatar">P</div>
          <div className="workspace-copy">
            <span className="workspace-label">WORKSPACE</span>
            <span className="workspace-name">Personal research</span>
          </div>
          <ChevronDown size={15} className="muted-icon" />
        </div>

        <div className="nav-section-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button
            className={`nav-item ${selectedRun === null ? "nav-item-active" : ""}`}
            onClick={() => setSelectedRun(null)}
          >
            <Search size={17} /> <span>All research</span>
            <span className="nav-count">{runs.length}</span>
          </button>
          <button
            className="nav-item"
            onClick={() => {
              setSelectedRun(null);
              document.getElementById("research-question")?.focus();
            }}
          >
            <Plus size={17} /> <span>New research</span>
          </button>
        </nav>

        <div className="nav-section-label recent-label">RECENT</div>
        <div className="recent-list">
          {runs.slice(0, 5).map((run) => (
            <button key={run.id} className="recent-item" onClick={() => void openRun(run)}>
              <span className={`recent-dot recent-${run.status}`} />
              <span>{run.question}</span>
            </button>
          ))}
          {!loading && runs.length === 0 && (
            <p className="sidebar-empty">Your research runs will appear here.</p>
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="trust-card">
            <div className="trust-icon"><ShieldCheck size={17} /></div>
            <p>Every finding, connected to its source.</p>
            <span>Evidence before answers.</span>
          </div>
          <div className="profile">
            <div className="profile-avatar">P</div>
            <div className="profile-copy">
              <strong>Researcher</strong>
              <span>Personal workspace</span>
            </div>
            <CircleHelp size={17} className="muted-icon" />
          </div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span><span className="breadcrumb-divider">/</span>
            <strong>{selectedRun ? "Research report" : "Research overview"}</strong>
          </div>
          <div className="topbar-right">
            <span className="live-indicator"><span /> Research workspace</span>
            <button className="top-new-button" onClick={() => setSelectedRun(null)}>
              <Plus size={15} /> New research
            </button>
          </div>
        </header>

        <div className="content-wrap">
          {error && (
            <div className="error-banner" role="alert">
              <TriangleAlert size={17} />
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Dismiss error">×</button>
            </div>
          )}

          {selectedRun ? (
            <ReportView run={selectedRun} onBack={() => setSelectedRun(null)} />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line" /> YOUR RESEARCH DESK</div>
                  <h1>Find the signal.<br /><span>Show the evidence.</span></h1>
                  <p className="heading-subtitle">
                    Ask a question. Verity investigates sources, checks the evidence, and builds a report you can trace.
                  </p>
                </div>
                <div className="heading-art" aria-hidden="true">
                  <div className="art-ring art-ring-one" />
                  <div className="art-ring art-ring-two" />
                  <div className="art-core"><FlaskConical size={27} /></div>
                  <span className="art-spark art-spark-one">✳</span>
                  <span className="art-spark art-spark-two">·</span>
                </div>
              </div>

              <form className="question-card" onSubmit={createRun}>
                <div className="question-card-top">
                  <div className="question-label">
                    <span className="question-icon"><Sparkles size={16} /></span>
                    <span>START A RESEARCH RUN</span>
                  </div>
                  <span className="private-label"><ShieldCheck size={13} /> Private workspace</span>
                </div>
                <label htmlFor="research-question" className="sr-only">Your research question</label>
                <textarea
                  id="research-question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="What would you like to understand?"
                  maxLength={500}
                  rows={2}
                  disabled={submitting}
                />
                <div className="question-card-footer">
                  <span className="question-hint">Be specific for a more focused research plan.</span>
                  <div className="question-actions">
                    <span className="character-count">{question.length}/500</span>
                    <button className="research-button" type="submit" disabled={submitting || !question.trim()}>
                      {submitting ? <><LoaderCircle size={16} className="spin" /> Researching</> : <>Research <ArrowRight size={16} /></>}
                    </button>
                  </div>
                </div>
              </form>

              <div className="metrics-row">
                <Metric icon={<FileText size={17} />} label="Research runs" value={String(runs.length).padStart(2, "0")} />
                <Metric icon={<CheckCircle2 size={17} />} label="Completed reports" value={String(completedCount).padStart(2, "0")} />
                <Metric icon={<BookOpen size={17} />} label="Sources reviewed" value={String(sourceCount).padStart(2, "0")} />
              </div>

              <section className="runs-section">
                <div className="section-heading">
                  <div>
                    <h2>Recent research</h2>
                    <p>Your questions and the evidence gathered.</p>
                  </div>
                  <button className="view-all-button" onClick={loadRuns}>Refresh <ArrowUpRight size={14} /></button>
                </div>
                {loading ? (
                  <div className="empty-state"><LoaderCircle size={20} className="spin" /><span>Connecting to your research workspace…</span></div>
                ) : runs.length > 0 ? (
                  <div className="run-list">
                    {runs.map((run) => (
                      <button key={run.id} className="run-row" onClick={() => void openRun(run)}>
                        <div className="run-row-icon"><FileText size={18} /></div>
                        <div className="run-main">
                          <strong>{run.question}</strong>
                          <span><Clock3 size={13} /> {formatDate(run.created_at)}</span>
                        </div>
                        <span className="run-sources">{run.source_count ?? run.sources?.length ?? 0} sources</span>
                        <StatusPill status={run.status} />
                        <ArrowRight size={16} className="run-arrow" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-research">
                    <div className="empty-illustration"><Search size={23} /><ArrowDownRight size={14} /></div>
                    <div>
                      <strong>Your first research run starts here</strong>
                      <p>Enter a question above. Verity will map the question, gather sources, and connect findings to evidence.</p>
                    </div>
                    <button onClick={() => document.getElementById("research-question")?.focus()}>
                      Ask a question <ArrowRight size={15} />
                    </button>
                  </div>
                )}
              </section>

              <footer className="page-footer">
                <span>Verity is a research assistant, not a substitute for source review.</span>
                <span><ShieldCheck size={13} /> Source-linked by design</span>
              </footer>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="metric-card">
      <span className="metric-icon">{icon}</span>
      <div className="metric-copy"><span>{label}</span><strong>{value}</strong></div>
    </div>
  );
}

function ReportView({ run, onBack }: { run: ResearchRun; onBack: () => void }) {
  const claims = run.claims ?? [];
  const sources = run.sources ?? [];
  const supported = claims.filter((claim) => claim.status === "supported").length;
  return (
    <div className="report-view">
      <button className="back-button" onClick={onBack}><ArrowLeft size={15} /> All research</button>
      <div className="report-header">
        <div className="eyebrow"><span className="eyebrow-line" /> RESEARCH REPORT</div>
        <div className="report-title-row">
          <h1>{run.question}</h1>
          <StatusPill status={run.status} />
        </div>
        <span className="report-date"><Clock3 size={14} /> Started {formatDate(run.created_at)}</span>
      </div>

      {run.status === "failed" && (
        <div className="report-warning"><TriangleAlert size={17} /><div><strong>Research could not be completed</strong><p>{run.error ?? "Check provider configuration and try again."}</p></div></div>
      )}
      {run.status === "running" && (
        <div className="report-warning report-progress"><LoaderCircle size={17} className="spin" /><div><strong>Research is in progress</strong><p>This page will show findings when the run finishes.</p></div></div>
      )}

      {run.objective && (
        <section className="report-section plan-section">
          <div className="report-section-title"><span className="section-number">01</span><div><h2>Research objective</h2><p>The scope guiding this investigation</p></div></div>
          <div className="objective-card">{run.objective}</div>
          {!!run.subquestions?.length && (
            <div className="subquestion-list">
              <strong>Questions investigated</strong>
              {run.subquestions.map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</div>)}
            </div>
          )}
        </section>
      )}

      {!!claims.length && (
        <section className="report-section">
          <div className="report-section-title"><span className="section-number">02</span><div><h2>Evidence-backed findings</h2><p>{supported} of {claims.length} findings have a verified source excerpt</p></div></div>
          <div className="finding-list">
            {claims.map((claim, index) => (
              <article className="finding-card" key={claim.id}>
                <div className="finding-top"><span className="finding-number">F{String(index + 1).padStart(2, "0")}</span><ClaimBadge status={claim.status} /></div>
                <p className="finding-text">{claim.text}</p>
                {claim.excerpt && <blockquote>“{claim.excerpt}”</blockquote>}
                {claim.source_url && <a className="finding-source" href={claim.source_url} target="_blank" rel="noreferrer"><ExternalLink size={13} /> {claim.source_title ?? "View source"}</a>}
              </article>
            ))}
          </div>
        </section>
      )}

      {!!sources.length && (
        <section className="report-section">
          <div className="report-section-title"><span className="section-number">03</span><div><h2>Sources reviewed</h2><p>Original references collected during this run</p></div></div>
          <div className="source-list">
            {sources.map((source, index) => (
              <a className="source-row" href={source.url} target="_blank" rel="noreferrer" key={source.id}>
                <span className="source-index">S{String(index + 1).padStart(2, "0")}</span>
                <span className="source-info"><strong>{source.title}</strong><small>{source.domain}</small></span>
                <ExternalLink size={15} />
              </a>
            ))}
          </div>
        </section>
      )}

      {run.report_markdown && (
        <section className="report-section">
          <div className="report-section-title"><span className="section-number">04</span><div><h2>Report summary</h2><p>Generated from retained evidence</p></div></div>
          <pre className="report-markdown">{run.report_markdown}</pre>
        </section>
      )}

      {run.status === "completed" && !claims.length && (
        <div className="empty-state"><BookOpen size={19} /><span>No findings were extracted from the retrieved sources.</span></div>
      )}
      <div className="report-disclaimer"><ShieldCheck size={15} /> Always consult original sources. Verity links claims to excerpts but cannot guarantee source accuracy.</div>
    </div>
  );
}
