-- Physique — initial schema
-- Personal-use app: every row scoped to user_id, RLS forces self-only.

create extension if not exists "pgcrypto";

-- ── profiles (1 row per user) ───────────────────────────────────
create table if not exists public.profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  name           text,
  height_cm      int,
  age            int,
  start_date     date default current_date,
  start_weight   numeric(5,1),
  target_weight  numeric(5,1),
  calorie_target int,
  protein_target int,
  carb_target    int,
  fat_target     int,
  fast_start     text default '20:00',
  fast_end       text default '12:00',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ── weights ─────────────────────────────────────────────────────
create table if not exists public.weights (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null default current_date,
  value      numeric(5,1) not null,
  note       text,
  created_at timestamptz default now()
);
create index if not exists weights_user_date_idx on public.weights(user_id, date desc);

-- ── meals ───────────────────────────────────────────────────────
create table if not exists public.meals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null default current_date,
  time       text,
  name       text not null,
  kcal       int default 0,
  protein    int default 0,
  carbs      int default 0,
  fat        int default 0,
  source     text,
  created_at timestamptz default now()
);
create index if not exists meals_user_date_idx on public.meals(user_id, date desc);

-- ── workouts ────────────────────────────────────────────────────
create table if not exists public.workouts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date not null default current_date,
  time          text,
  name          text not null,
  category      text,
  duration_min  int default 0,
  intensity     text,
  kcal          int default 0,
  exercises     jsonb default '[]'::jsonb,
  notes         text,
  created_at    timestamptz default now()
);
create index if not exists workouts_user_date_idx on public.workouts(user_id, date desc);

-- ── routines (saved templates) ──────────────────────────────────
create table if not exists public.routines (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  exercises    jsonb default '[]'::jsonb,
  duration_min int default 0,
  kcal         int default 0,
  notes        text,
  source       text,
  created_at   timestamptz default now()
);

-- ── chat (coach history) ────────────────────────────────────────
create table if not exists public.chat (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('user','assistant','system')),
  content    text not null,
  created_at timestamptz default now()
);
create index if not exists chat_user_created_idx on public.chat(user_id, created_at);

-- ── auto profile on signup ──────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── RLS ─────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.weights  enable row level security;
alter table public.meals    enable row level security;
alter table public.workouts enable row level security;
alter table public.routines enable row level security;
alter table public.chat     enable row level security;

-- Generic helper: only the row owner can do anything.
do $$
declare
  t text;
begin
  for t in select unnest(array['profiles','weights','meals','workouts','routines','chat'])
  loop
    execute format('drop policy if exists "self_select" on public.%I', t);
    execute format('drop policy if exists "self_insert" on public.%I', t);
    execute format('drop policy if exists "self_update" on public.%I', t);
    execute format('drop policy if exists "self_delete" on public.%I', t);

    execute format($f$create policy "self_select" on public.%I for select using (auth.uid() = user_id)$f$, t);
    execute format($f$create policy "self_insert" on public.%I for insert with check (auth.uid() = user_id)$f$, t);
    execute format($f$create policy "self_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)$f$, t);
    execute format($f$create policy "self_delete" on public.%I for delete using (auth.uid() = user_id)$f$, t);
  end loop;
end $$;

-- ── realtime ────────────────────────────────────────────────────
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.weights;
alter publication supabase_realtime add table public.meals;
alter publication supabase_realtime add table public.workouts;
alter publication supabase_realtime add table public.routines;
alter publication supabase_realtime add table public.chat;
