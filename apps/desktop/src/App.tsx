import { useState } from "react";
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

type NavTab = "dashboard" | "tasks" | "ideas" | "learning" | "calendar" | "settings";

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");

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
      <aside className="w-64 border-r border-border bg-surface flex flex-col justify-between p-4 select-none">
        <div>
          <div className="flex items-center justify-between pb-6 px-2">
            <h1 className="text-xl font-bold tracking-tight text-textPrimary">
              Planner
            </h1>
            <span className="flex items-center gap-1.5 text-xs text-textMuted font-mono">
              <Cloud className="w-3.5 h-3.5 text-emerald-500" />
              <span>Offline-ready</span>
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
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
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
          <p className="text-xs text-textMuted">
            Personal Planner • Milestone 1
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-14 border-b border-border bg-surface/50 backdrop-blur px-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold capitalize text-textPrimary">
            {activeTab === "ideas" ? "Idea Inbox" : activeTab}
          </h2>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition">
              <Plus className="w-3.5 h-3.5" />
              <span>Quick Add</span>
            </button>
          </div>
        </header>

        <section className="p-6">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <h3 className="text-base font-semibold text-textPrimary mb-2">
              Welcome to Personal Planner
            </h3>
            <p className="text-sm text-textSecondary leading-relaxed">
              Milestone 1 foundation initialized: Architecture scaffold, cross-platform
              data contracts (@planner/contracts), design tokens, and local-first repository
              structure ready.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
