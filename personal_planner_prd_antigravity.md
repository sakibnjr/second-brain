# Personal Planner --- Product Requirements Document (PRD)

**Document version:** 1.0\
**Status:** Initial implementation specification\
**Audience:** Antigravity coding agent\
**Product type:** Offline-first personal productivity application\
**Target platforms:** Linux desktop (Linux Mint) and Android\
**Primary user:** One individual using the same account across their
desktop and Android phone

------------------------------------------------------------------------

## 1. Product Overview

Build a personal planning application that helps the user organize
tasks, capture ideas quickly, plan what to do and when, and track
learning goals and courses. The app must work offline on both Linux
desktop and Android. When an internet connection becomes available,
local changes should synchronize with the shared cloud account and
eventually appear on the other device.

This is a personal productivity tool, not a team project-management
product. Prioritize fast capture, low-friction organization, reliable
reminders, clear progress visibility, and dependable offline behavior.

### Product goals

1.  Quickly capture tasks, ideas, and learning resources.
2.  Plan tasks by date and review what is due today or soon.
3.  Track learning resources, course links, progress, and study history.
4.  Provide reminders on desktop and Android.
5.  Keep the app usable without an internet connection.
6.  Synchronize data between Linux desktop and Android through a shared
    Supabase backend.
7.  Keep the codebase modular so new features can be added without major
    restructuring.

### Non-goals for the first release

-   Team collaboration or shared workspaces.
-   Public profiles or social features.
-   AI-generated plans or recommendations.
-   Subscription payments.
-   A web app.
-   iOS support.
-   Complex project-management features such as Gantt charts.
-   File attachments or large media uploads unless explicitly added
    later.

------------------------------------------------------------------------

## 2. Target Platforms and Technology

Use the following stack unless a verified compatibility issue requires a
documented alternative.

### Linux desktop

-   **Desktop framework:** Tauri 2
-   **UI:** React + TypeScript
-   **Build tooling:** Vite
-   **Styling:** Tailwind CSS
-   **Local database:** SQLite
-   **Database access:** A compatible Tauri SQLite/SQL plugin or a
    small, well-contained Rust command layer
-   **Desktop notifications:** Tauri notification capabilities plus any
    Linux-specific scheduling mechanism required for reminders

Tauri's core is Rust-based, but do not create a separate Rust business
backend without a concrete need. Prefer TypeScript for UI and shared
application logic. Use Rust commands or plugins only where required for
native integration, database access, filesystem access, or OS-specific
behavior.

### Android

-   **Language:** Kotlin
-   **UI:** Jetpack Compose
-   **Architecture:** ViewModel + repository pattern
-   **Local database:** Room backed by SQLite
-   **Background work:** WorkManager for deferrable work and
    synchronization
-   **Reminders:** Android notification APIs and appropriate alarm
    scheduling where exact timing is required, subject to Android
    permissions and platform restrictions

### Cloud

-   **Backend platform:** Supabase
-   **Database:** PostgreSQL
-   **Authentication:** Supabase Auth
-   **Authorization:** Row Level Security (RLS)
-   **Data access:** Supabase APIs from each client
-   **Optional realtime updates:** Use only where useful; realtime must
    not be the only sync mechanism

### Shared contracts

Desktop and Android use different languages, so define and document a
platform-independent data contract. Keep field names, enum values, ID
formats, timestamp rules, deletion semantics, and conflict rules
consistent across clients.

Use UUIDs generated on the client for record IDs so records can be
created offline.

------------------------------------------------------------------------

## 3. Core User Stories

### Tasks and planning

-   As a user, I can create a task quickly without filling in every
    optional field.
-   I can add a description, due date/time, priority, status, tags, and
    optional reminder.
-   I can view tasks for today, upcoming days, all tasks, and completed
    tasks.
-   I can edit, complete, reopen, or delete a task.
-   I can sort and filter tasks by date, status, priority, or tag.
-   I can create a task while offline and have it sync later.

### Ideas and notes

-   I can capture an idea quickly with a title and optional body.
-   I can edit, archive, tag, or delete an idea.
-   I can search ideas by title and content where supported by the local
    database.
