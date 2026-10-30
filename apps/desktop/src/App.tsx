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
    // Initial sync check
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
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "ideas", label: "Idea Inbox", icon: Lightbulb },
    { id: "learning", label: "Learning", icon: GraduationCap },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "settings", label: "Settings", icon: Settings },
  ] as const;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-border bg-surface flex flex-col justify-between p-4 select-none shrink-0">
        <div>
          <div className="flex items-center justify-between pb-6 px-2">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-textPrimary">
                Planner
              </h1>
              <p className="text-[11px] text-textMuted font-mono">Offline-first</p>
            </div>

            <span
              className={`flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                syncState === "synced"
                  ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                  : syncState === "syncing"
                  ? "border-amber-500/30 text-amber-600 bg-amber-500/10 animate-pulse"
                  : "border-border text-textMuted bg-background"
              }`}
            >
              <Cloud className="w-3 h-3" />
              <span className="capitalize">{syncState}</span>
            </span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-textSecondary hover:bg-surfaceHover hover:text-textPrimary"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-border px-2">
          <button
            onClick={() => setIsQuickAddModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Task</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-16 border-b border-border bg-surface/60 backdrop-blur sticky top-0 z-10 px-8 flex items-center justify-between">
          <h2 className="text-base font-bold capitalize text-textPrimary">
            {activeTab === "ideas"
              ? "Idea Inbox"
              : activeTab === "learning"
              ? "Learning Tracker"
              : activeTab}
          </h2>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsQuickAddModalOpen(true)}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>
        </header>

        <section className="p-8">
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
