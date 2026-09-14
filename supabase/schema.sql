-- SlowBroom — paste this whole file into Supabase → SQL Editor → Run.
-- Three small tables: the chat, who is playing right now, and the mopped tally.

-- ── chat ──────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 1 and 18),
  body        text not null check (char_length(body) between 1 and 240),
  game        text not null default 'mop' check (game in ('mop','ant','mosaic'))
);
create index if not exists messages_created_idx on public.messages (created_at desc);

-- ── who is here right now (rows go stale and are ignored after 40s) ───
create table if not exists public.presence (
  client_id   text primary key check (char_length(client_id) between 8 and 64),
  name        text check (char_length(name) <= 18),
  game        text not null default 'mop' check (game in ('mop','ant','mosaic')),
  seen_at     timestamptz not null default now()
);

-- ── how many rooms each person has finished ───────────────────────────
create table if not exists public.moppers (
  client_id   text primary key check (char_length(client_id) between 8 and 64),
  name        text not null check (char_length(name) between 1 and 18),
  rooms       integer not null default 0 check (rooms >= 0 and rooms < 1000000),
  updated_at  timestamptz not null default now()
);
create index if not exists moppers_rooms_idx on public.moppers (rooms desc);

-- ── row level security: anyone may read; writes are shaped by the checks
alter table public.messages enable row level security;
alter table public.presence enable row level security;
alter table public.moppers  enable row level security;

drop policy if exists "read messages"  on public.messages;
drop policy if exists "post messages"  on public.messages;
drop policy if exists "read presence"  on public.presence;
drop policy if exists "write presence" on public.presence;
drop policy if exists "read moppers"   on public.moppers;
drop policy if exists "write moppers"  on public.moppers;

create policy "read messages"  on public.messages for select to anon using (true);
create policy "post messages"  on public.messages for insert to anon with check (true);
create policy "read presence"  on public.presence for select to anon using (true);
create policy "write presence" on public.presence for all    to anon using (true) with check (true);
create policy "read moppers"   on public.moppers  for select to anon using (true);
create policy "write moppers"  on public.moppers  for all    to anon using (true) with check (true);

-- ── housekeeping: keep the tables small ───────────────────────────────
create or replace function public.slowbroom_tidy() returns void language sql as $$
  delete from public.messages where created_at < now() - interval '7 days';
  delete from public.presence where seen_at    < now() - interval '10 minutes';
$$;