-   Idea capture must remain available offline.

### Learning tracker

-   I can add a learning resource with a title, URL, provider/course
    name, notes, status, and progress.
-   Supported statuses should include at least `planned`, `in_progress`,
    `completed`, and `paused`.
-   Progress should be represented as a percentage from 0 to 100.
-   I can update progress and add study-session records with date,
    duration, and notes.
-   I can open a course URL using the platform's default browser.
-   Learning records must be available offline after they have been
    saved locally.

### Reminders

-   I can set a reminder date and time for a task.
-   I can enable or disable a reminder and change its schedule.
-   I can receive local notifications when supported and permitted by
    the operating system.
-   Reminder schedules must be stored as data and recreated on a device
    after sync.
-   The app should explain when notification permissions are disabled.
-   Recurring reminders are a later enhancement unless they can be
    implemented reliably without delaying the core release.

### Synchronization

-   I can use tasks, ideas, and learning resources offline.
-   Local changes are saved immediately to the local database.
-   Unsynchronized changes are retained in a durable queue or equivalent
    local sync state.
-   When connectivity returns, pending changes are retried
    automatically.
-   The app indicates whether data is synced, pending, or affected by a
    sync error.
-   Changes made on one device eventually appear on the other device.
-   Temporary network errors must not cause local data loss.
-   Repeated sync attempts must not create duplicate records.

------------------------------------------------------------------------

## 4. Information Architecture and Main Screens

Use a consistent information architecture across platforms, adapting
interaction patterns to desktop and mobile rather than forcing identical
layouts.

### 4.1 Dashboard

Show: - Today's tasks - Overdue tasks - Upcoming tasks - A quick-add
action - In-progress learning resources and progress - A small
recent-ideas section - Sync status

Keep the dashboard focused. Do not overload it with charts or decorative
widgets.

### 4.2 Tasks

Provide: - Today - Upcoming - All tasks - Completed - Task creation and
editing - Search, sort, and filters - Task detail view or dialog/sheet

Task fields: - `id` - `user_id` - `title` (required) - `description`
(optional) - `status` - `priority` - `due_at` (optional) - `reminder_at`
(optional) - `created_at` - `updated_at` - `deleted_at` (optional
tombstone) - `version` or equivalent conflict metadata if required by
the sync design

Suggested statuses: `todo`, `in_progress`, `completed`.\
Suggested priorities: `low`, `medium`, `high`.

### 4.3 Idea Inbox

Provide: - Fast capture - List of ideas - Idea detail/edit - Search -
Tags or lightweight categorization - Archive and delete actions

Idea fields: - `id` - `user_id` - `title` - `content` - `created_at` -
`updated_at` - `deleted_at` (optional tombstone) - Optional
`archived_at`

### 4.4 Learning

Provide: - Learning resource list - Add/edit resource - Status filters -
Progress indicator - Resource detail - Study-session history

Learning resource fields: - `id` - `user_id` - `title` - `url`
(optional) - `provider` (optional) - `status` - `progress_percent` -
`notes` (optional) - `created_at` - `updated_at` - `deleted_at`
(optional tombstone)

Study-session fields: - `id` - `user_id` - `resource_id` -
`started_at` - `duration_minutes` - `notes` (optional) - `created_at` -
`updated_at` - `deleted_at` (optional tombstone)

### 4.5 Calendar / Schedule

For the initial release, provide a practical date-based view of tasks. A
full drag-and-drop calendar is optional and must not block core
functionality.

-   Show tasks with due dates.
-   Allow the user to select a date and see its tasks.
-   Provide a clear way to create a task for a selected date.
-   Use the user's local timezone for displaying and scheduling dates.

### 4.6 Settings

Include: - Account and sign-out - Theme: system, light, dark - Default
task view - Notification permission/status - Sync status and last
successful sync - Manual sync retry - Data export/backup option if
feasible for the first release

------------------------------------------------------------------------

## 5. UX and Design Requirements

-   Use a clean, calm, productivity-focused interface.
-   Optimize for quick task and idea capture.
-   Use clear visual hierarchy, readable typography, and consistent
    spacing.
