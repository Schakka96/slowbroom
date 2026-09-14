-- SlowBroom, part three. Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- A private inbox for pings to the dev, and a dev-only ban list.

-- ── pings to the dev: anyone may write, nobody may read ───────────────
-- (you read them in the dashboard as the project owner; the public key cannot)
create table if not exists public.dev_pings (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  from_name   text not null check (char_length(from_name) between 1 and 18),
  body        text not null check (char_length(body) between 1 and 240),
  room        smallint not null default 1
);
alter table public.dev_pings enable row level security;
drop policy if exists "write pings" on public.dev_pings;
create policy "write pings" on public.dev_pings for insert to anon with check (true);
-- deliberately no select policy: the anon key can write here and never read.

-- ── bans the dev sets ─────────────────────────────────────────────────
create table if not exists public.bans (
  name        text primary key check (char_length(name) between 1 and 18),
  until       timestamptz not null,
  reason      text check (char_length(reason) <= 80),
  created_at  timestamptz not null default now()
);
alter table public.bans enable row level security;
drop policy if exists "read bans"  on public.bans;
drop policy if exists "write bans" on public.bans;
create policy "read bans"  on public.bans for select to anon using (true);
create policy "write bans" on public.bans for all    to anon using (true) with check (true);
