-- SlowBroom, part five. Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- A plain-HTTP relay for co-op, used when a player's websocket will not stay up.

create table if not exists public.nest_events (
  id          bigint generated always as identity primary key,
  code        text not null check (char_length(code) between 3 and 12),
  at          timestamptz not null default now(),
  payload     jsonb not null
);
create index if not exists nest_events_code_idx on public.nest_events (code, id desc);

alter table public.nest_events enable row level security;
drop policy if exists "read nest events"  on public.nest_events;
drop policy if exists "write nest events" on public.nest_events;
drop policy if exists "clean nest events" on public.nest_events;
create policy "read nest events"  on public.nest_events for select to anon using (true);
create policy "write nest events" on public.nest_events for insert to anon with check (true);
create policy "clean nest events" on public.nest_events for delete to anon
  using (at < now() - interval '3 minutes');
