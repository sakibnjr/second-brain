import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Storage } from "../lib/storage";
import { syncEngine, SyncState } from "../lib/syncEngine";
import { BrandWordmark } from "./BrandWordmark";
import {
  User,
  LogOut,
  RefreshCw,
  Download,
  Upload,
  Moon,
  Sun,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export function SettingsView() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMsg, setAuthMsg] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);

  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email || "Authenticated User");
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUserEmail(session.user.email || "Authenticated User");
          syncEngine.sync();
        } else {
          setUserEmail(null);
        }
      }
    );

    setLastSync(Storage.getLastSyncTime());

    const unsub = syncEngine.subscribe((state, msg) => {
      setSyncState(state);
      if (msg) setSyncMessage(msg);
      setLastSync(Storage.getLastSyncTime());
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

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
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
          setUserEmail(data.user.email || null);
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
          setUserEmail(data.user.email || null);
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
    setUserEmail(null);
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

  return (
    <div className="space-y-6 w-full max-w-none">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-textPrimary">
          Settings & Account
        </h2>
        <p className="text-xs text-textSecondary mt-0.5">
          Manage your cloud sync account, theme preferences, and data backups.
        </p>
      </div>

      {/* Supabase Account Card */}
      <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-textPrimary">
                Supabase Cloud Sync Account
              </h3>
              <p className="text-xs text-textSecondary font-mono">
                Project Ref: ipfczdqmbjaiwfrdxupl
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>RLS Protected</span>
            </span>
          </div>
        </div>

        {userEmail ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-background border border-border">
            <div>
              <span className="text-xs text-textMuted">Signed in as:</span>
              <p className="text-sm font-semibold text-textPrimary">{userEmail}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs font-semibold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 max-w-md pt-2">
            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isAuthLoading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-border bg-background hover:bg-surfaceHover text-textPrimary text-xs font-semibold shadow-sm transition disabled:opacity-50"
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

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] uppercase tracking-wider text-textMuted font-mono">
                or with email
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setAuthMode("signin")}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
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
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                  authMode === "signup"
                    ? "bg-primary text-white"
                    : "text-textSecondary hover:text-textPrimary"
                }`}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authMsg && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{authMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-textSecondary mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-textPrimary text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-textSecondary mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-textPrimary text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={isAuthLoading}
              className="w-full py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              {isAuthLoading
                ? "Connecting..."
                : authMode === "signin"
                ? "Sign In to Supabase"
                : "Create Free Account"}
            </button>
          </form>
        </div>
        )}
      </div>

      {/* Sync Status Card */}
      <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-textPrimary">Sync Controls</h3>
          </div>

          <button
            onClick={() => syncEngine.sync()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                syncState === "syncing" ? "animate-spin" : ""
              }`}
            />
            <span>Sync Now</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-background border border-border">
            <span className="text-textMuted block text-[11px]">Sync Status:</span>
            <span className="font-semibold text-textPrimary capitalize">
              {syncMessage || syncState}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-background border border-border">
            <span className="text-textMuted block text-[11px]">Last Synced:</span>
            <span className="font-semibold text-textPrimary">
              {lastSync ? new Date(lastSync).toLocaleTimeString() : "Never"}
            </span>
          </div>
        </div>
      </div>

      {/* Theme & Preferences */}
      <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-textPrimary">Appearance</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-textPrimary">Theme</p>
            <p className="text-xs text-textSecondary">
              Switch between light and dark visual themes.
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold text-textPrimary hover:bg-surfaceHover transition"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-blue-500" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Data Backup & Export */}
      <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-textPrimary">Data Backup</h3>
        <p className="text-xs text-textSecondary">
          Export an offline JSON backup of all your tasks, ideas, and learning records.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surfaceHover hover:bg-border text-xs font-semibold text-textPrimary transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON Backup</span>
          </button>

          <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border hover:bg-surfaceHover text-xs font-semibold text-textPrimary cursor-pointer transition">
            <Upload className="w-3.5 h-3.5" />
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
      <div className="p-6 rounded-2xl border border-border bg-surface shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <BrandWordmark size="md" subtitle="Offline-First Personal Operating System" />
        <div className="sm:text-right font-mono text-[11px] text-textMuted">
          <p>Second Brain v1.0.0 (Local-First)</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">● Linux & Android Sync Active</p>
        </div>
      </div>
    </div>
  );
}
