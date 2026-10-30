import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Storage } from "../lib/storage";
import { syncEngine, SyncState } from "../lib/syncEngine";
import { BrandWordmark } from "./BrandWordmark";
import {
  LogOut,
  RefreshCw,
  Download,
  Upload,
  Moon,
  Sun,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Database,
  Check,
  User,
  HardDrive,
  Laptop,
} from "lucide-react";

export function SettingsView() {
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

  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMsg, setAuthMsg] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);

  const [storageStats, setStorageStats] = useState({
    tasks: 0,
    ideas: 0,
    learning: 0,
    sessions: 0,
  });

  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains("dark");
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

  const refreshStats = () => {
    const tasks = Storage.getTasks().length;
    const ideas = Storage.getIdeas().length;
    const learning = Storage.getLearningResources();
    let totalSessions = 0;
    learning.forEach((l) => {
      totalSessions += Storage.getStudySessions(l.id).length;
    });

    setStorageStats({
      tasks,
      ideas,
      learning: learning.length,
      sessions: totalSessions,
    });
  };

  useEffect(() => {
    // Initial user load
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserProfile(extractUserData(data.user));
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUserProfile(extractUserData(session.user));
          syncEngine.sync();
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

    setLastSync(Storage.getLastSyncTime());
    refreshStats();

    const unsub = syncEngine.subscribe((state, msg) => {
      setSyncState(state);
      if (msg) setSyncMessage(msg);
      setLastSync(Storage.getLastSyncTime());
      refreshStats();
    });

    return () => {
      authListener.subscription.unsubscribe();
      unsub();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthMsg(null);
    setIsAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || "Failed to initialize Google Sign In");
      setIsAuthLoading(false);
    }
  };

  const toggleTheme = (dark: boolean) => {
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthMsg(null);
    setIsAuthLoading(true);

    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: emailInput.trim(),
          password: passwordInput,
        });
        if (error) throw error;
        if (data.user) {
          setAuthMsg("Account created! You are now authenticated.");
          setUserProfile(extractUserData(data.user));
          syncEngine.sync();
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailInput.trim(),
          password: passwordInput,
        });
        if (error) throw error;
        if (data.user) {
          setAuthMsg("Signed in successfully!");
          setUserProfile(extractUserData(data.user));
          syncEngine.sync();
        }
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserProfile({
      name: "Guest",
      avatarUrl: null,
      email: null,
      isLoggedIn: false,
    });
    setAuthMsg("Signed out. Working in local guest mode.");
  };

  const handleExport = () => {
    const data = Storage.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `second-brain-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        Storage.importData(parsed);
        alert("Backup restored successfully! Refreshing...");
        window.location.reload();
      } catch (err) {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
  };

  const isSyncing = syncState === "syncing";
  const totalItems =
    storageStats.tasks +
    storageStats.ideas +
    storageStats.learning +
    storageStats.sessions;

  return (
    <div className="flex flex-col flex-1 w-full max-w-none space-y-6 min-h-0">
      {/* 1. Top Quick Metric / Status Cards (Matching Dashboard Density) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 w-full shrink-0">
        {/* Metric 1: Account Status */}
        <div className="p-5 rounded-2xl border border-blue-200/80 bg-blue-50/90 dark:bg-blue-950/25 dark:border-blue-900/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900/80 dark:text-blue-300">
              Account Status
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <User className="w-4 h-4 fill-blue-600/30" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-950 dark:text-blue-100 tracking-tight my-1.5 truncate">
            {userProfile.isLoggedIn ? userProfile.name : "Guest Mode"}
          </div>
          <div className="text-[11px] font-medium text-blue-700/80 dark:text-blue-300/80 truncate">
            {userProfile.isLoggedIn ? userProfile.email : "Local storage only"}
          </div>
        </div>

        {/* Metric 2: Sync Health */}
        <div className="p-5 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 dark:bg-emerald-950/25 dark:border-emerald-900/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900/80 dark:text-emerald-300">
              Sync Health
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-950 dark:text-emerald-100 font-mono tracking-tight my-1.5 capitalize">
            {syncMessage || syncState}
          </div>
          <div className="text-[11px] font-medium text-emerald-700/80 dark:text-emerald-300/80">
            {lastSync ? `Last synced ${new Date(lastSync).toLocaleTimeString()}` : "Ready to replicate"}
          </div>
        </div>

        {/* Metric 3: Local Storage Vault */}
        <div className="p-5 rounded-2xl border border-purple-200/80 bg-purple-50/90 dark:bg-purple-950/25 dark:border-purple-900/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-900/80 dark:text-purple-300">
              Local Vault
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-950 dark:text-purple-100 font-mono tracking-tight my-1.5">
            {totalItems} items
          </div>
          <div className="text-[11px] font-medium text-purple-700/80 dark:text-purple-300/80">
            {storageStats.tasks} tasks · {storageStats.ideas} ideas · {storageStats.learning} courses
          </div>
        </div>

        {/* Metric 4: Platform Engine */}
        <div className="p-5 rounded-2xl border border-amber-200/80 bg-amber-50/90 dark:bg-amber-950/25 dark:border-amber-900/60 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900/80 dark:text-amber-300">
              Theme Mode
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
              {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </div>
          </div>
          <div className="text-2xl font-black text-amber-950 dark:text-amber-100 tracking-tight my-1.5">
            {isDark ? "Obsidian Dark" : "Pure Light"}
          </div>
          <div className="text-[11px] font-medium text-amber-700/80 dark:text-amber-300/80">
            v1.0.0 · Local-First Active
          </div>
        </div>
      </div>

      {/* 2. Full-Width 3-Column Structured Layout (Zero dead margins) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full flex-1 min-h-[460px]">
        {/* Column 1: Account & Profile Management */}
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border/80 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <User className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-textPrimary tracking-tight">
                    Account & Profile
                  </h3>
                  <p className="text-[11px] text-textMuted">Identity and authentication</p>
                </div>
              </div>

              {userProfile.isLoggedIn && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              )}
            </div>

            {userProfile.isLoggedIn ? (
              /* Signed In Profile Card */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-background border border-border flex items-center gap-3.5">
                  {userProfile.avatarUrl ? (
                    <img
                      src={userProfile.avatarUrl}
                      alt={userProfile.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-primary/20 shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
                      {userProfile.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-textPrimary truncate">
                      {userProfile.name}
                    </h4>
                    <p className="text-xs text-textSecondary font-mono truncate">
                      {userProfile.email}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Google OAuth Verified</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-background/50 border border-border/80 space-y-2 text-xs text-textSecondary">
                  <div className="flex justify-between items-center">
                    <span className="text-textMuted">Storage Engine:</span>
                    <span className="font-semibold text-textPrimary font-mono">Supabase Postgres</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-textMuted">Row Security:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Enabled (auth.uid)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-textMuted">Device Target:</span>
                    <span className="font-semibold text-textPrimary">Linux Mint & Android</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Guest Mode Card */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-background border border-border space-y-2">
                  <p className="text-xs text-textSecondary leading-relaxed">
                    You are working in <strong>offline guest mode</strong>. Sign in with Google to enable continuous cloud synchronization with your Android phone.
                  </p>
                </div>

                {authError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                {authMsg && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{authMsg}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isAuthLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-border bg-background hover:bg-surfaceHover text-textPrimary text-xs font-bold shadow-xs hover:border-slate-300 transition active:scale-95 disabled:opacity-60"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowEmailAuth(!showEmailAuth)}
                    className="text-xs text-textMuted hover:text-primary transition underline underline-offset-4"
                  >
                    {showEmailAuth ? "Hide email form" : "Or use email / password"}
                  </button>

                  {showEmailAuth && (
                    <form onSubmit={handleAuth} className="mt-3 space-y-3 pt-3 border-t border-border">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setAuthMode("signin")}
                          className={`text-xs font-semibold px-3 py-1 rounded-lg transition ${
                            authMode === "signin"
                              ? "bg-primary text-white"
                              : "text-textSecondary hover:text-textPrimary"
                          }`}
                        >
                          Sign In
                        </button>
                        <button
                          type="button"
                          onClick={() => setAuthMode("signup")}
                          className={`text-xs font-semibold px-3 py-1 rounded-lg transition ${
                            authMode === "signup"
                              ? "bg-primary text-white"
                              : "text-textSecondary hover:text-textPrimary"
                          }`}
                        >
                          Create Account
                        </button>
                      </div>
                      <input
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="Email address"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        type="password"
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Password"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        type="submit"
                        disabled={isAuthLoading}
                        className="w-full py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
                      >
                        {isAuthLoading ? "Connecting..." : authMode === "signin" ? "Sign In" : "Register"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border/80">
            {userProfile.isLoggedIn ? (
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out of Second Brain</span>
              </button>
            ) : (
              <p className="text-[11px] text-textMuted text-center font-mono">
                Guest sessions persist in browser local storage
              </p>
            )}
          </div>
        </div>

        {/* Column 2: Cloud Sync Engine & Storage Breakdown */}
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border/80 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <RefreshCw className={`w-4.5 h-4.5 ${isSyncing ? "animate-spin" : ""}`} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-textPrimary tracking-tight">
                    Sync Engine
                  </h3>
                  <p className="text-[11px] text-textMuted">Local-first bidirectional sync</p>
                </div>
              </div>

              <button
                onClick={() => syncEngine.sync()}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
              </button>
            </div>

            {/* Sync Status Cards */}
            <div className="space-y-3 mb-5">
              <div className="p-3.5 rounded-xl bg-background border border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      syncState === "synced"
                        ? "bg-emerald-500"
                        : syncState === "syncing"
                        ? "bg-amber-500 animate-pulse"
                        : "bg-slate-400"
                    }`}
                  />
                  <div>
                    <p className="text-xs font-bold text-textPrimary capitalize">
                      {syncMessage || syncState}
                    </p>
                    <p className="text-[10px] text-textMuted">Sync engine status</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-mono font-bold text-textPrimary">
                    {lastSync ? new Date(lastSync).toLocaleTimeString() : "Never"}
                  </p>
                  <p className="text-[10px] text-textMuted font-mono">Last timestamp</p>
                </div>
              </div>
            </div>

            {/* Local Vault Inventory Breakdown */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-textSecondary px-1">
                Local Vault Inventory
              </h4>

              <div className="p-3.5 rounded-xl bg-background border border-border flex items-center justify-between">
                <span className="text-xs font-medium text-textPrimary">Active Tasks & Board</span>
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                  {storageStats.tasks} items
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-background border border-border flex items-center justify-between">
                <span className="text-xs font-medium text-textPrimary">Idea Vault & Sparks</span>
                <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                  {storageStats.ideas} notes
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-background border border-border flex items-center justify-between">
                <span className="text-xs font-medium text-textPrimary">Learning Tracks & Courses</span>
                <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                  {storageStats.learning} tracks
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-background border border-border flex items-center justify-between">
                <span className="text-xs font-medium text-textPrimary">Study Logs Recorded</span>
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {storageStats.sessions} sessions
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/80 flex items-center justify-between text-xs text-textMuted">
            <span className="flex items-center gap-1.5 font-medium">
              <HardDrive className="w-3.5 h-3.5 text-primary" />
              <span>Zero-loss mutation queue</span>
            </span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">100% Offline Ready</span>
          </div>
        </div>

        {/* Column 3: Display Themes, Backups & Brand Spec */}
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border/80 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <Laptop className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-textPrimary tracking-tight">
                    Preferences & Vault
                  </h3>
                  <p className="text-[11px] text-textMuted">Theme styles & portability</p>
                </div>
              </div>
            </div>

            {/* Theme Selector */}
            <div className="space-y-3 mb-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-textSecondary px-1">
                Appearance Style
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => toggleTheme(false)}
                  className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                    !isDark
                      ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                      : "border-border bg-background hover:border-slate-300"
                  }`}
                >
                  <div className="h-10 rounded-lg bg-[#F8FAFC] border border-slate-200 p-1.5 flex flex-col justify-between">
                    <div className="h-1.5 w-10 rounded bg-slate-300" />
                    <div className="h-2 w-full rounded bg-slate-200" />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-bold text-textPrimary flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Light</span>
                    </span>
                    {!isDark && <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => toggleTheme(true)}
                  className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                    isDark
                      ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                      : "border-border bg-background hover:border-slate-300"
                  }`}
                >
                  <div className="h-10 rounded-lg bg-[#0A0D14] border border-[#1E293B] p-1.5 flex flex-col justify-between">
                    <div className="h-1.5 w-10 rounded bg-slate-700" />
                    <div className="h-2 w-full rounded bg-slate-800" />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-bold text-textPrimary flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5 text-blue-400" />
                      <span>Obsidian</span>
                    </span>
                    {isDark && <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />}
                  </div>
                </button>
              </div>
            </div>

            {/* Data Portability */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-textSecondary px-1">
                Data Portability (JSON)
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleExport}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-background hover:bg-surfaceHover text-xs font-bold text-textPrimary border border-border transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
                  <span>Export JSON</span>
                </button>

                <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-border bg-background hover:bg-surfaceHover text-xs font-bold text-textPrimary cursor-pointer transition active:scale-95">
                  <Upload className="w-3.5 h-3.5 text-amber-500" />
                  <span>Restore JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* About / Wordmark Tile */}
          <div className="mt-5 rounded-2xl border border-[#1E293B] bg-[#0A0D14] p-4 flex items-center justify-between text-white shadow-sm">
            <BrandWordmark size="md" subtitle="Offline-First OS" />
            <div className="text-right text-[11px] font-mono text-[#64748B]">
              <p className="text-white font-bold">Second Brain</p>
              <p className="text-emerald-400 mt-0.5">● Linux & Android</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
