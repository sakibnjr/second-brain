import { useState, useEffect } from "react";
import {
  LearningResource,
  StudySession,
  LearningStatus,
} from "@planner/contracts";
import { Storage, generateUUID } from "../lib/storage";
import {
  Plus,
  ExternalLink,
  Timer,
  Trash2,
  X,
  History,
  GraduationCap,
  Library,
  Clock,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { LearningEmptyIllustration } from "./EmptyIllustrations";

type StatusFilter = "all" | LearningStatus;

const STATUS_STYLE: Record<
  LearningStatus,
  { label: string; pill: string; dot: string; bar: string }
> = {
  planned: {
    label: "Planned",
    pill: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    dot: "bg-slate-400",
    bar: "bg-slate-400",
  },
  in_progress: {
    label: "In progress",
    pill: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
    dot: "bg-blue-500",
    bar: "bg-blue-500",
  },
  paused: {
    label: "Paused",
    pill: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  completed: {
    label: "Completed",
    pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
};

const formatMinutes = (m: number) =>
  m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;

function ProgressRing({ percent, size = 76 }: { percent: number; size?: number }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-surfaceHover"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * percent) / 100}
          className="stroke-primary transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-black font-mono text-textPrimary">
        {percent}%
      </div>
    </div>
  );
}

export function LearningView() {
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [minutesByResource, setMinutesByResource] = useState<Record<string, number>>({});

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLogSessionModalOpen, setIsLogSessionModalOpen] = useState(false);

  // New Resource Form
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState<LearningStatus>("planned");

  // New Session Form
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [sessionNotes, setSessionNotes] = useState("");

  const loadData = () => {
    const list = Storage.getLearningResources();
    setResources(list);
    const mins: Record<string, number> = {};
    list.forEach((r) => {
      mins[r.id] = Storage.getStudySessions(r.id).reduce(
        (sum, s) => sum + s.duration_minutes,
        0
      );
    });
    setMinutesByResource(mins);
    setSelectedId((prev) =>
      prev && list.some((r) => r.id === prev) ? prev : list[0]?.id ?? null
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  const selected = resources.find((r) => r.id === selectedId) || null;
  const sessions: StudySession[] = selected
    ? Storage.getStudySessions(selected.id)
    : [];

  const totalMinutes = Object.values(minutesByResource).reduce((a, b) => a + b, 0);
  const inProgressCount = resources.filter((r) => r.status === "in_progress").length;
  const completedCount = resources.filter((r) => r.status === "completed").length;

  const visible = resources.filter((r) => filter === "all" || r.status === filter);

  const handleCreateResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newRes: LearningResource = {
      id: generateUUID(),
      title: title.trim(),
      url: url.trim() || null,
      provider: provider.trim() || null,
      status,
      progress_percent: 0,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      version: 1,
    };

    Storage.saveLearningResource(newRes);
    setTitle("");
    setUrl("");
    setProvider("");
    setIsAddModalOpen(false);
    setSelectedId(newRes.id);
    loadData();
    setSelectedId(newRes.id);
  };

  const handleProgressChange = (res: LearningResource, percent: number) => {
    const updated: LearningResource = {
      ...res,
      progress_percent: percent,
      status: percent === 100 ? "completed" : percent > 0 ? "in_progress" : res.status,
    };
    Storage.saveLearningResource(updated);
    loadData();
  };

  const handleDeleteResource = (id: string) => {
    Storage.deleteLearningResource(id);
    loadData();
  };

  const handleLogSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;

    const newSession: StudySession = {
      id: generateUUID(),
      resource_id: selected.id,
      started_at: new Date().toISOString(),
      duration_minutes: Number(durationMinutes),
      notes: sessionNotes.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      version: 1,
    };

    Storage.saveStudySession(newSession);
    setSessionNotes("");
    setIsLogSessionModalOpen(false);
    loadData();
  };

  const statCards = [
    {
      label: "Resources",
      value: resources.length,
      hint: "courses, books & more",
      icon: Library,
      card: "border-blue-200/80 bg-blue-50/90 dark:bg-blue-950/25 dark:border-blue-900/60",
      text: "text-blue-900/80 dark:text-blue-300",
      num: "text-blue-950 dark:text-blue-100",
      chip: "bg-blue-500/15 text-blue-600 dark:text-blue-400 fill-blue-600/30",
    },
    {
      label: "In Progress",
      value: inProgressCount,
      hint: "currently studying",
      icon: GraduationCap,
      card: "border-teal-200/80 bg-teal-50/90 dark:bg-teal-950/25 dark:border-teal-900/60",
      text: "text-teal-900/80 dark:text-teal-300",
      num: "text-teal-950 dark:text-teal-100",
      chip: "bg-teal-500/15 text-teal-600 dark:text-teal-400 fill-teal-600/30",
    },
    {
      label: "Completed",
      value: completedCount,
      hint: "finished resources",
      icon: CheckCircle2,
      card: "border-emerald-200/80 bg-emerald-50/90 dark:bg-emerald-950/25 dark:border-emerald-900/60",
      text: "text-emerald-900/80 dark:text-emerald-300",
      num: "text-emerald-950 dark:text-emerald-100",
      chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 fill-emerald-600/30",
    },
    {
      label: "Study Time",
      value: formatMinutes(totalMinutes),
      hint: "total logged",
      icon: Clock,
      card: "border-amber-200/80 bg-amber-50/90 dark:bg-amber-950/25 dark:border-amber-900/60",
      text: "text-amber-900/80 dark:text-amber-300",
      num: "text-amber-950 dark:text-amber-100",
      chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400 fill-amber-600/40",
    },
  ];

  const filters: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "in_progress", label: "Active" },
    { id: "planned", label: "Planned" },
    { id: "completed", label: "Done" },
  ];

  return (
    <div className="flex flex-col flex-1 w-full max-w-none gap-6 min-h-0">
      {resources.length === 0 ? (
        /* Full-page premium empty state */
        <div className="flex-1 min-h-[480px] bg-surface rounded-2xl border border-border shadow-xs flex flex-col items-center justify-center text-center p-10">
          <LearningEmptyIllustration />
          <h3 className="text-base font-bold text-textPrimary mt-2">
            Build your learning library
          </h3>
          <p className="text-xs text-textSecondary mt-1.5 max-w-sm leading-relaxed">
            Add courses, books and tutorials, track progress as you go, and log
            every study session in one place.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-5 flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add your first course</span>
          </button>
          <div className="mt-8 grid grid-cols-3 gap-3 w-full max-w-lg">
            {[
              { i: Library, t: "Collect", d: "Courses, books, links" },
              { i: Layers, t: "Track", d: "Progress & status" },
              { i: Timer, t: "Log", d: "Study sessions" },
            ].map(({ i: Icon, t, d }) => (
              <div
                key={t}
                className="p-3 rounded-xl bg-background border border-border text-left"
              >
                <Icon className="w-4 h-4 text-primary fill-primary/20" />
                <p className="text-xs font-bold text-textPrimary mt-2">{t}</p>
                <p className="text-[11px] text-textMuted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 w-full shrink-0">
            {statCards.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.label}
                  className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between ${c.card}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase tracking-wider ${c.text}`}>
                      {c.label}
                    </span>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${c.chip}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className={`text-3xl font-black font-mono tracking-tight my-2 ${c.num}`}>
                    {c.value}
                  </div>
                  <div className={`text-[11px] font-medium ${c.text}`}>{c.hint}</div>
                </div>
              );
            })}
          </div>

          {/* Master / detail */}
          <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-6 flex-1 min-h-[460px]">
            {/* Library list */}
            <div className="bg-surface rounded-2xl border border-border shadow-xs flex flex-col min-h-0">
              <div className="p-5 pb-4 border-b border-border/80 shrink-0 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-textPrimary tracking-tight">
                      My Library
                    </h3>
                    <p className="text-[11px] text-textMuted">
                      {visible.length} of {resources.length} resources
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
                <div className="flex items-center p-1 bg-background border border-border rounded-xl">
                  {filters.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={`flex-1 px-2 py-1.5 text-[11px] font-semibold rounded-lg transition ${
                        filter === f.id
                          ? "bg-surface text-textPrimary shadow-xs"
                          : "text-textMuted hover:text-textPrimary"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                {visible.length === 0 ? (
                  <p className="text-xs text-textMuted text-center py-10">
                    Nothing in this filter yet.
                  </p>
                ) : (
                  visible.map((res) => {
                    const isSelected = selected?.id === res.id;
                    const st = STATUS_STYLE[res.status];
                    return (
                      <button
                        key={res.id}
                        onClick={() => setSelectedId(res.id)}
                        className={`w-full text-left p-4 rounded-xl border transition space-y-3 ${
                          isSelected
                            ? "border-primary/60 bg-primary/5 ring-1 ring-primary/30"
                            : "border-transparent bg-background hover:border-border"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-[13px] font-semibold text-textPrimary break-words leading-snug">
                            {res.title}
                          </h4>
                          <span
                            className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${st.pill}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                        </div>
                        <div>
                          <div className="flex justify-between text-[11px] text-textSecondary mb-1.5">
                            <span>{res.provider || "Self-study"}</span>
                            <span className="font-mono font-semibold">
                              {res.progress_percent}%
                            </span>
                          </div>
                          <div className="w-full bg-surfaceHover h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${st.bar}`}
                              style={{ width: `${res.progress_percent}%` }}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Detail */}
            {selected ? (
              <div className="bg-surface rounded-2xl border border-border shadow-xs flex flex-col min-h-0">
                <div className="p-6 border-b border-border/80 shrink-0 flex items-start gap-5">
                  <ProgressRing percent={selected.progress_percent} />
                  <div className="flex-1 min-w-0 space-y-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[selected.status].pill}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLE[selected.status].dot}`} />
                      {STATUS_STYLE[selected.status].label}
                    </span>
                    <h3 className="text-lg font-bold text-textPrimary tracking-tight leading-tight break-words">
                      {selected.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-textSecondary">
                      <span className="font-medium">{selected.provider || "Self-study"}</span>
                      {selected.url && (
                        <a
                          href={selected.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline font-medium"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open link</span>
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setIsLogSessionModalOpen(true)}
                      className="flex items-center gap-2 px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95"
                    >
                      <Timer className="w-3.5 h-3.5" />
                      <span>Log Study Time</span>
                    </button>
                    <button
                      onClick={() => handleDeleteResource(selected.id)}
                      className="p-2 rounded-xl text-textMuted hover:bg-rose-500/10 hover:text-rose-600 transition"
                      title="Delete resource"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
                  {/* Progress control */}
                  <div className="p-4 rounded-xl bg-background border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-textPrimary">Update progress</span>
                      <div className="flex items-center gap-1.5">
                        {[0, 25, 50, 75, 100].map((p) => (
                          <button
                            key={p}
                            onClick={() => handleProgressChange(selected, p)}
                            className={`px-2 py-1 text-[10px] font-bold font-mono rounded-md transition ${
                              selected.progress_percent === p
                                ? "bg-primary text-white"
                                : "bg-surface border border-border text-textSecondary hover:text-textPrimary"
                            }`}
                          >
                            {p}%
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selected.progress_percent}
                      onChange={(e) =>
                        handleProgressChange(selected, Number(e.target.value))
                      }
                      className="w-full accent-primary cursor-pointer"
                    />
                  </div>

                  {/* Mini stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-background border border-border">
                      <p className="text-[11px] text-textMuted font-medium">Sessions</p>
                      <p className="text-xl font-black font-mono text-textPrimary mt-1">
                        {sessions.length}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-background border border-border">
                      <p className="text-[11px] text-textMuted font-medium">Time studied</p>
                      <p className="text-xl font-black font-mono text-textPrimary mt-1">
                        {formatMinutes(minutesByResource[selected.id] || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Session history */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-textSecondary flex items-center gap-2">
                      <History className="w-3.5 h-3.5" />
                      <span>Study sessions</span>
                    </h4>
                    {sessions.length === 0 ? (
                      <div className="py-8 text-center border border-dashed border-border rounded-xl">
                        <p className="text-xs font-semibold text-textPrimary">
                          No sessions logged yet
                        </p>
                        <p className="text-[11px] text-textMuted mt-1">
                          Use “Log Study Time” after your next study session.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sessions.map((s) => (
                          <div
                            key={s.id}
                            className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                                <Timer className="w-4 h-4 fill-amber-600/30" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-textPrimary">
                                  {formatMinutes(s.duration_minutes)}
                                </p>
                                {s.notes && (
                                  <p className="text-[11px] text-textSecondary truncate">
                                    {s.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="text-[11px] font-mono text-textMuted shrink-0">
                              {new Date(s.started_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-surface rounded-2xl border border-dashed border-border flex items-center justify-center text-xs text-textMuted">
                Select a resource to see details.
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Resource Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="text-base font-bold text-textPrimary">
                Add Learning Resource
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-textMuted hover:bg-surfaceHover hover:text-textPrimary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateResource} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1.5">
                  Course or Resource Title *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Distributed Systems in Rust"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-textPrimary text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1.5">
                  URL / Link (Optional)
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-textPrimary text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-textSecondary mb-1.5">
                    Provider
                  </label>
                  <input
                    type="text"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    placeholder="e.g. Coursera, Book"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-textPrimary text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-textSecondary mb-1.5">
                    Initial Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as LearningStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-textPrimary text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-textSecondary hover:bg-surfaceHover rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-primary hover:bg-primary-hover text-white rounded-lg shadow-sm"
                >
                  Create Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Session Modal */}
      {isLogSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-textPrimary">
                Log Study Session
              </h3>
              <button
                onClick={() => setIsLogSessionModalOpen(false)}
                className="p-1 rounded-lg text-textMuted hover:bg-surfaceHover hover:text-textPrimary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogSession} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1.5">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-textPrimary text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1.5">
                  Session Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="What chapters or topics did you cover?"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-textPrimary text-xs focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsLogSessionModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-textSecondary hover:bg-surfaceHover rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-primary hover:bg-primary-hover text-white rounded-lg shadow-sm"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
