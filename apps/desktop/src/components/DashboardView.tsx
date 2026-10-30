import { useState, useEffect } from "react";
import { Task, LearningResource, Idea } from "@planner/contracts";
import { Storage, generateUUID } from "../lib/storage";
import { supabase } from "../lib/supabase";
import {
  CheckSquare,
  Clock,
  GraduationCap,
  Lightbulb,
  Plus,
  ExternalLink,
  ArrowUpRight,
  User,
  Sparkles,
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

  // User Profile
  const [userProfile, setUserProfile] = useState<{
    name: string;
    avatarUrl: string | null;
    email: string | null;
    isLoggedIn: boolean;
  }>({
    name: "Guest",
    avatarUrl: null,
    email: null,
    isLoggedIn: false,
  });

  const refreshData = () => {
    setTasks(Storage.getTasks());
    setLearning(Storage.getLearningResources());
    setIdeas(Storage.getIdeas());
  };

  useEffect(() => {
    refreshData();

    // Check Supabase user
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        const meta = data.user.user_metadata || {};
        const name =
          meta.full_name ||
          meta.name ||
          data.user.email?.split("@")[0] ||
          "User";
        const avatar = meta.avatar_url || meta.picture || null;
        setUserProfile({
          name,
          avatarUrl: avatar,
          email: data.user.email || null,
          isLoggedIn: true,
        });
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          const meta = session.user.user_metadata || {};
          const name =
            meta.full_name ||
            meta.name ||
            session.user.email?.split("@")[0] ||
            "User";
          const avatar = meta.avatar_url || meta.picture || null;
          setUserProfile({
            name,
            avatarUrl: avatar,
            email: session.user.email || null,
            isLoggedIn: true,
          });
          refreshData();
        } else {
          setUserProfile({
            name: "Guest",
            avatarUrl: null,
            email: null,
            isLoggedIn: false,
          });
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
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
    <div className="space-y-6 w-full max-w-none">
      {/* 1. Stat Cards at the VERY TOP with Soothing Pastel Colors */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* Card 1: Today's Tasks */}
        <div
          onClick={() => onNavigate("tasks")}
          className="cursor-pointer p-5 rounded-2xl border border-blue-200/80 bg-blue-50/90 dark:bg-blue-950/25 dark:border-blue-900/60 hover:shadow-md transition-all group shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
              Today's Tasks
            </span>
            <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400 fill-blue-600/30 group-hover:scale-110 transition" />
          </div>
          <div className="text-3xl font-black text-blue-950 dark:text-blue-100 mt-3 font-mono">
            {todayTasks.length}
          </div>
        </div>

        {/* Card 2: Overdue */}
        <div
          onClick={() => onNavigate("tasks")}
          className="cursor-pointer p-5 rounded-2xl border border-rose-200/80 bg-rose-50/90 dark:bg-rose-950/25 dark:border-rose-900/60 hover:shadow-md transition-all group shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-900 dark:text-rose-300">
              Overdue
            </span>
            <Clock className="w-5 h-5 text-rose-600 dark:text-rose-400 fill-rose-600/30 group-hover:scale-110 transition" />
          </div>
          <div className="text-3xl font-black text-rose-950 dark:text-rose-100 mt-3 font-mono">
            {overdueTasks.length}
          </div>
        </div>

        {/* Card 3: Active Courses */}
        <div
          onClick={() => onNavigate("learning")}
          className="cursor-pointer p-5 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 dark:bg-emerald-950/25 dark:border-emerald-900/60 hover:shadow-md transition-all group shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
              Active Courses
            </span>
            <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-600/30 group-hover:scale-110 transition" />
          </div>
          <div className="text-3xl font-black text-emerald-950 dark:text-emerald-100 mt-3 font-mono">
            {inProgressLearning.length}
          </div>
        </div>

        {/* Card 4: Ideas Captured */}
        <div
          onClick={() => onNavigate("ideas")}
          className="cursor-pointer p-5 rounded-2xl border border-amber-200/80 bg-amber-50/90 dark:bg-amber-950/25 dark:border-amber-900/60 hover:shadow-md transition-all group shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
              Ideas Captured
            </span>
            <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 fill-amber-600/40 group-hover:scale-110 transition" />
          </div>
          <div className="text-3xl font-black text-amber-950 dark:text-amber-100 mt-3 font-mono">
            {ideas.length}
          </div>
        </div>
      </div>

      {/* 2. User Greeting Banner (No Sync text; shows User DP + Name + Date) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4">
          {userProfile.avatarUrl ? (
            <img
              src={userProfile.avatarUrl}
              alt={userProfile.name}
              className="w-13 h-13 rounded-2xl object-cover ring-2 ring-primary/20 shadow-md"
            />
          ) : (
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/20">
              {userProfile.isLoggedIn ? (
                userProfile.name.charAt(0).toUpperCase()
              ) : (
                <User className="w-6 h-6" />
              )}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-textPrimary">
                {userProfile.isLoggedIn
                  ? `Welcome back, ${userProfile.name}!`
                  : "Hello, Guest 👋"}
              </h2>
              {userProfile.isLoggedIn && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <Sparkles className="w-3 h-3" />
                  <span>Google Synced</span>
                </span>
              )}
            </div>
            <p className="text-xs text-textSecondary font-medium mt-0.5">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        <div>
          {!userProfile.isLoggedIn ? (
            <button
              onClick={() => onNavigate("settings")}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <User className="w-3.5 h-3.5" />
              <span>Connect Google Account</span>
            </button>
          ) : (
            <button
              onClick={onOpenTaskModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surfaceHover hover:bg-border text-xs font-semibold text-textPrimary transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Quick Plan</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Add Bar */}
      <form
        onSubmit={handleQuickAdd}
        className="flex items-center gap-2 p-2 bg-surface rounded-2xl border border-border shadow-sm focus-within:ring-2 focus-within:ring-primary transition"
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
          className="flex items-center gap-1 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-3 py-2 rounded-xl transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
        <button
          type="button"
          onClick={onOpenTaskModal}
          className="px-3 py-2 text-xs font-medium text-textSecondary hover:bg-surfaceHover rounded-xl transition"
        >
          Full Details
        </button>
      </form>

      {/* 3. Redesigned Premium 3-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {/* Column 1: Today's Tasks */}
        <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex flex-col min-h-[420px] transition hover:shadow-md">
          {/* Premium Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-border/80 mb-4">
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
                    {todayTasks.length}
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

          <div className="flex-1 overflow-y-auto space-y-2">
            {todayTasks.length === 0 && overdueTasks.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center h-full">
                <TaskEmptyIllustration />
                <p className="text-xs font-semibold text-textPrimary">
                  All caught up for today!
                </p>
                <p className="text-[11px] text-textMuted mt-1 max-w-[200px]">
                  No pending tasks due today. Plan your day by scheduling a new task.
                </p>
                <button
                  onClick={onOpenTaskModal}
                  className="mt-3.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition"
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
        <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex flex-col min-h-[420px] transition hover:shadow-md">
          {/* Premium Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-border/80 mb-4">
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
                    {inProgressLearning.length} Active
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

          <div className="flex-1 overflow-y-auto space-y-3">
            {inProgressLearning.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center h-full">
                <LearningEmptyIllustration />
                <p className="text-xs font-semibold text-textPrimary">
                  No courses active
                </p>
                <p className="text-[11px] text-textMuted mt-1 max-w-[200px]">
                  Track tutorials, books, and courses you are studying.
                </p>
                <button
                  onClick={() => onNavigate("learning")}
                  className="mt-3.5 px-3 py-1.5 rounded-xl bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 text-xs font-semibold transition"
                >
                  + Add Learning Resource
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
        <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex flex-col min-h-[420px] transition hover:shadow-md">
          {/* Premium Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-border/80 mb-4">
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
                    {ideas.length} Saved
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

          <div className="flex-1 overflow-y-auto space-y-2.5">
            {recentIdeas.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center h-full">
                <IdeaEmptyIllustration />
                <p className="text-xs font-semibold text-textPrimary">
                  No ideas captured yet
                </p>
                <p className="text-[11px] text-textMuted mt-1 max-w-[200px]">
                  Got a spark of inspiration? Capture your quick thoughts anytime.
                </p>
                <button
                  onClick={() => onNavigate("ideas")}
                  className="mt-3.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 text-xs font-semibold transition"
                >
                  + Capture Quick Idea
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
