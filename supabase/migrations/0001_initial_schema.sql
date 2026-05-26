create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  name text not null,
  relation text not null,
  birthday date not null,
  budget_min integer,
  budget_max integer,
  address_status text not null default 'unknown',
  notes text,
  likes text[] not null default '{}',
  avoid text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique(user_id, slug)
);

create table if not exists public.source_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  source_type text not null,
  source_label text not null,
  summary text not null,
  evidence_strength text not null,
  sensitivity text not null default 'normal',
  included boolean not null default true,
  occurred_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.gift_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  status text not null default 'ready',
  budget_label text not null,
  delivery_deadline date,
  generation_mode text not null default 'local',
  created_at timestamptz not null default now()
);

create table if not exists public.gift_options (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brief_id uuid not null references public.gift_briefs(id) on delete cascade,
  catalog_id text not null,
  name text not null,
  seller text not null,
  price_cents integer not null,
  currency text not null default 'GBP',
  delivery_label text not null,
  fit_score integer not null check (fit_score between 0 and 100),
  evidence_signal_ids uuid[] not null default '{}',
  risk_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brief_id uuid not null references public.gift_briefs(id) on delete cascade,
  gift_option_id uuid not null references public.gift_options(id) on delete cascade,
  status text not null check (status in ('approved', 'deferred')),
  channel text not null default 'web',
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  state text not null default 'brief_ready',
  due_at timestamptz,
  channel text not null default 'web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor text not null default 'user',
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.people enable row level security;
alter table public.source_signals enable row level security;
alter table public.gift_briefs enable row level security;
alter table public.gift_options enable row level security;
alter table public.approvals enable row level security;
alter table public.reminders enable row level security;
alter table public.audit_events enable row level security;

create policy "own profiles" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own people" on public.people for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own source signals" on public.source_signals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own gift briefs" on public.gift_briefs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own gift options" on public.gift_options for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own approvals" on public.approvals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own reminders" on public.reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own audit events" on public.audit_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
