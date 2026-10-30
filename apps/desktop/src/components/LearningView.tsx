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
} from "lucide-react";
import { LearningEmptyIllustration } from "./EmptyIllustrations";

export function LearningView() {
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [selectedResource, setSelectedResource] = useState<LearningResource | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);

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
    if (selectedResource) {
      setSessions(Storage.getStudySessions(selectedResource.id));
    } else if (list.length > 0) {
      setSelectedResource(list[0]);
      setSessions(Storage.getStudySessions(list[0].id));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectResource = (res: LearningResource) => {
    setSelectedResource(res);
    setSessions(Storage.getStudySessions(res.id));
  };

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
    setSelectedResource(newRes);
    loadData();
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
    if (selectedResource?.id === id) {
      setSelectedResource(null);
    }
    loadData();
  };

  const handleLogSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResource) return;

    const newSession: StudySession = {
      id: generateUUID(),
      resource_id: selectedResource.id,
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
    setSessions(Storage.getStudySessions(selectedResource.id));
  };

  return (
    <div className="flex flex-col flex-1 gap-6 w-full max-w-none min-h-0">
      {/* Top Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-textPrimary">
            Learning Tracker
          </h2>
          <p className="text-xs text-textSecondary mt-0.5">
            Track courses, reading lists, study sessions, and progress.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Course/Resource</span>
        </button>
      </div>

      {resources.length === 0 ? (
        <div className="flex-1 min-h-[420px] rounded-2xl border border-dashed border-border bg-surface/30 flex flex-col items-center justify-center text-center p-10">
          <LearningEmptyIllustration />
          <p className="text-sm font-semibold text-textPrimary">No resources yet</p>
          <p className="text-xs text-textMuted mt-1 max-w-xs">
            Add a course, book or tutorial to track progress and log study sessions.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 px-3.5 py-2 rounded-lg bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 text-xs font-semibold transition"
          >
            + Add your first course
          </button>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Resources List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-textSecondary px-1">
            My Courses & Resources ({resources.length})
          </h3>

          {resources.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-2xl bg-surface/30 flex flex-col items-center justify-center">
              <LearningEmptyIllustration />
              <p className="text-xs font-semibold text-textPrimary">No resources yet</p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-3 px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 text-xs font-semibold transition"
              >
                + Add your first course
              </button>
            </div>
          ) : (
            resources.map((res) => {
              const isSelected = selectedResource?.id === res.id;
              return (
                <div
                  key={res.id}
                  onClick={() => handleSelectResource(res)}
                  className={`p-4 rounded-xl border bg-surface cursor-pointer transition space-y-2.5 ${
                    isSelected
                      ? "border-primary ring-1 ring-primary shadow-sm"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-textPrimary break-words">
                      {res.title}
                    </h4>
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                        res.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : res.status === "in_progress"
                          ? "bg-blue-500/10 text-blue-600"
                          : res.status === "paused"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-surfaceHover text-textSecondary"
                      }`}
                    >
                      {res.status.replace("_", " ")}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-[11px] text-textSecondary mb-1 font-mono">
                      <span>{res.provider || "Self-study"}</span>
                      <span>{res.progress_percent}%</span>
                    </div>
                    <div className="w-full bg-surfaceHover h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${res.progress_percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Selected Resource Details & Session History */}
        <div className="lg:col-span-2">
          {selectedResource ? (
            <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm space-y-6">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-textPrimary">
                    {selectedResource.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-textSecondary">
                    {selectedResource.provider && (
                      <span className="font-medium">
                        Provider: {selectedResource.provider}
                      </span>
                    )}
                    {selectedResource.url && (
                      <a
                        href={selectedResource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline font-medium"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Link</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsLogSessionModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm transition"
                  >
                    <Timer className="w-3.5 h-3.5" />
                    <span>Log Study Time</span>
                  </button>
                  <button
                    onClick={() => handleDeleteResource(selectedResource.id)}
                    className="p-1.5 rounded-lg text-textMuted hover:bg-rose-500/10 hover:text-rose-600 transition"
                    title="Delete Resource"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress Slider */}
              <div className="p-4 rounded-xl bg-background border border-border space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-textPrimary">
                  <span>Current Progress</span>
                  <span className="font-mono text-primary">
                    {selectedResource.progress_percent}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedResource.progress_percent}
                  onChange={(e) =>
                    handleProgressChange(selectedResource, Number(e.target.value))
                  }
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              {/* Study Sessions History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-textSecondary flex items-center gap-2">
                  <History className="w-3.5 h-3.5" />
                  <span>Study Session Logs ({sessions.length})</span>
                </h4>

                {sessions.length === 0 ? (
                  <p className="text-xs text-textMuted py-4 text-center border border-dashed border-border rounded-xl">
                    No sessions logged yet. Click "Log Study Time" after a study session!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-xl border border-border bg-background flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-medium text-textPrimary">
                            {s.duration_minutes} minutes
                          </p>
                          {s.notes && (
                            <p className="text-textSecondary text-[11px] mt-0.5">
                              {s.notes}
                            </p>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-textMuted">
                          {new Date(s.started_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-16 text-center border border-dashed border-border rounded-2xl bg-surface/30">
              <p className="text-sm text-textMuted">
                Select a course from the list to view progress and session history.
              </p>
            </div>
          )}
        </div>
      </div>
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
