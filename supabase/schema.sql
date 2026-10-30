-- ============================================================
-- Modexa – eget databasschema för Supabase
-- Kör hela filen i Supabase → SQL Editor (en gång).
-- ============================================================

-- 1) Ta bort allt som redan fanns i databasen (cascade tar med beroenden)
--    Listan är de tabeller som fanns i projektet när schemat skrevs.
drop table if exists public.messages cascade;
drop table if exists public.conversations cascade;
drop table if exists public.projects cascade;
drop table if exists public.project_files cascade;
drop table if exists public.profiles cascade;
drop table if exists public.user_settings cascade;
drop table if exists public.user_plugin_settings cascade;
drop table if exists public.model_providers cascade;
drop table if exists public.plugins cascade;
drop table if exists public.library_items cascade;
drop table if exists public.generated_images cascade;
drop table if exists public.scheduled_tasks cascade;
drop table if exists public.scheduled_task_runs cascade;
drop table if exists public.tool_runs cascade;
-- Modexas egna tabeller (om filen körs igen)
drop table if exists public.chats cascade;
drop table if exists public.skills cascade;
drop table if exists public.mcp_servers cascade;
drop table if exists public.model_usage cascade;

-- Vill du tömma HELA databasen (alla tabeller i public, inte bara Modexas)
-- innan du kör resten: avkommentera raderna nedan medvetet.
-- OBS: detta raderar allt i public-schemat och kan inte ångras.
-- drop schema public cascade;
-- create schema public;
-- grant usage on schema public to anon, authenticated;
-- grant all on schema public to postgres, service_role;

-- 2) Modexas tabeller
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  folder text,
  repo text,
  startup_script text not null default 'bun install',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title text not null default 'New chat',
  scope text not null default 'chat',
  location text not null default 'local',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'agent')),
  body text not null,
  model text,
  created_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  instructions text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.mcp_servers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  config jsonb,
  status text not null default 'needs-approval' check (status in ('needs-approval', 'ready')),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- Daglig användningstid: 21 h per dag och användare
create table public.model_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  used_hours numeric(7, 4) not null default 0,
  unique (user_id, day)
);

-- 3) Index för de vanligaste frågorna
create index projects_user_idx on public.projects (user_id, created_at desc);
create index chats_user_idx on public.chats (user_id, created_at desc);
create index chats_project_idx on public.chats (project_id);
create index messages_chat_idx on public.messages (chat_id, created_at);

-- 4) Row Level Security: varje användare ser bara sina egna rader
alter table public.projects enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.skills enable row level security;
alter table public.mcp_servers enable row level security;
alter table public.model_usage enable row level security;

create policy "own projects" on public.projects
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own chats" on public.chats
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own messages" on public.messages
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own skills" on public.skills
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own mcp servers" on public.mcp_servers
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own usage" on public.model_usage
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
