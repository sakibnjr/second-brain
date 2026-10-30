import { z } from "zod";

/**
 * Common metadata schema for all synchronizable entities.
 * UUIDs are client-generated (v4) to enable full offline creation.
 * Timestamps are ISO-8601 UTC strings.
 */
export const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable().optional(), // Tombstone for soft deletes
  version: z.number().int().nonnegative().default(1),
});

export type BaseEntity = z.infer<typeof BaseEntitySchema>;

/* -------------------------------------------------------------------------- */
/*                                   TASKS                                    */
/* -------------------------------------------------------------------------- */

export const TaskStatusSchema = z.enum(["todo", "in_progress", "completed"]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskPrioritySchema = z.enum(["low", "medium", "high"]);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskSchema = BaseEntitySchema.extend({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(10000).optional().nullable(),
  status: TaskStatusSchema.default("todo"),
  priority: TaskPrioritySchema.default("medium"),
  due_at: z.string().datetime().optional().nullable(),
  reminder_at: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).default([]),
});

export type Task = z.infer<typeof TaskSchema>;

/* -------------------------------------------------------------------------- */
/*                                   IDEAS                                    */
/* -------------------------------------------------------------------------- */

export const IdeaSchema = BaseEntitySchema.extend({
  title: z.string().min(1, "Title is required").max(500),
  content: z.string().max(50000).default(""),
  archived_at: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).default([]),
});

export type Idea = z.infer<typeof IdeaSchema>;

/* -------------------------------------------------------------------------- */
/*                             LEARNING TRACKER                               */
/* -------------------------------------------------------------------------- */

export const LearningStatusSchema = z.enum([
  "planned",
  "in_progress",
  "completed",
  "paused",
]);
export type LearningStatus = z.infer<typeof LearningStatusSchema>;

export const LearningResourceSchema = BaseEntitySchema.extend({
  title: z.string().min(1, "Title is required").max(500),
  url: z.string().url().optional().nullable().or(z.literal("")),
  provider: z.string().max(200).optional().nullable(),
  status: LearningStatusSchema.default("planned"),
  progress_percent: z.number().min(0).max(100).default(0),
  notes: z.string().max(50000).optional().nullable(),
});

export type LearningResource = z.infer<typeof LearningResourceSchema>;

export const StudySessionSchema = BaseEntitySchema.extend({
  resource_id: z.string().uuid(),
  started_at: z.string().datetime(),
  duration_minutes: z.number().int().positive(),
  notes: z.string().max(10000).optional().nullable(),
});

export type StudySession = z.infer<typeof StudySessionSchema>;

/* -------------------------------------------------------------------------- */
/*                                 REMINDERS                                  */
/* -------------------------------------------------------------------------- */

export const ReminderStatusSchema = z.enum(["pending", "fired", "dismissed"]);
export type ReminderStatus = z.infer<typeof ReminderStatusSchema>;

export const ReminderSchema = BaseEntitySchema.extend({
  task_id: z.string().uuid(),
  remind_at: z.string().datetime(),
  status: ReminderStatusSchema.default("pending"),
});

export type Reminder = z.infer<typeof ReminderSchema>;
