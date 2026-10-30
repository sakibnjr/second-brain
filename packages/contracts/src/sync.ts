import { z } from "zod";

export const EntityTypeSchema = z.enum([
  "task",
  "idea",
  "learning_resource",
  "study_session",
  "reminder",
]);
export type EntityType = z.infer<typeof EntityTypeSchema>;

export const SyncOperationTypeSchema = z.enum(["insert", "update", "delete"]);
export type SyncOperationType = z.infer<typeof SyncOperationTypeSchema>;

export const SyncStatusSchema = z.enum([
  "pending", // Saved locally, awaiting sync
  "syncing", // Currently in-flight to Supabase
  "synced",  // Confirmed synced by server
  "failed",  // Sync failed, queued for retry with backoff
]);
export type SyncStatus = z.infer<typeof SyncStatusSchema>;

/**
 * Durable pending change queue entry schema (stored in SQLite on Desktop and Room on Android).
 */
export const MutationQueueItemSchema = z.object({
  id: z.string().uuid(),
  entity_type: EntityTypeSchema,
  entity_id: z.string().uuid(),
  operation: SyncOperationTypeSchema,
  payload_json: z.string(), // Serialized entity JSON
  client_timestamp: z.string().datetime(),
  status: SyncStatusSchema.default("pending"),
  retry_count: z.number().int().nonnegative().default(0),
  last_error: z.string().nullable().optional(),
});

export type MutationQueueItem = z.infer<typeof MutationQueueItemSchema>;

/**
 * Batch sync push payload sent from client to server.
 */
export const SyncPushPayloadSchema = z.object({
  client_id: z.string(),
  mutations: z.array(MutationQueueItemSchema),
});

export type SyncPushPayload = z.infer<typeof SyncPushPayloadSchema>;

/**
 * Sync pull response from server to client.
 */
export const SyncPullResponseSchema = z.object({
  server_timestamp: z.string().datetime(),
  changes: z.object({
    tasks: z.array(z.record(z.any())),
    ideas: z.array(z.record(z.any())),
    learning_resources: z.array(z.record(z.any())),
    study_sessions: z.array(z.record(z.any())),
    reminders: z.array(z.record(z.any())),
  }),
});

export type SyncPullResponse = z.infer<typeof SyncPullResponseSchema>;
