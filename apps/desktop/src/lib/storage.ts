import {
  Task,
  Idea,
  LearningResource,
  StudySession,
  MutationQueueItem,
} from "@planner/contracts";

const TASKS_KEY = "planner_tasks";
const IDEAS_KEY = "planner_ideas";
const LEARNING_KEY = "planner_learning_resources";
const SESSIONS_KEY = "planner_study_sessions";
const QUEUE_KEY = "planner_mutation_queue";
const LAST_SYNC_KEY = "planner_last_sync_time";

const storageListeners: Array<() => void> = [];

export function notifyStorageChange(): void {
  storageListeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("planner_storage_changed"));
  }
}

function getLocal<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.error(`Failed to read ${key} from storage:`, e);
    return defaultValue;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to write ${key} to storage:`, e);
  }
}

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const Storage = {
  // --- Tasks ---
  getTasks(): Task[] {
    const all = getLocal<Task[]>(TASKS_KEY, []);
    return all.filter((t) => !t.deleted_at);
  },

  getAllTasksIncludingDeleted(): Task[] {
    return getLocal<Task[]>(TASKS_KEY, []);
  },

  saveTask(task: Task, queueMutation = true): Task {
    const tasks = getLocal<Task[]>(TASKS_KEY, []);
    const idx = tasks.findIndex((t) => t.id === task.id);
    const now = new Date().toISOString();
    const updated = {
      ...task,
      updated_at: now,
      version: (task.version || 1) + (idx >= 0 ? 1 : 0),
    };

    if (idx >= 0) {
      tasks[idx] = updated;
    } else {
      tasks.unshift(updated);
    }
    setLocal(TASKS_KEY, tasks);

    if (queueMutation) {
      this.enqueueMutation({
        id: generateUUID(),
        entity_type: "task",
        entity_id: updated.id,
        operation: idx >= 0 ? "update" : "insert",
        payload_json: JSON.stringify(updated),
        client_timestamp: now,
        status: "pending",
        retry_count: 0,
      });
    }

    notifyStorageChange();
    return updated;
  },

  deleteTask(id: string): void {
    const tasks = getLocal<Task[]>(TASKS_KEY, []);
    const target = tasks.find((t) => t.id === id);
    if (!target) return;

    const now = new Date().toISOString();
    target.deleted_at = now;
    target.updated_at = now;
    setLocal(TASKS_KEY, tasks);

    this.enqueueMutation({
      id: generateUUID(),
      entity_type: "task",
      entity_id: id,
      operation: "delete",
      payload_json: JSON.stringify(target),
      client_timestamp: now,
      status: "pending",
      retry_count: 0,
    });

    notifyStorageChange();
  },

  // --- Ideas ---
  getIdeas(): Idea[] {
    const all = getLocal<Idea[]>(IDEAS_KEY, []);
    return all.filter((i) => !i.deleted_at);
  },

  getAllIdeasIncludingDeleted(): Idea[] {
    return getLocal<Idea[]>(IDEAS_KEY, []);
  },

  saveIdea(idea: Idea, queueMutation = true): Idea {
    const ideas = getLocal<Idea[]>(IDEAS_KEY, []);
    const idx = ideas.findIndex((i) => i.id === idea.id);
    const now = new Date().toISOString();
    const updated = {
      ...idea,
      updated_at: now,
      version: (idea.version || 1) + (idx >= 0 ? 1 : 0),
    };

    if (idx >= 0) {
      ideas[idx] = updated;
    } else {
      ideas.unshift(updated);
    }
    setLocal(IDEAS_KEY, ideas);

    if (queueMutation) {
      this.enqueueMutation({
        id: generateUUID(),
        entity_type: "idea",
        entity_id: updated.id,
        operation: idx >= 0 ? "update" : "insert",
        payload_json: JSON.stringify(updated),
        client_timestamp: now,
        status: "pending",
        retry_count: 0,
      });
    }

    notifyStorageChange();
    return updated;
  },

  deleteIdea(id: string): void {
    const ideas = getLocal<Idea[]>(IDEAS_KEY, []);
    const target = ideas.find((i) => i.id === id);
    if (!target) return;

    const now = new Date().toISOString();
    target.deleted_at = now;
    target.updated_at = now;
    setLocal(IDEAS_KEY, ideas);

    this.enqueueMutation({
      id: generateUUID(),
      entity_type: "idea",
      entity_id: id,
      operation: "delete",
      payload_json: JSON.stringify(target),
      client_timestamp: now,
      status: "pending",
      retry_count: 0,
    });

    notifyStorageChange();
  },

  // --- Learning Resources ---
  getLearningResources(): LearningResource[] {
    const all = getLocal<LearningResource[]>(LEARNING_KEY, []);
    return all.filter((r) => !r.deleted_at);
  },

  saveLearningResource(
    resource: LearningResource,
    queueMutation = true
  ): LearningResource {
    const list = getLocal<LearningResource[]>(LEARNING_KEY, []);
    const idx = list.findIndex((r) => r.id === resource.id);
    const now = new Date().toISOString();
    const updated = {
      ...resource,
      updated_at: now,
      version: (resource.version || 1) + (idx >= 0 ? 1 : 0),
    };

    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.unshift(updated);
    }
    setLocal(LEARNING_KEY, list);

    if (queueMutation) {
      this.enqueueMutation({
        id: generateUUID(),
        entity_type: "learning_resource",
        entity_id: updated.id,
        operation: idx >= 0 ? "update" : "insert",
        payload_json: JSON.stringify(updated),
        client_timestamp: now,
        status: "pending",
        retry_count: 0,
      });
    }

    notifyStorageChange();
    return updated;
  },

  deleteLearningResource(id: string): void {
    const list = getLocal<LearningResource[]>(LEARNING_KEY, []);
    const target = list.find((r) => r.id === id);
    if (!target) return;

    const now = new Date().toISOString();
    target.deleted_at = now;
    target.updated_at = now;
    setLocal(LEARNING_KEY, list);

    this.enqueueMutation({
      id: generateUUID(),
      entity_type: "learning_resource",
      entity_id: id,
      operation: "delete",
      payload_json: JSON.stringify(target),
      client_timestamp: now,
      status: "pending",
      retry_count: 0,
    });

    notifyStorageChange();
  },

  // --- Study Sessions ---
  getStudySessions(resourceId?: string): StudySession[] {
    const all = getLocal<StudySession[]>(SESSIONS_KEY, []);
    const nonDeleted = all.filter((s) => !s.deleted_at);
    return resourceId
      ? nonDeleted.filter((s) => s.resource_id === resourceId)
      : nonDeleted;
  },

  saveStudySession(session: StudySession, queueMutation = true): StudySession {
    const list = getLocal<StudySession[]>(SESSIONS_KEY, []);
    const idx = list.findIndex((s) => s.id === session.id);
    const now = new Date().toISOString();
    const updated = {
      ...session,
      updated_at: now,
      version: (session.version || 1) + (idx >= 0 ? 1 : 0),
    };

    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.unshift(updated);
    }
    setLocal(SESSIONS_KEY, list);

    if (queueMutation) {
      this.enqueueMutation({
        id: generateUUID(),
        entity_type: "study_session",
        entity_id: updated.id,
        operation: idx >= 0 ? "update" : "insert",
        payload_json: JSON.stringify(updated),
        client_timestamp: now,
        status: "pending",
        retry_count: 0,
      });
    }

    notifyStorageChange();
    return updated;
  },

  // --- Mutation Queue ---
  getMutationQueue(): MutationQueueItem[] {
    return getLocal<MutationQueueItem[]>(QUEUE_KEY, []);
  },

  enqueueMutation(item: MutationQueueItem): void {
    const queue = getLocal<MutationQueueItem[]>(QUEUE_KEY, []);
    queue.push(item);
    setLocal(QUEUE_KEY, queue);
  },

  removeMutation(id: string): void {
    const queue = getLocal<MutationQueueItem[]>(QUEUE_KEY, []);
    const filtered = queue.filter((m) => m.id !== id);
    setLocal(QUEUE_KEY, filtered);
  },

  clearQueue(): void {
    setLocal(QUEUE_KEY, []);
  },

  // --- Sync metadata ---
  getLastSyncTime(): string | null {
    return localStorage.getItem(LAST_SYNC_KEY);
  },

  setLastSyncTime(time: string): void {
    localStorage.setItem(LAST_SYNC_KEY, time);
  },

  // --- Reactive subscription ---
  subscribe(callback: () => void): () => void {
    storageListeners.push(callback);
    return () => {
      const idx = storageListeners.indexOf(callback);
      if (idx >= 0) storageListeners.splice(idx, 1);
    };
  },

  notifyChange(): void {
    notifyStorageChange();
  },

  // --- Export / Import ---
  exportAllData() {
    return {
      tasks: this.getAllTasksIncludingDeleted(),
      ideas: this.getAllIdeasIncludingDeleted(),
      learning_resources: this.getLearningResources(),
      study_sessions: this.getStudySessions(),
      mutation_queue: this.getMutationQueue(),
      exported_at: new Date().toISOString(),
    };
  },

  importData(data: any) {
    if (data.tasks) setLocal(TASKS_KEY, data.tasks);
    if (data.ideas) setLocal(IDEAS_KEY, data.ideas);
    if (data.learning_resources) setLocal(LEARNING_KEY, data.learning_resources);
    if (data.study_sessions) setLocal(SESSIONS_KEY, data.study_sessions);
    if (data.mutation_queue) setLocal(QUEUE_KEY, data.mutation_queue);
    notifyStorageChange();
  },
};
