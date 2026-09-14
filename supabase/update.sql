-- SlowBroom — run this whole file in Supabase → SQL Editor → Run.
-- Safe to run more than once. Adds chat rooms and mutual blocking.

-- ── rooms ─────────────────────────────────────────────────────────────
alter table public.messages add column if not exists room smallint not null default 1;
alter table public.presence add column if not exists room smallint not null default 1;
create index if not exists messages_room_idx on public.messages (room, created_at desc);

create table if not exists public.rooms (
  id          smallint primary key check (id between 1 and 200),
  name        text not null check (char_length(name) between 1 and 24),
  updated_at  timestamptz not null default now()
);
insert into public.rooms (id, name) values (1, 'Mop talk') on conflict (id) do nothing;

alter table public.rooms enable row level security;
drop policy if exists "read rooms"  on public.rooms;
drop policy if exists "write rooms" on public.rooms;
create policy "read rooms"  on public.rooms for select to anon using (true);
create policy "write rooms" on public.rooms for all    to anon using (true) with check (true);

-- ── blocking: both people stop seeing each other ──────────────────────
create table if not exists public.blocks (
  blocker     text not null check (char_length(blocker) between 1 and 18),
  blocked     text not null check (char_length(blocked) between 1 and 18),
  created_at  timestamptz not null default now(),
  primary key (blocker, blocked)
);

alter table public.blocks enable row level security;
drop policy if exists "read blocks"   on public.blocks;
drop policy if exists "write blocks"  on public.blocks;
drop policy if exists "remove blocks" on public.blocks;
create policy "read blocks"   on public.blocks for select to anon using (true);
create policy "write blocks"  on public.blocks for insert to anon with check (true);
create policy "remove blocks" on public.blocks for delete to anon using (true);
