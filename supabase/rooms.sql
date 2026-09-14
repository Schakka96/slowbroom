-- SlowBroom, part two: chat rooms. Paste into Supabase → SQL Editor → Run.

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