-   Support light and dark themes.
-   Use reusable components and design tokens.
-   Avoid hardcoded colors, font sizes, and spacing values throughout
    components. Define shared design tokens in the global theme/CSS
    configuration where appropriate.
-   Avoid excessive animation and visual clutter.
-   Provide empty states, loading states, validation messages, and
    actionable error states.
-   Confirm destructive actions where appropriate.
-   Do not show success messages for operations that have not actually
    succeeded locally.
-   The UI must distinguish local save success from cloud sync success.
-   Desktop should support keyboard navigation and useful shortcuts
    where practical.
-   Android should use touch-friendly controls and standard Android
    navigation patterns.
-   Follow accessibility basics: adequate contrast, meaningful labels,
    scalable text, and focus visibility.

------------------------------------------------------------------------

## 6. Offline-First Data Architecture

### 6.1 Local-first write behavior

For tasks, ideas, learning resources, and study sessions:

1.  Validate the input.
2.  Save the change to the local database first.
3.  Update the UI from local state.
4.  Mark the record as pending synchronization.
5.  Attempt to sync when online.
6.  Mark the change synchronized only after the server confirms success.

The user must not lose a task because the network is unavailable.

### 6.2 Sync design

Before implementing sync, document the protocol and verify all edge
cases. Do not assume Supabase automatically synchronizes arbitrary local
SQLite databases.

The sync mechanism must address: - Durable pending operations - Retry
with backoff - Idempotent writes - Client-generated UUIDs - Inserts,
updates, and deletes - Tombstones or equivalent deletion propagation -
Authentication expiry - Network interruption during upload or download -
Duplicate delivery - Concurrent edits on different devices -
Schema/version migration - Last successful sync time and visible error
state

Use server-side authorization and RLS. Never place the Supabase
service-role key in either client application.

### 6.3 Conflict resolution

Define an initial, documented conflict policy before implementation. A
reasonable first version is: - Prefer the server's canonical record
after a successful reconciliation. - Use `updated_at` and, if needed, a
version field to detect competing updates. - Do not silently discard a
local edit that has not been synchronized. - If both devices edit the
same record before syncing, use a deterministic rule and preserve enough
information to avoid silent data loss. If necessary, surface a conflict
for the user to resolve.

Do not rely solely on client clocks for correctness without considering
clock skew. Use server timestamps where practical.

### 6.4 Data deletion

Use soft deletion/tombstones for synchronized records until deletion has
propagated to relevant devices. Permanently remove tombstones only when
the sync design can prove that doing so will not cause deleted records
to reappear.

### 6.5 Realtime

Supabase Realtime may improve how quickly a connected device learns
about remote changes, but it is an enhancement rather than the sole
source of truth. Periodic or event-triggered reconciliation must recover
missed realtime events.

------------------------------------------------------------------------

## 7. Supabase and Security Requirements

-   Use Supabase Auth for account authentication.
-   Require authentication before accessing cloud-synced user data.
-   Add `user_id` to user-owned tables.
-   Enable RLS on all user-owned tables.
-   Policies must ensure users can only read, insert, update, and delete
    their own records.
-   Validate data on the client and enforce important constraints in the
    database.
-   Keep secrets out of source control.
-   The Supabase publishable/anon key may be included in a client only
    when RLS and related security configuration are correct; never
    expose the service-role key.
-   Handle sign-out and expired sessions safely.
-   Decide how local data behaves after sign-out. Do not expose one
    account's cached data to another account on the same device.
-   Use HTTPS for network traffic through Supabase.
-   Provide database migrations for schema changes.

------------------------------------------------------------------------

## 8. Reminder Requirements and Platform Constraints

### Android

-   Request notification permission when needed, with a clear
    explanation.
-   Schedule local reminders from locally stored reminder records.
-   Reconcile scheduled notifications after relevant changes, app
    startup, device reboot, and successful sync where appropriate.
-   Use WorkManager for deferrable background synchronization, not as a
    guarantee of exact-time alarms.
-   Use Android alarm APIs only when their timing behavior is required
    and allowed by current Android policies and permissions.
-   Handle timezone changes, disabled notifications, and changed
    reminder times.
