import { useState, useEffect } from "react";
import { Task, LearningResource, Idea } from "@planner/contracts";
import { Storage, generateUUID } from "../lib/storage";
import {
  CheckSquare,
  Clock,
  GraduationCap,
  Lightbulb,
  Plus,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { syncEngine, SyncState } from "../lib/syncEngine";

interface DashboardViewProps {
  onNavigate: (tab: any) => void;
  onOpenTaskModal: () => void;
}

export function DashboardView({ onNavigate, onOpenTaskModal }: DashboardViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [learning, setLearning] = useState<LearningResource[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [quickTitle, setQuickTitle] = useState("");
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncMsg, setSyncMsg] = useState<string>("");

  const refreshData = () => {
    setTasks(Storage.getTasks());
    setLearning(Storage.getLearningResources());
    setIdeas(Storage.getIdeas());
  };

  useEffect(() => {
    refreshData();
    const unsub = syncEngine.subscribe((state, msg) => {
      setSyncState(state);
      if (msg) setSyncMsg(msg);
      if (state === "synced") refreshData();
    });
    return unsub;
  }, []);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    const newTask: Task = {
      id: generateUUID(),
      title: quickTitle.trim(),
      description: null,
      priority: "medium",
      status: "todo",
      due_at: new Date().toISOString(),
      reminder_at: null,
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      version: 1,
    };

    Storage.saveTask(newTask);
    setQuickTitle("");
    refreshData();
  };

  const handleToggleTask = (task: Task) => {
    const updated: Task = {
      ...task,
      status: task.status === "completed" ? "todo" : "completed",
    };
    Storage.saveTask(updated);
    refreshData();
  };

  // Calculations
  const todayStr = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter((t) => {
    if (t.status === "completed") return false;
    if (!t.due_at) return false;
    return t.due_at.startsWith(todayStr);
  });

  const overdueTasks = tasks.filter((t) => {
    if (t.status === "completed") return false;
    if (!t.due_at) return false;
    return t.due_at.split("T")[0] < todayStr;
  });

  const inProgressLearning = learning.filter(
    (l) => l.status === "in_progress" || l.status === "planned"
  );
  const recentIdeas = ideas.slice(0, 3);

  return (
    <div className="space-y-6 w-full max-w-none">
      {/* 1. Stat Cards at the VERY TOP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <div
          onClick={() => onNavigate("tasks")}
          className="cursor-pointer p-4 rounded-2xl border border-border bg-surface hover:border-primary/60 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-textSecondary">
              Today's Tasks
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-textPrimary mt-2">
            {todayTasks.length}
          </div>
        </div>

        <div
          onClick={() => onNavigate("tasks")}
          className="cursor-pointer p-4 rounded-2xl border border-border bg-surface hover:border-rose-500/60 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-500">
              Overdue
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 group-hover:scale-110 transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-600 mt-2">
            {overdueTasks.length}
          </div>
        </div>

        <div
          onClick={() => onNavigate("learning")}
          className="cursor-pointer p-4 rounded-2xl border border-border bg-surface hover:border-teal-500/60 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-textSecondary">
              Active Courses
            </span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 group-hover:scale-110 transition">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-textPrimary mt-2">
            {inProgressLearning.length}
          </div>
        </div>

        <div
          onClick={() => onNavigate("ideas")}
          className="cursor-pointer p-4 rounded-2xl border border-border bg-surface hover:border-amber-500/60 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-textSecondary">
              Ideas Captured
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition">
              <Lightbulb className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-textPrimary mt-2">
            {ideas.length}
          </div>
        </div>
      </div>

      {/* 2. Today's Planner Banner & Sync trigger */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface border border-border rounded-2xl p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-textPrimary">
            Today's Planner
          </h2>
          <p className="text-xs text-textSecondary mt-0.5">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-background">
            <span
              className={`w-2 h-2 rounded-full ${
                syncState === "synced"
                  ? "bg-emerald-500"
                  : syncState === "syncing"
                  ? "bg-amber-500 animate-pulse"
                  : "bg-blue-500"
              }`}
            />
            <span className="text-textSecondary capitalize">
              {syncMsg || syncState}
            </span>
          </span>

          <button
            onClick={() => syncEngine.sync()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surfaceHover hover:bg-border text-xs font-semibold text-textPrimary transition"
            title="Synchronize with Supabase"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                syncState === "syncing" ? "animate-spin text-primary" : ""
              }`}
            />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Quick Add Bar */}
      <form
        onSubmit={handleQuickAdd}
        className="flex items-center gap-2 p-2 bg-surface rounded-xl border border-border shadow-sm focus-within:ring-2 focus-within:ring-primary transition"
      >
        <input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Quick add a task for today (Press Enter)..."
          className="flex-1 bg-transparent px-3 py-1.5 text-sm text-textPrimary placeholder:text-textMuted focus:outline-none"
        />
        <button
          type="submit"
          className="flex items-center gap-1 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
        <button
          type="button"
          onClick={onOpenTaskModal}
          className="px-3 py-2 text-xs font-medium text-textSecondary hover:bg-surfaceHover rounded-lg transition"
        >
          Full Details
        </button>
      </form>

      {/* 3 Same-Size Columns Layout (Tasks, Learning, Ideas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {/* Column 1: Today's Tasks */}
        <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex flex-col min-h-[380px]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-primary" />
              <span>Today's Tasks</span>
            </h3>
            <button
              onClick={() => onNavigate("tasks")}
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all ({tasks.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {todayTasks.length === 0 && overdueTasks.length === 0 ? (
              <div className="py-16 text-center text-xs text-textMuted flex flex-col items-center justify-center h-full">
                <span>🎉 No pending tasks due today.</span>
                <button
                  onClick={onOpenTaskModal}
                  className="mt-2 text-primary font-semibold hover:underline"
                >
                  + Create a task
                </button>
              </div>
            ) : (
              <>
                {/* Overdue alert */}
                {overdueTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 group hover:border-rose-500/40 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={task.status === "completed"}
                        onChange={() => handleToggleTask(task)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 truncate">
                          {task.title}
                        </p>
                        <p className="text-[10px] text-rose-500 font-mono">
                          Overdue ({task.due_at?.split("T")[0]})
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-600 shrink-0">
                      {task.priority}
                    </span>
                  </div>
                ))}

                {/* Today's Tasks */}
                {todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-background border border-border group hover:border-primary/50 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={task.status === "completed"}
                        onChange={() => handleToggleTask(task)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer shrink-0"
                      />
                      <span className="text-xs font-medium text-textPrimary truncate">
                        {task.title}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                        task.priority === "high"
                          ? "bg-rose-500/10 text-rose-600"
                          : task.priority === "medium"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-emerald-500/10 text-emerald-600"
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Column 2: Learning Focus */}
        <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex flex-col min-h-[380px]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-teal-600" />
              <span>Learning Focus</span>
            </h3>
            <button
              onClick={() => onNavigate("learning")}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Tracker ({learning.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {inProgressLearning.length === 0 ? (
              <div className="py-16 text-center text-xs text-textMuted flex flex-col items-center justify-center h-full">
                <span>No active courses.</span>
                <button
                  onClick={() => onNavigate("learning")}
                  className="mt-2 text-primary font-semibold hover:underline"
                >
                  + Add course
                </button>
              </div>
            ) : (
              inProgressLearning.map((res) => (
                <div
                  key={res.id}
                  className="p-3 rounded-xl border border-border bg-background space-y-2 hover:border-teal-500/40 transition"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-textPrimary truncate max-w-[200px]">
                      {res.title}
                    </h4>
                    {res.url && (
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-textMuted hover:text-primary transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="w-full bg-surfaceHover h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-600 h-full rounded-full transition-all"
                      style={{ width: `${res.progress_percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-textSecondary font-mono">
                    <span>{res.provider || "Self-study"}</span>
                    <span>{res.progress_percent}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Recent Ideas */}
        <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex flex-col min-h-[380px]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Recent Ideas</span>
            </h3>
            <button
              onClick={() => onNavigate("ideas")}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Inbox ({ideas.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5">
            {recentIdeas.length === 0 ? (
              <div className="py-16 text-center text-xs text-textMuted flex flex-col items-center justify-center h-full">
                <span>No ideas captured yet.</span>
                <button
                  onClick={() => onNavigate("ideas")}
                  className="mt-2 text-primary font-semibold hover:underline"
                >
                  + Quick note
                </button>
              </div>
            ) : (
              recentIdeas.map((idea) => (
                <div
                  key={idea.id}
                  onClick={() => onNavigate("ideas")}
                  className="p-3 rounded-xl border border-border bg-background hover:border-amber-500/50 transition cursor-pointer space-y-1"
                >
                  <p className="text-xs font-semibold text-textPrimary truncate">
                    {idea.title}
                  </p>
                  {idea.content && (
                    <p className="text-[11px] text-textMuted truncate">
                      {idea.content}
                    </p>
                  )}
                  <span className="text-[9px] font-mono text-textMuted block">
                    {new Date(idea.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
