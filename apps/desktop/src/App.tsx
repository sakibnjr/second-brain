import { useState, useEffect } from "react";
import {
  CheckSquare,
  Lightbulb,
  GraduationCap,
  Calendar,
  Settings,
  LayoutDashboard,
  Cloud,
  Plus,
  Layers,
} from "lucide-react";
import { DashboardView } from "./components/DashboardView";
import { TasksView } from "./components/TasksView";
import { IdeasView } from "./components/IdeasView";
import { LearningView } from "./components/LearningView";
import { CalendarView } from "./components/CalendarView";
import { SettingsView } from "./components/SettingsView";
import { TaskModal } from "./components/TaskModal";
import { syncEngine, SyncState } from "./lib/syncEngine";
import { supabase } from "./lib/supabase";

type NavTab =
  | "dashboard"
  | "tasks"
  | "ideas"
  | "learning"
  | "calendar"
  | "settings";

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("idle");

  useEffect(() => {
    syncEngine.sync();
    const unsub = syncEngine.subscribe((state) => {
      setSyncState(state);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          syncEngine.sync();
        }
      }
    );

    return () => {
      unsub();
      authListener.subscription.unsubscribe();
    };
  }, []);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "tasks", label: "Tasks & Board", icon: CheckSquare },
    { id: "ideas", label: "Idea Inbox", icon: Lightbulb },
    { id: "learning", label: "Learning", icon: GraduationCap },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "settings", label: "Settings", icon: Settings },
  ] as const;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sleek Dark Obsidian Sidebar */}
      <aside className="w-64 bg-[#0A0D14] text-[#E2E8F0] border-r border-[#1E293B] flex flex-col justify-between p-4 select-none shrink-0 shadow-xl z-20">
        <div>
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-6 px-2 pt-1 border-b border-[#1E293B]/80 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-white leading-none">
                  Planner
                </h1>
                <p className="text-[10px] text-[#94A3B8] font-mono mt-1">
                  Offline-first
                </p>
              </div>
            </div>

            <span
              className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                syncState === "synced"
                  ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                  : syncState === "syncing"
                  ? "border-amber-500/30 text-amber-400 bg-amber-500/10 animate-pulse"
                  : "border-[#334155] text-[#94A3B8] bg-[#0F172A]"
              }`}
            >
              <Cloud className="w-3 h-3" />
              <span className="capitalize">{syncState}</span>
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold"
                      : "text-[#94A3B8] hover:bg-[#1E293B]/70 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-white" : "text-[#94A3B8]"
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer with Quick Task Button */}
        <div className="pt-4 border-t border-[#1E293B] px-1 space-y-3">
          <button
            onClick={() => setIsQuickAddModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/25 transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
          <p className="text-[10px] text-[#64748B] text-center font-mono">
            Personal Planner v1.0
          </p>
        </div>
      </aside>

      {/* Main Full-Width Content Area (No dead margins) */}
      <main className="flex-1 flex flex-col overflow-y-auto w-full min-w-0">
        <header className="h-16 border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-10 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold capitalize text-textPrimary">
              {activeTab === "ideas"
                ? "Idea Inbox"
                : activeTab === "learning"
                ? "Learning Tracker"
                : activeTab === "tasks"
                ? "Tasks & Board"
                : activeTab}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsQuickAddModalOpen(true)}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>
        </header>

        {/* Content Container - 100% Width */}
        <section className="p-6 lg:p-8 flex-1 w-full max-w-none">
          {activeTab === "dashboard" && (
            <DashboardView
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenTaskModal={() => setIsQuickAddModalOpen(true)}
            />
          )}
          {activeTab === "tasks" && <TasksView />}
          {activeTab === "ideas" && <IdeasView />}
          {activeTab === "learning" && <LearningView />}
          {activeTab === "calendar" && <CalendarView />}
          {activeTab === "settings" && <SettingsView />}
        </section>
      </main>

      {/* Global Quick Add Task Modal */}
      <TaskModal
        isOpen={isQuickAddModalOpen}
        onClose={() => setIsQuickAddModalOpen(false)}
        onSave={() => {
          // Handled via local storage reactivity
        }}
      />
    </div>
  );
}
