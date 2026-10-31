import { supabase } from "./supabase";
import { Storage } from "./storage";
import { reminderScheduler } from "./reminderScheduler";
import { Task, Idea, LearningResource, StudySession } from "@planner/contracts";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type SyncState = "idle" | "syncing" | "synced" | "offline" | "error";

class SyncEngine {
  private isRunning = false;
  private listeners: ((state: SyncState, message?: string) => void)[] = [];
  public currentState: SyncState = "idle";
  public lastError: string | null = null;
  private pollTimer: number | null = null;
  private realtimeChannel: RealtimeChannel | null = null;
  private currentUserId: string | null = null;

  public subscribe(cb: (state: SyncState, message?: string) => void) {
    this.listeners.push(cb);
    cb(this.currentState, this.lastError || undefined);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify(state: SyncState, message?: string) {
    this.currentState = state;
    this.lastError = message || null;
    this.listeners.forEach((l) => l(state, message));
  }

  public init() {
    this.startAutoSync();
    // Whenever local storage changes and has pending mutations, push immediately
    Storage.subscribe(() => {
      if (Storage.getMutationQueue().length > 0 && !this.isRunning) {
        this.sync();
      }
    });
  }

  public startAutoSync() {
    if (this.pollTimer !== null) return;

    // 1. Initial sync
    this.sync();

    // 2. Fast background polling (every 6 seconds)
    this.pollTimer = window.setInterval(() => {
      if (navigator.onLine && !this.isRunning) {
        this.sync();
      }
    }, 6000);

    // 3. Sync on window focus and online event
    if (typeof window !== "undefined") {
      window.addEventListener("focus", () => this.sync());
      window.addEventListener("online", () => this.sync());
    }
  }

  public stopAutoSync() {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  private setupRealtime(userId: string) {
    if (this.currentUserId === userId && this.realtimeChannel) return;
    this.currentUserId = userId;

    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
    }

    try {
      this.realtimeChannel = supabase
        .channel(`sync-realtime-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${userId}` },
          () => { this.sync(); }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "ideas", filter: `user_id=eq.${userId}` },
          () => { this.sync(); }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "learning_resources", filter: `user_id=eq.${userId}` },
          () => { this.sync(); }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "study_sessions", filter: `user_id=eq.${userId}` },
          () => { this.sync(); }
        )
        .subscribe();
    } catch (e) {
      console.warn("Failed to subscribe to Supabase Realtime:", e);
    }
  }

  public async sync(): Promise<{ success: boolean; error?: string }> {
    if (this.isRunning) return { success: true };
    this.isRunning = true;
    this.notify("syncing", "Synchronizing with Supabase...");

    try {
      // 1. Check network
      if (!navigator.onLine) {
        this.notify("offline", "Device is offline. Changes saved locally.");
        this.isRunning = false;
        return { success: false, error: "Offline" };
      }

      // 2. Check Auth session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session || !session.user) {
        this.notify(
          "offline",
          "Working in offline guest mode. Sign in to sync with cloud."
        );
        this.isRunning = false;
        return { success: false, error: "Not authenticated" };
      }

      const userId = session.user.id;
      this.setupRealtime(userId);

      // 3. Push pending mutations
      const queue = Storage.getMutationQueue();
      for (const item of queue) {
        try {
          const payload = JSON.parse(item.payload_json);
          payload.user_id = userId; // Bind to current user

          if (item.entity_type === "task") {
            await supabase
              .from("tasks")
              .upsert({ ...payload, user_id: userId });
          } else if (item.entity_type === "idea") {
            await supabase
              .from("ideas")
              .upsert({ ...payload, user_id: userId });
          } else if (item.entity_type === "learning_resource") {
            await supabase
              .from("learning_resources")
              .upsert({ ...payload, user_id: userId });
          } else if (item.entity_type === "study_session") {
            await supabase
              .from("study_sessions")
              .upsert({ ...payload, user_id: userId });
          }

          Storage.removeMutation(item.id);
        } catch (pushErr: any) {
          console.error("Mutation push error for item:", item, pushErr);
        }
      }

      // 4. Pull remote changes from Supabase
      const lastSync = Storage.getLastSyncTime();
      let queryTasks = supabase.from("tasks").select("*").eq("user_id", userId);
      let queryIdeas = supabase.from("ideas").select("*").eq("user_id", userId);
      let queryLearning = supabase
        .from("learning_resources")
        .select("*")
        .eq("user_id", userId);
      let querySessions = supabase
        .from("study_sessions")
        .select("*")
        .eq("user_id", userId);

      if (lastSync) {
        queryTasks = queryTasks.gt("updated_at", lastSync);
        queryIdeas = queryIdeas.gt("updated_at", lastSync);
        queryLearning = queryLearning.gt("updated_at", lastSync);
        querySessions = querySessions.gt("updated_at", lastSync);
      }

      const [resTasks, resIdeas, resLearning, resSessions] = await Promise.all([
        queryTasks,
        queryIdeas,
        queryLearning,
        querySessions,
      ]);

      let hasPulledUpdates = false;

      if (resTasks.data && resTasks.data.length > 0) {
        resTasks.data.forEach((remoteTask: Task) => {
          Storage.saveTask(remoteTask, false);
        });
        hasPulledUpdates = true;
      }

      if (resIdeas.data && resIdeas.data.length > 0) {
        resIdeas.data.forEach((remoteIdea: Idea) => {
          Storage.saveIdea(remoteIdea, false);
        });
        hasPulledUpdates = true;
      }

      if (resLearning.data && resLearning.data.length > 0) {
        resLearning.data.forEach((remoteRes: LearningResource) => {
          Storage.saveLearningResource(remoteRes, false);
        });
        hasPulledUpdates = true;
      }

      if (resSessions.data && resSessions.data.length > 0) {
        resSessions.data.forEach((remoteSession: StudySession) => {
          Storage.saveStudySession(remoteSession, false);
        });
        hasPulledUpdates = true;
      }

      if (hasPulledUpdates) {
        Storage.notifyChange();
      }

      const now = new Date().toISOString();
      Storage.setLastSyncTime(now);
      reminderScheduler.checkDueReminders().catch(() => {});
      this.notify("synced", `Synced at ${new Date().toLocaleTimeString()}`);
      this.isRunning = false;
      return { success: true };
    } catch (err: any) {
      console.error("Sync error:", err);
      this.notify("error", err.message || "Failed to sync with Supabase");
      this.isRunning = false;
      return { success: false, error: err.message };
    }
  }
}

export const syncEngine = new SyncEngine();
