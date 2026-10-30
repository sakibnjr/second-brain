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
      {/* Top Banner & Sync trigger */}
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

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate("tasks")}
          className="cursor-pointer p-4 rounded-xl border border-border bg-surface hover:border-primary transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-textSecondary">
              Today's Tasks
            </span>
            <CheckSquare className="w-4 h-4 text-primary group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-textPrimary mt-2">
            {todayTasks.length}
          </div>
        </div>

        <div
          onClick={() => onNavigate("tasks")}
          className="cursor-pointer p-4 rounded-xl border border-border bg-surface hover:border-rose-500 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-500">
              Overdue
            </span>
            <Clock className="w-4 h-4 text-rose-500 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">
            {overdueTasks.length}
          </div>
        </div>

        <div
          onClick={() => onNavigate("learning")}
          className="cursor-pointer p-4 rounded-xl border border-border bg-surface hover:border-teal-500 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-textSecondary">
              Active Courses
            </span>
            <GraduationCap className="w-4 h-4 text-teal-600 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-textPrimary mt-2">
            {inProgressLearning.length}
          </div>
        </div>

        <div
          onClick={() => onNavigate("ideas")}
          className="cursor-pointer p-4 rounded-xl border border-border bg-surface hover:border-amber-500 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-textSecondary">
              Ideas Captured
            </span>
            <Lightbulb className="w-4 h-4 text-amber-500 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-textPrimary mt-2">
            {ideas.length}
          </div>
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

      {/* Two Column Layout: Today's Tasks & Learning/Ideas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tasks Due Today & Overdue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-textPrimary flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-primary" />
                <span>Today's Priority Tasks</span>
              </h3>
              <button
                onClick={() => onNavigate("tasks")}
                className="text-xs font-semibold text-primary hover:underline"
              >
                View all ({tasks.length})
              </button>
            </div>

            {todayTasks.length === 0 && overdueTasks.length === 0 ? (
              <div className="py-8 text-center text-sm text-textMuted">
                🎉 No pending tasks due today. Add one above or plan your day!
              </div>
            ) : (
              <div className="space-y-2">
                {/* Overdue alert */}
                {overdueTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 group hover:border-rose-500/40 transition"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={task.status === "completed"}
                        onChange={() => handleToggleTask(task)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                      />
                      <div>
                        <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                          {task.title}
                        </p>
                        <p className="text-xs text-rose-500 font-mono">
                          Overdue ({task.due_at?.split("T")[0]})
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-600">
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
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={task.status === "completed"}
                        onChange={() => handleToggleTask(task)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                      />
                      <span className="text-sm font-medium text-textPrimary">
                        {task.title}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
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
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Learning & Recent Ideas */}
        <div className="space-y-6">
          {/* Active Learning Courses */}
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-textPrimary flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-teal-600" />
                <span>Learning Focus</span>
              </h3>
              <button
                onClick={() => onNavigate("learning")}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Tracker
              </button>
            </div>

            {inProgressLearning.length === 0 ? (
              <p className="text-xs text-textMuted text-center py-4">
                No active courses. Add resources in Learning tab.
              </p>
            ) : (
              <div className="space-y-3">
                {inProgressLearning.slice(0, 3).map((res) => (
                  <div
                    key={res.id}
                    className="p-3 rounded-xl border border-border bg-background space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-textPrimary truncate max-w-[180px]">
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
                    <div className="w-full bg-surfaceHover h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-teal-600 h-full rounded-full transition-all"
                        style={{ width: `${res.progress_percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-textSecondary font-mono">
                      <span>{res.provider || "Self-paced"}</span>
                      <span>{res.progress_percent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Ideas */}
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-textPrimary flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Recent Ideas</span>
              </h3>
              <button
                onClick={() => onNavigate("ideas")}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Inbox
              </button>
            </div>

            {recentIdeas.length === 0 ? (
              <p className="text-xs text-textMuted text-center py-4">
                No ideas captured yet.
              </p>
            ) : (
              <div className="space-y-2">
                {recentIdeas.map((idea) => (
                  <div
                    key={idea.id}
                    className="p-2.5 rounded-xl border border-border bg-background hover:border-amber-500/40 transition"
                  >
                    <p className="text-xs font-medium text-textPrimary truncate">
                      {idea.title}
                    </p>
                    {idea.content && (
                      <p className="text-[11px] text-textMuted truncate mt-0.5">
                        {idea.content}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
