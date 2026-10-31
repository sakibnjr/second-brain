import { supabase } from "./supabase";
import { Storage } from "./storage";
import { reminderScheduler } from "./reminderScheduler";
import { Task, Idea, LearningResource, StudySession } from "@planner/contracts";

export type SyncState = "idle" | "syncing" | "synced" | "offline" | "error";

class SyncEngine {
  private isRunning = false;
  private listeners: ((state: SyncState, message?: string) => void)[] = [];
  public currentState: SyncState = "idle";
  public lastError: string | null = null;

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

      // 3. Push pending mutations
      const queue = Storage.getMutationQueue();
      for (const item of queue) {
        try {
          const payload = JSON.parse(item.payload_json);
          payload.user_id = userId; // Bind to current user

          if (item.entity_type === "task") {
            if (item.operation === "delete" || payload.deleted_at) {
              await supabase
                .from("tasks")
                .upsert({ ...payload, user_id: userId });
            } else {
              await supabase
                .from("tasks")
                .upsert({ ...payload, user_id: userId });
            }
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

      if (resTasks.data) {
        resTasks.data.forEach((remoteTask: Task) => {
          Storage.saveTask(remoteTask, false);
        });
      }

      if (resIdeas.data) {
        resIdeas.data.forEach((remoteIdea: Idea) => {
          Storage.saveIdea(remoteIdea, false);
        });
      }

      if (resLearning.data) {
        resLearning.data.forEach((remoteRes: LearningResource) => {
          Storage.saveLearningResource(remoteRes, false);
        });
      }

      if (resSessions.data) {
        resSessions.data.forEach((remoteSession: StudySession) => {
          Storage.saveStudySession(remoteSession, false);
        });
      }

      const now = new Date().toISOString();
      Storage.setLastSyncTime(now);
      reminderScheduler.checkDueReminders().catch(() => {});
      this.notify("synced", `Synced successfully at ${new Date().toLocaleTimeString()}`);
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