-   Avoid creating duplicate scheduled notifications.

### Linux desktop

-   Use the desktop notification system supported by Tauri and Linux.
-   Verify behavior on the target Linux Mint desktop environment.
-   Decide and document whether reminders must work when the main window
    is closed. If yes, design and test an appropriate background process
    or OS scheduler; do not assume a closed app can execute code.
-   Show notification permission or platform limitations where relevant.

Reminder reliability is a platform-dependent requirement. Test on real
Linux Mint and Android devices; do not claim guaranteed delivery where
the operating system does not provide it.

------------------------------------------------------------------------

## 9. Database Design Guidance

Start with these cloud tables, refining them only when required:

-   `profiles`
-   `tasks`
-   `ideas`
-   `learning_resources`
-   `study_sessions`
-   `reminders`
-   `tags` and join tables if tagging is implemented

Use UUID primary keys. Add `user_id` to user-owned tables. Include
appropriate timestamps and deletion metadata for synchronized records.

Add indexes for common filters, including `user_id`, task due dates,
status, and relevant foreign keys.

Keep the local schemas aligned with the shared data contract, but use
platform-appropriate database implementations: - Desktop: SQLite
accessed through a verified Tauri-compatible integration. - Android:
Room entities, DAOs, and migrations.

Avoid creating a large, abstract schema before the first features are
working. Use migrations and keep the schema documented.

------------------------------------------------------------------------

## 10. Non-Functional Requirements

### Reliability

-   Local saves must work without internet.
-   App restarts must not discard pending sync operations.
-   Sync failures must be recoverable.
-   Repeated operations must not create duplicates.

### Performance

-   Common screens should feel responsive with a realistic personal
    dataset.
-   Use pagination or incremental loading if data grows.
-   Avoid blocking the UI during database operations or sync.

### Privacy

-   Store only data required for the product.
-   Protect cloud data with RLS.
-   Do not log task content, idea text, course notes, credentials, or
    tokens unnecessarily.

### Maintainability

-   Separate UI, domain logic, data access, and sync logic.
-   Use feature-oriented modules rather than one oversized file or a
    large generic folder structure.
-   Keep platform-specific functionality out of shared domain logic.
-   Add tests for business rules and sync edge cases.

### Portability

-   Build and test the desktop app on Linux Mint.
-   Build and test the Android app on a real Android device or emulator.
-   Document setup, environment variables, database migrations, and
    build steps.

------------------------------------------------------------------------

## 11. Testing and Acceptance Criteria

The first release is acceptable when all of the following are verified.

### Core functionality

-   User can create, view, edit, complete, and delete tasks.
-   User can capture, edit, search, archive, and delete ideas.
-   User can create learning resources, open their URLs, and update
    progress.
-   User can view study-session history if study sessions are
    implemented.
-   User can view tasks by date and identify overdue tasks.

### Offline behavior

-   With the internet disabled, user can create and edit tasks, ideas,
    and learning records.
-   Local changes remain after the app is closed and reopened.
-   The UI clearly shows pending synchronization.
-   After connectivity returns, changes sync without manual re-entry.
-   A record created on one device appears on the other after
    synchronization.
-   Changes made on both devices do not silently erase unsynchronized
    local data.
-   Deletions propagate and deleted records do not reappear during
    normal synchronization.
-   Failed requests can be retried safely without duplicate records.

### Security

-   One user cannot access another user's cloud records.
-   RLS policies are tested.
-   No service-role secret is present in client code or distributed
    builds.

### Reminders

-   A scheduled reminder produces a notification when permissions and
    platform conditions allow it.
-   Editing or deleting a reminder updates or cancels the scheduled
    notification.
-   Restart and timezone-change behavior is tested and documented.
-   The app explains when notifications are disabled or unsupported.

### Cross-platform consistency

-   The same user can sign in on desktop and Android.
-   Shared records have consistent field values and statuses across
    platforms.
-   Schema changes are applied through migrations.
-   Sync behavior is covered by automated tests where feasible.

------------------------------------------------------------------------

## 12. Implementation Plan

Implement in small, testable milestones. Do not attempt the whole
product in one code-generation step.

