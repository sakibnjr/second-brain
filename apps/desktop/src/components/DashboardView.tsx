import { useState, useEffect } from "react";
import { Task, LearningResource, Idea } from "@planner/contracts";
import { Storage, generateUUID } from "../lib/storage";
import {
  CheckSquare,
  Clock,
  GraduationCap,
  Lightbulb,
  Plus,
  ExternalLink,
  ArrowUpRight,
} from "lucide-react";
import {
  TaskEmptyIllustration,
  LearningEmptyIllustration,
  IdeaEmptyIllustration,
} from "./EmptyIllustrations";

interface DashboardViewProps {
  onNavigate: (tab: any) => void;
  onOpenTaskModal: () => void;
}

export function DashboardView({
  onNavigate,
  onOpenTaskModal,
}: DashboardViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [learning, setLearning] = useState<LearningResource[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [quickTitle, setQuickTitle] = useState("");

  const refreshData = () => {
    setTasks(Storage.getTasks());
    setLearning(Storage.getLearningResources());
    setIdeas(Storage.getIdeas());
  };

  useEffect(() => {
    refreshData();
    window.addEventListener("storage", refreshData);
    return () => {
      window.removeEventListener("storage", refreshData);
    };
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
    <div className="flex flex-col flex-1 w-full max-w-none space-y-6 min-h-0">
      {/* 1. Stat Cards with Balanced Structure & Helpful Context */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 w-full shrink-0">
        {/* Card 1: Today's Tasks */}
        <div
          onClick={() => onNavigate("tasks")}
          className="cursor-pointer p-5 rounded-2xl border border-blue-200/80 bg-blue-50/90 dark:bg-blue-950/25 dark:border-blue-900/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900/80 dark:text-blue-300">
              Today's Tasks
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition">
              <CheckSquare className="w-4 h-4 fill-blue-600/30" />
            </div>
          </div>
          <div className="text-3xl font-black text-blue-950 dark:text-blue-100 font-mono tracking-tight my-2">
            {todayTasks.length}
          </div>
          <div className="text-[11px] font-medium text-blue-700/80 dark:text-blue-300/80">
            {todayTasks.length === 0 ? "All caught up today" : `${todayTasks.length} scheduled for today`}
          </div>
        </div>

        {/* Card 2: Overdue */}
        <div
          onClick={() => onNavigate("tasks")}
          className="cursor-pointer p-5 rounded-2xl border border-rose-200/80 bg-rose-50/90 dark:bg-rose-950/25 dark:border-rose-900/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-900/80 dark:text-rose-300">
              Overdue
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-105 transition">
              <Clock className="w-4 h-4 fill-rose-600/30" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-950 dark:text-rose-100 font-mono tracking-tight my-2">
            {overdueTasks.length}
          </div>
          <div className="text-[11px] font-medium text-rose-700/80 dark:text-rose-300/80">
            {overdueTasks.length === 0 ? "No overdue tasks" : "Requires attention"}
          </div>
        </div>

        {/* Card 3: Active Courses */}
        <div
          onClick={() => onNavigate("learning")}
          className="cursor-pointer p-5 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 dark:bg-emerald-950/25 dark:border-emerald-900/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900/80 dark:text-emerald-300">
              Active Courses
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition">
              <GraduationCap className="w-4 h-4 fill-emerald-600/30" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-950 dark:text-emerald-100 font-mono tracking-tight my-2">
            {inProgressLearning.length}
          </div>
          <div className="text-[11px] font-medium text-emerald-700/80 dark:text-emerald-300/80">
            {inProgressLearning.length === 0 ? "Start a new track" : `${inProgressLearning.length} learning tracks in progress`}
          </div>
        </div>

        {/* Card 4: Ideas Captured */}
        <div
          onClick={() => onNavigate("ideas")}
          className="cursor-pointer p-5 rounded-2xl border border-amber-200/80 bg-amber-50/90 dark:bg-amber-950/25 dark:border-amber-900/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900/80 dark:text-amber-300">
              Ideas Captured
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition">
              <Lightbulb className="w-4 h-4 fill-amber-600/40" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-950 dark:text-amber-100 font-mono tracking-tight my-2">
            {ideas.length}
          </div>
          <div className="text-[11px] font-medium text-amber-700/80 dark:text-amber-300/80">
            {ideas.length === 0 ? "Inbox is empty" : `${ideas.length} notes & sparks saved`}
          </div>
        </div>
      </div>

      {/* 2. Sleek Quick Add Task Bar */}
      <form
        onSubmit={handleQuickAdd}
        className="flex items-center gap-3 px-4 py-2.5 bg-surface rounded-2xl border border-border shadow-xs hover:border-slate-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shrink-0"
      >
        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Plus className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="What would you like to accomplish today? (Type & press Enter to save)"
          className="flex-1 bg-transparent text-sm text-textPrimary placeholder:text-textMuted focus:outline-none"
        />
        <div className="flex items-center gap-2 shrink-0">
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium text-textMuted bg-background rounded-md border border-border">
            Enter ↵
          </kbd>
          <button
            type="submit"
            className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
          <button
            type="button"
            onClick={onOpenTaskModal}
            className="px-3 py-2 text-xs font-medium text-textSecondary hover:bg-surfaceHover rounded-xl transition"
          >
            Detailed Plan
          </button>
        </div>
      </form>

      {/* 3. Redesigned Premium 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full flex-1 min-h-[460px]">
        {/* Column 1: Today's Tasks */}
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs flex flex-col transition hover:shadow-md h-full">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border/80 mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center shadow-xs">
                <CheckSquare className="w-5 h-5 fill-blue-500/30" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-textPrimary tracking-tight">
                    Today's Focus
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono">
                    {todayTasks.length} tasks
                  </span>
                </div>
                <p className="text-[11px] text-textMuted">Priority tasks scheduled</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("tasks")}
              className="p-1.5 rounded-lg text-textMuted hover:bg-surfaceHover hover:text-primary transition"
              title="Open Tasks"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto space-y-2 min-h-0">
            {todayTasks.length === 0 && overdueTasks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                <TaskEmptyIllustration />
                <h4 className="text-xs font-semibold text-textPrimary mt-3">
                  All caught up for today!
                </h4>
                <p className="text-[11px] text-textMuted mt-1 max-w-[220px]">
                  No pending tasks due today. Plan your day by scheduling a new task.
                </p>
                <button
                  onClick={onOpenTaskModal}
                  className="mt-4 px-3.5 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition active:scale-95"
                >
                  + Add New Task
                </button>
              </div>
            ) : (
              <>
                {/* Overdue alert */}
                {overdueTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 group hover:border-rose-500/40 transition shrink-0"
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
                    className="flex items-center justify-between p-3 rounded-xl bg-background border border-border group hover:border-primary/50 transition shrink-0"
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
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs flex flex-col transition hover:shadow-md h-full">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border/80 mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 flex items-center justify-center shadow-xs">
                <GraduationCap className="w-5 h-5 fill-teal-500/30" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-textPrimary tracking-tight">
                    Learning Focus
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono">
                    {inProgressLearning.length} active
                  </span>
                </div>
                <p className="text-[11px] text-textMuted">Courses & study goals</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("learning")}
              className="p-1.5 rounded-lg text-textMuted hover:bg-surfaceHover hover:text-teal-600 transition"
              title="Open Learning"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto space-y-3 min-h-0">
            {inProgressLearning.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                <LearningEmptyIllustration />
                <h4 className="text-xs font-semibold text-textPrimary mt-3">
                  No courses active
                </h4>
                <p className="text-[11px] text-textMuted mt-1 max-w-[220px]">
                  Track tutorials, books, and courses you are studying.
                </p>
                <button
                  onClick={() => onNavigate("learning")}
                  className="mt-4 px-3.5 py-1.5 rounded-xl bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 text-xs font-semibold transition active:scale-95"
                >
                  + Add Learning Resource
                </button>
              </div>
            ) : (
              inProgressLearning.map((res) => (
                <div
                  key={res.id}
                  className="p-3.5 rounded-xl border border-border bg-background space-y-2.5 hover:border-teal-500/40 transition shrink-0"
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
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs flex flex-col transition hover:shadow-md h-full">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border/80 mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center shadow-xs">
                <Lightbulb className="w-5 h-5 fill-amber-500/30" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-textPrimary tracking-tight">
                    Idea Vault
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
                    {ideas.length} ideas
                  </span>
                </div>
                <p className="text-[11px] text-textMuted">Sparks & quick notes</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("ideas")}
              className="p-1.5 rounded-lg text-textMuted hover:bg-surfaceHover hover:text-amber-600 transition"
              title="Open Ideas"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto space-y-2.5 min-h-0">
            {recentIdeas.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                <IdeaEmptyIllustration />
                <h4 className="text-xs font-semibold text-textPrimary mt-3">
                  No ideas captured yet
                </h4>
                <p className="text-[11px] text-textMuted mt-1 max-w-[220px]">
                  Got a spark of inspiration? Capture your quick thoughts anytime.
                </p>
                <button
                  onClick={() => onNavigate("ideas")}
                  className="mt-4 px-3.5 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 text-xs font-semibold transition active:scale-95"
                >
                  + Capture Quick Idea
                </button>
              </div>
            ) : (
              recentIdeas.map((idea) => (
                <div
                  key={idea.id}
                  onClick={() => onNavigate("ideas")}
                  className="p-3.5 rounded-xl border border-border bg-background hover:border-amber-500/50 transition cursor-pointer space-y-1 shrink-0"
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
