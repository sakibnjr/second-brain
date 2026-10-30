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
  User,
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

function UserAvatar({
  avatarUrl,
  name,
  isLoggedIn,
  size = "md",
}: {
  avatarUrl: string | null;
  name: string;
  isLoggedIn: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  const sizeClass =
    size === "lg"
      ? "w-14 h-14 text-lg"
      : size === "sm"
      ? "w-8 h-8 text-xs"
      : "w-12 h-12 text-sm";

  if (avatarUrl && !hasError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={`${sizeClass} rounded-2xl object-cover ring-2 ring-primary/20 shadow-sm shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-sm shadow-blue-500/20 shrink-0 select-none`}
    >
      {isLoggedIn && name ? (
        name.charAt(0).toUpperCase()
      ) : (
        <User className={size === "sm" ? "w-4 h-4" : "w-5 h-5"} />
      )}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("idle");

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

  const extractUserData = (user: any) => {
    if (!user) {
      return {
        name: "Guest",
        avatarUrl: null,
        email: null,
        isLoggedIn: false,
      };
    }
    const meta = user.user_metadata || {};
    const identities = user.identities || [];
    const googleIdentity =
      identities.find((i: any) => i.provider === "google")?.identity_data || {};
    const firstIdentity = identities[0]?.identity_data || {};

    const name =
      meta.full_name ||
      meta.name ||
      meta.given_name ||
      googleIdentity.full_name ||
      googleIdentity.name ||
      firstIdentity.full_name ||
      firstIdentity.name ||
      user.email?.split("@")[0] ||
      "User";

    const avatarUrl =
      meta.avatar_url ||
      meta.picture ||
      meta.avatar ||
      meta.image ||
      meta.photoURL ||
      googleIdentity.avatar_url ||
      googleIdentity.picture ||
      firstIdentity.avatar_url ||
      firstIdentity.picture ||
      null;

    return {
      name,
      avatarUrl,
      email: user.email || null,
      isLoggedIn: true,
    };
  };

  useEffect(() => {
    syncEngine.sync();
    const unsub = syncEngine.subscribe((state) => {
      setSyncState(state);
    });

    // Initial user load
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserProfile(extractUserData(data.user));
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUserProfile(extractUserData(session.user));
          if (event === "SIGNED_IN") {
            syncEngine.sync();
          }
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
      <aside className="w-64 bg-[#0A0D14] text-[#E2E8F0] border-r border-[#1E293B] flex flex-col justify-between select-none shrink-0 shadow-xl z-20">
        <div>
          {/* Brand Header - exactly h-20 to match Main Header */}
          <div className="h-20 flex items-center justify-between px-5 border-b border-[#1E293B]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                <Layers className="w-4.5 h-4.5" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-white leading-none">
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
          <nav className="p-4 space-y-1.5">
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
        <div className="p-4 pb-5 border-t border-[#1E293B] space-y-3">
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

      {/* Main Full-Width Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto w-full min-w-0">
        {/* Sticky Top Header Bar with Welcome & User Photo */}
        <header className="h-20 border-b border-border bg-surface sticky top-0 z-10 px-8 flex items-center justify-between shrink-0 shadow-xs">
          {activeTab === "dashboard" ? (
            /* Dashboard: Replace 'Dashboard' with User Photo + Name + Date */
            <div className="flex items-center gap-4">
              <UserAvatar
                avatarUrl={userProfile.avatarUrl}
                name={userProfile.name}
                isLoggedIn={userProfile.isLoggedIn}
                size="md"
              />
              <div>
                <h2 className="text-base lg:text-lg font-bold text-textPrimary leading-tight tracking-tight">
                  {userProfile.isLoggedIn
                    ? `Welcome back, ${userProfile.name}!`
                    : "Hello, Guest 👋"}
                </h2>
                <p className="text-xs text-textSecondary font-medium mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-textMuted" />
                  <span>
                    {new Date().toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            /* Other Tabs: Show Title */
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold capitalize text-textPrimary">
                {activeTab === "ideas"
                  ? "Idea Inbox"
                  : activeTab === "learning"
                  ? "Learning Tracker"
                  : activeTab === "tasks"
                  ? "Tasks & Board"
                  : activeTab}
              </h2>
            </div>
          )}

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {!userProfile.isLoggedIn && (
              <button
                onClick={() => setActiveTab("settings")}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border hover:bg-surfaceHover text-xs font-semibold text-textSecondary transition"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            <button
              onClick={() => setIsQuickAddModalOpen(true)}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
        </header>

        {/* Content Container - 100% Width */}
        <section className="p-6 lg:p-8 flex-1 flex flex-col w-full max-w-none min-h-0">
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
