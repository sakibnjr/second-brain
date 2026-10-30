-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 2. Tasks Table
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'completed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_at timestamptz,
  reminder_at timestamptz,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version bigint not null default 1
);

alter table public.tasks enable row level security;

create policy "Users can view own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on public.tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_tasks_status on public.tasks(user_id, status);
create index if not exists idx_tasks_due_at on public.tasks(user_id, due_at);
create index if not exists idx_tasks_updated_at on public.tasks(user_id, updated_at);

-- 3. Ideas Table
create table if not exists public.ideas (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  content text not null default '',
  archived_at timestamptz,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version bigint not null default 1
);

alter table public.ideas enable row level security;

create policy "Users can view own ideas"
  on public.ideas for select
  using (auth.uid() = user_id);

create policy "Users can insert own ideas"
  on public.ideas for insert
  with check (auth.uid() = user_id);

create policy "Users can update own ideas"
  on public.ideas for update
  using (auth.uid() = user_id);

create policy "Users can delete own ideas"
  on public.ideas for delete
  using (auth.uid() = user_id);

create index if not exists idx_ideas_user_id on public.ideas(user_id);
create index if not exists idx_ideas_updated_at on public.ideas(user_id, updated_at);

-- 4. Learning Resources Table
create table if not exists public.learning_resources (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  url text,
  provider text,
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed', 'paused')),
  progress_percent integer not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version bigint not null default 1
);

alter table public.learning_resources enable row level security;

create policy "Users can view own learning resources"
  on public.learning_resources for select
  using (auth.uid() = user_id);

create policy "Users can insert own learning resources"
  on public.learning_resources for insert
  with check (auth.uid() = user_id);

create policy "Users can update own learning resources"
  on public.learning_resources for update
  using (auth.uid() = user_id);

create policy "Users can delete own learning resources"
  on public.learning_resources for delete
  using (auth.uid() = user_id);

create index if not exists idx_learning_user_id on public.learning_resources(user_id);
create index if not exists idx_learning_status on public.learning_resources(user_id, status);

-- 5. Study Sessions Table
create table if not exists public.study_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  resource_id uuid references public.learning_resources(id) on delete cascade not null,
  started_at timestamptz not null default now(),
  duration_minutes integer not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version bigint not null default 1
);

alter table public.study_sessions enable row level security;

create policy "Users can view own study sessions"
  on public.study_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own study sessions"
  on public.study_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own study sessions"
  on public.study_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete own study sessions"
  on public.study_sessions for delete
  using (auth.uid() = user_id);

-- 6. Reminders Table
create table if not exists public.reminders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete cascade not null,
  remind_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'fired', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version bigint not null default 1
);

alter table public.reminders enable row level security;

create policy "Users can view own reminders"
  on public.reminders for select
  using (auth.uid() = user_id);

create policy "Users can insert own reminders"
  on public.reminders for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reminders"
  on public.reminders for update
  using (auth.uid() = user_id);

create policy "Users can delete own reminders"
  on public.reminders for delete
  using (auth.uid() = user_id);
