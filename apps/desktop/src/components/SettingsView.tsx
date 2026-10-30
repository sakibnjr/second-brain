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
    setStorageStats({
      tasks: Storage.getTasks().length,
      ideas: Storage.getIdeas().length,
      learning: Storage.getLearningResources().length,
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

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 min-h-0">
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Account & Authentication */}
        <div className="space-y-6">
          {/* Account Profile Card */}
          <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-border/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-textPrimary tracking-tight">
                    Account & Profile
                  </h3>
                  <p className="text-[11px] text-textMuted">
                    {userProfile.isLoggedIn ? "Cloud connected" : "Local guest mode"}
                  </p>
                </div>
              </div>

              {userProfile.isLoggedIn && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Google Verified</span>
                </span>
              )}
            </div>

            {userProfile.isLoggedIn ? (
              /* Signed In Profile State */
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-background border border-border">
                  {userProfile.avatarUrl ? (
                    <img
                      src={userProfile.avatarUrl}
                      alt={userProfile.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-primary/20 shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
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
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Sync active across Linux & Android</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-textMuted">
                    Signed in via Google OAuth
                  </p>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition active:scale-95"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Guest / Sign-In State */
              <div className="space-y-4">
                <p className="text-xs text-textSecondary leading-relaxed">
                  Sign in with your Google account to automatically synchronize all your tasks, ideas, and learning tracks with your Android phone.
                </p>

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

                {/* Google Sign-in Primary Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isAuthLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-border bg-background hover:bg-surfaceHover text-textPrimary text-xs font-bold shadow-xs hover:border-slate-300 transition active:scale-98 disabled:opacity-60"
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

                {/* Collapsible Email Login for developers / custom auth */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEmailAuth(!showEmailAuth)}
                    className="text-xs text-textMuted hover:text-primary transition underline underline-offset-4"
                  >
                    {showEmailAuth ? "Hide email login" : "Or sign in with email and password"}
                  </button>

                  {showEmailAuth && (
                    <form onSubmit={handleAuth} className="mt-3 space-y-3 pt-3 border-t border-border/80">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setAuthMode("signin")}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
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
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
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
                        {isAuthLoading ? "Processing..." : authMode === "signin" ? "Sign In" : "Register"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme & Appearance Card */}
          <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-textPrimary tracking-tight">
                    Appearance & Theme
                  </h3>
                  <p className="text-[11px] text-textMuted">
                    Customize your interface style
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Light Theme Card */}
              <button
                type="button"
                onClick={() => toggleTheme(false)}
                className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                  !isDark
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-border bg-background hover:border-slate-300"
                }`}
              >
                <div className="h-14 rounded-lg bg-[#F8FAFC] border border-slate-200 p-2 flex flex-col justify-between">
                  <div className="h-2 w-12 rounded bg-slate-300" />
                  <div className="flex gap-1.5">
                    <div className="h-4 w-4 rounded bg-blue-500/30" />
                    <div className="h-4 flex-1 rounded bg-slate-200" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-textPrimary">Light</span>
                  </div>
                  {!isDark && (
                    <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              </button>

              {/* Dark Theme Card */}
              <button
                type="button"
                onClick={() => toggleTheme(true)}
                className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                  isDark
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-border bg-background hover:border-slate-300"
                }`}
              >
                <div className="h-14 rounded-lg bg-[#0A0D14] border border-[#1E293B] p-2 flex flex-col justify-between">
                  <div className="h-2 w-12 rounded bg-slate-700" />
                  <div className="flex gap-1.5">
                    <div className="h-4 w-4 rounded bg-blue-500/40" />
                    <div className="h-4 flex-1 rounded bg-slate-800" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-textPrimary">Obsidian Dark</span>
                  </div>
                  {isDark && (
                    <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Sync Engine & Data Management */}
        <div className="space-y-6">
          {/* Cloud Sync Status Card */}
          <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-textPrimary tracking-tight">
                    Sync & Storage
                  </h3>
                  <p className="text-[11px] text-textMuted">
                    Local-first continuous replication
                  </p>
                </div>
              </div>

              <button
                onClick={() => syncEngine.sync()}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
              </button>
            </div>

            {/* Sync Metadata Tiles */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-background border border-border">
                <span className="text-[11px] text-textMuted font-medium block">
                  Replication Status
                </span>
                <span className="text-xs font-bold text-textPrimary capitalize flex items-center gap-1.5 mt-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      syncState === "synced"
                        ? "bg-emerald-500"
                        : syncState === "syncing"
                        ? "bg-amber-500 animate-pulse"
                        : "bg-slate-400"
                    }`}
                  />
                  <span>{syncMessage || syncState}</span>
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-background border border-border">
                <span className="text-[11px] text-textMuted font-medium block">
                  Last Synced At
                </span>
                <span className="text-xs font-bold text-textPrimary mt-1 block">
                  {lastSync ? new Date(lastSync).toLocaleTimeString() : "Never"}
                </span>
              </div>
            </div>

            {/* Local Storage Footprint */}
            <div className="p-4 rounded-xl bg-background border border-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-textSecondary font-medium">
                <Database className="w-4 h-4 text-primary" />
                <span>Local Data Footprint</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] text-textMuted">
                <span>{storageStats.tasks} tasks</span>
                <span>•</span>
                <span>{storageStats.ideas} ideas</span>
                <span>•</span>
                <span>{storageStats.learning} courses</span>
              </div>
            </div>
          </div>

          {/* Data Backup & Restore */}
          <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-textPrimary tracking-tight">
                    Data Portability & Backup
                  </h3>
                  <p className="text-[11px] text-textMuted">
                    Own your data without vendor lock-in
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-textSecondary leading-relaxed">
              Export an unencrypted JSON backup of all your notes, tasks, and study records. You can restore it anytime or migrate between machines.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surfaceHover hover:bg-border text-xs font-bold text-textPrimary border border-border transition active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-primary" />
                <span>Export JSON</span>
              </button>

              <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surfaceHover text-xs font-bold text-textPrimary cursor-pointer transition active:scale-95">
                <Upload className="w-3.5 h-3.5 text-amber-500" />
                <span>Restore Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* About Second Brain */}
          <div className="rounded-2xl border border-[#1E293B] bg-[#0A0D14] p-5 flex items-center justify-between text-white shadow-sm">
            <BrandWordmark size="md" subtitle="Local-First Productivity OS" />
            <div className="text-right text-[11px] font-mono text-[#64748B]">
              <p className="text-white font-bold">Second Brain v1.0.0</p>
              <p className="text-emerald-400 mt-0.5">● Offline Engine Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
