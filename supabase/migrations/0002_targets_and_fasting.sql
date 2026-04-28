-- Physique — v2.0 PR1: dual targets + fasting timer settings
-- Adds intermediate/final targets with target dates, plus fasting duration
-- preference. Backfills the user's profile with the requested baseline.

-- ── profile columns ─────────────────────────────────────────────
alter table public.profiles add column if not exists target_intermediate      numeric(5,1);
alter table public.profiles add column if not exists target_intermediate_date date;
alter table public.profiles add column if not exists target_final             numeric(5,1);
alter table public.profiles add column if not exists target_final_date        date;
alter table public.profiles add column if not exists fast_duration_hours      int default 16;

-- ── seed the existing user(s) with the requested baseline ───────
-- Idempotent: only fills columns that are still null, except start_weight/start_date
-- which we force to the requested values.
update public.profiles set
  start_weight             = 105.1,
  start_date               = date '2026-04-03',
  target_intermediate      = coalesce(target_intermediate, 90.0),
  target_intermediate_date = coalesce(target_intermediate_date, date '2026-09-15'),
  target_final             = coalesce(target_final, 85.0),
  target_final_date        = coalesce(target_final_date, date '2026-12-15'),
  fast_duration_hours      = coalesce(fast_duration_hours, 16),
  -- keep target_weight in sync with the final goal for back-compat
  target_weight            = coalesce(target_weight, 85.0);