### Milestone 1 --- Repository and design foundation

-   Create repository structure.
-   Set up the Tauri + React + TypeScript desktop application.
-   Set up the Kotlin + Jetpack Compose Android application.
-   Define design tokens and shared data contracts.
-   Document development commands and environment setup.

### Milestone 2 --- Local-first desktop MVP

-   Implement tasks, idea inbox, and learning resources.
-   Set up desktop SQLite persistence.
-   Add validation, loading/error states, search, and basic filters.
-   Verify all core features work with the network disabled.

### Milestone 3 --- Local-first Android MVP

-   Implement equivalent core features in Kotlin and Jetpack Compose.
-   Set up Room entities, DAOs, and migrations.
-   Verify offline persistence and navigation.

### Milestone 4 --- Supabase foundation

-   Configure authentication.
-   Create database migrations and RLS policies.
-   Implement sign-in, sign-out, and safe session handling.
-   Define and test the API/data contract.

### Milestone 5 --- Synchronization

-   Implement or integrate the selected sync strategy.
-   Add durable pending-change tracking, retries, idempotency, deletion
    propagation, and conflict handling.
-   Test offline-to-online transitions and simultaneous edits.
-   Show sync status in both clients.

### Milestone 6 --- Reminders

-   Implement Android local notifications and required scheduling.
-   Implement desktop notifications and the chosen closed-window
    behavior.
-   Test permissions, edits, deletions, restarts, and timezone changes.

### Milestone 7 --- Polish and release readiness

-   Add dark/light/system theme.
-   Add export/backup if feasible.
-   Improve keyboard navigation and Android touch interactions.
-   Add tests and user-facing error messages.
-   Document build, installation, backup, and recovery procedures.

Do not start the next milestone until the previous milestone's
acceptance criteria are met.

------------------------------------------------------------------------

## 13. Instructions for the Antigravity Coding Agent

1.  Read this PRD before changing or generating project files.
2.  Inspect the existing repository before choosing paths or replacing
    configuration.
3.  If no repository exists, create a clean monorepo with separate
    desktop and Android applications.
4.  Propose a short implementation plan and identify uncertain technical
    decisions before major implementation.
5.  Verify current Tauri, Supabase, Kotlin, Compose, Room, and Android
    API compatibility against official documentation when selecting
    dependencies.
6.  Do not invent APIs or assume a library supports both Rust/Tauri and
    Kotlin.
7.  In particular, verify the chosen offline sync solution supports the
    required desktop and Android stack. If no suitable shared sync
    engine is available, document the trade-offs and propose a custom
    sync protocol before implementing it.
8.  Keep local persistence independent from network availability.
9.  Never put Supabase service-role credentials in client applications.
10. Use database migrations, environment variables, and documented setup
    steps.
11. Write small modules with clear responsibilities; avoid monolithic
    components and unnecessary abstractions.
12. Add tests for data validation, persistence, sync idempotency,
    deletion propagation, and conflict handling.
13. Do not claim a feature is complete unless it builds and has been
    tested to the extent possible.
14. If a requirement is ambiguous, state the assumption in the project
    documentation instead of silently making a major architectural
    decision.
15. Keep the project focused on a polished personal planner. Do not add
    unrequested features that delay the core product.

------------------------------------------------------------------------

## 14. Open Decisions to Resolve Before Full Sync Implementation

These decisions can be deferred until the local-first MVP works, but
must be resolved before implementing production sync:

1.  **Sync strategy:** custom sync protocol or a verified third-party
    engine compatible with both clients.
2.  **Conflict policy:** deterministic last-write-wins with safeguards,
    or user-visible conflict resolution.
3.  **Desktop reminders when closed:** whether a background process or
    OS scheduler is required.
4.  **Account lifecycle:** whether local data is retained, encrypted,
    exported, or removed on sign-out.
5.  **Recurring tasks:** include in the first release or add later.
6.  **Backup/export:** define a portable export format and recovery
    behavior.

**Guiding principle:** Ship a reliable local-first planner first, then
add cloud sync without compromising local data. Correctness and
recoverability matter more than adding many features quickly.
