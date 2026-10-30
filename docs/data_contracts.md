# Shared Data Contracts Specification

Version: 1.0  
Status: Active  
Applies to: Linux Desktop (Tauri + SQLite) & Android (Kotlin + Room) & Cloud (Supabase PostgreSQL)

---

## 1. Core Principles

1. **Client-Generated UUIDs (v4):** All entities generate their primary key on the client upon creation to support 100% offline creation without ID collisions.
2. **Standard UTC Timestamps:** All dates and times are stored and transmitted as ISO-8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`).
3. **Soft Deletions (Tombstones):** Records are never hard-deleted immediately on clients; instead, `deleted_at` is populated. Tombstones propagate across sync boundaries to ensure deletion on all client devices.
4. **Optimistic Versioning:** An incremental integer `version` field tracks mutations for collision detection and deterministic reconciliation.

---

## 2. Entity Schemas

### 2.1 Tasks (`tasks`)

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | UUID | Yes | Client-generated record ID |
| `user_id` | UUID | No | Supabase Auth user ID (null when offline/unauthenticated) |
| `title` | Text (1-500) | Yes | Name of the task |
| `description` | Text | No | Detailed markdown notes |
| `status` | Enum | Yes | `todo` \| `in_progress` \| `completed` (default: `todo`) |
| `priority` | Enum | Yes | `low` \| `medium` \| `high` (default: `medium`) |
| `due_at` | ISO-8601 | No | Deadline date & time |
| `reminder_at`| ISO-8601 | No | Scheduled notification trigger |
| `tags` | JSON Array | Yes | Array of string tags |
| `created_at` | ISO-8601 | Yes | Local creation timestamp |
| `updated_at` | ISO-8601 | Yes | Last modified timestamp |
| `deleted_at` | ISO-8601 | No | Soft-delete tombstone |
| `version` | Integer | Yes | Monotonic version counter |

### 2.2 Ideas (`ideas`)

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | UUID | Yes | Client-generated record ID |
| `user_id` | UUID | No | Supabase Auth user ID |
| `title` | Text (1-500) | Yes | Idea heading |
| `content` | Text | Yes | Idea notes and body |
| `archived_at`| ISO-8601 | No | Timestamp if archived |
| `tags` | JSON Array | Yes | Tags |
| `created_at` | ISO-8601 | Yes | Local creation timestamp |
| `updated_at` | ISO-8601 | Yes | Last modified timestamp |
| `deleted_at` | ISO-8601 | No | Tombstone |
| `version` | Integer | Yes | Version counter |

### 2.3 Learning Resources (`learning_resources`)

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | UUID | Yes | Client-generated record ID |
| `user_id` | UUID | No | Supabase Auth user ID |
| `title` | Text (1-500) | Yes | Course/Resource name |
| `url` | Text/URL | No | External URL to course or video |
| `provider` | Text (1-200) | No | e.g., Coursera, YouTube, Docs |
| `status` | Enum | Yes | `planned` \| `in_progress` \| `completed` \| `paused` |
| `progress_percent` | Number | Yes | 0 to 100 |
| `notes` | Text | No | Markdown notes |
| `created_at` | ISO-8601 | Yes | Local creation timestamp |
| `updated_at` | ISO-8601 | Yes | Last modified timestamp |
| `deleted_at` | ISO-8601 | No | Tombstone |
| `version` | Integer | Yes | Version counter |

### 2.4 Study Sessions (`study_sessions`)

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | UUID | Yes | Client-generated record ID |
| `user_id` | UUID | No | Supabase Auth user ID |
| `resource_id` | UUID | Yes | Foreign key to `learning_resources.id` |
| `started_at` | ISO-8601 | Yes | Session start timestamp |
| `duration_minutes` | Integer | Yes | Total minutes logged |
| `notes` | Text | No | Session log notes |
| `created_at` | ISO-8601 | Yes | Creation timestamp |
| `updated_at` | ISO-8601 | Yes | Modification timestamp |
| `deleted_at` | ISO-8601 | No | Tombstone |
| `version` | Integer | Yes | Version counter |

### 2.5 Reminders (`reminders`)

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | UUID | Yes | Client-generated record ID |
| `user_id` | UUID | No | Supabase Auth user ID |
| `task_id` | UUID | Yes | Foreign key to `tasks.id` |
| `remind_at` | ISO-8601 | Yes | Scheduled trigger time |
| `status` | Enum | Yes | `pending` \| `fired` \| `dismissed` |
| `created_at` | ISO-8601 | Yes | Creation timestamp |
| `updated_at` | ISO-8601 | Yes | Modification timestamp |
| `deleted_at` | ISO-8601 | No | Tombstone |
| `version` | Integer | Yes | Version counter |

---

## 3. Sync & Mutation Queue Contract

Every local write produces a durable entry in `mutation_queue`:

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "entity_type": "task",
  "entity_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "operation": "insert",
  "payload_json": "{\"id\":\"9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d\",\"title\":\"Finish Milestone 1\"...}",
  "client_timestamp": "2026-10-30T13:00:00.000Z",
  "status": "pending",
  "retry_count": 0,
  "last_error": null
}
```
