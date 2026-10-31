import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { Storage } from "./storage";
import { Task } from "@planner/contracts";

const FIRED_REMINDERS_KEY = "planner_fired_reminders";

function getFiredMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(FIRED_REMINDERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function markFired(key: string): void {
  try {
    const map = getFiredMap();
    map[key] = new Date().toISOString();
    localStorage.setItem(FIRED_REMINDERS_KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
}

class ReminderScheduler {
  private intervalId: number | null = null;
  private permissionChecked = false;

  public async ensurePermission(): Promise<boolean> {
    try {
      // Try Tauri native notification plugin first
      let granted = await isPermissionGranted();
      if (!granted) {
        const permission = await requestPermission();
        granted = permission === "granted";
      }
      this.permissionChecked = true;
      return granted;
    } catch {
      // Fallback for standard Web Notification API when running in browser dev mode
      if (typeof window !== "undefined" && "Notification" in window) {
        if (window.Notification.permission === "granted") {
          this.permissionChecked = true;
          return true;
        }
        if (window.Notification.permission !== "denied") {
          const perm = await window.Notification.requestPermission();
          this.permissionChecked = true;
          return perm === "granted";
        }
      }
      return false;
    }
  }

  public async notify(title: string, body: string): Promise<void> {
    try {
      const granted = await this.ensurePermission();
      if (!granted) return;

      try {
        sendNotification({
          title,
          body,
        });
        return;
      } catch {
        // Fallback to Web Notification API
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          window.Notification.permission === "granted"
        ) {
          new window.Notification(title, { body });
        }
      }
    } catch (err) {
      console.error("Failed to dispatch notification:", err);
    }
  }

  public async checkDueReminders(): Promise<void> {
    const tasks: Task[] = Storage.getTasks();
    const now = Date.now();
    const firedMap = getFiredMap();

    for (const task of tasks) {
      if (task.status === "completed" || task.deleted_at) continue;

      // 1. Explicit reminder_at check
      if (task.reminder_at) {
        const remindTime = new Date(task.reminder_at).getTime();
        const fireKey = `reminder_${task.id}_${task.reminder_at}`;

        if (!isNaN(remindTime) && remindTime <= now && !firedMap[fireKey]) {
          markFired(fireKey);
          const priorityTag =
            task.priority === "high" ? " [HIGH PRIORITY]" : "";
          await this.notify(
            `⏰ Reminder: ${task.title}${priorityTag}`,
            task.description ||
              (task.due_at
                ? `Due: ${new Date(task.due_at).toLocaleDateString()}`
                : "Scheduled task reminder from Second Brain.")
          );
        }
      }
    }
  }

  public start(): void {
    if (this.intervalId !== null) return;

    if (!this.permissionChecked) {
      this.ensurePermission().catch(() => {});
    }

    // Immediate check on startup
    this.checkDueReminders().catch(() => {});

    // Check every 15 seconds
    this.intervalId = window.setInterval(() => {
      this.checkDueReminders().catch(() => {});
    }, 15000);
  }

  public stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const reminderScheduler = new ReminderScheduler();
