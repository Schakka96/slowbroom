-- SlowBroom, part eight: one dust map, shared and kept.
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.
--
-- Mopping together used to mean the host broadcasting its own floor and
-- everybody else throwing it away, because "room 5" was a different floor in
-- every browser. Rooms are now dealt from the room code, so room 5 is the
-- same floor for everyone who typed it — which finally makes it worth
-- writing down. One row per room of one corridor, holding a 96×54 map of
-- which patches have been mopped.
--
-- A row is about a kilobyte. Six people mopping fifty rooms is fifty rows,
-- rewritten at most every eight seconds each; the reading only happens when
-- somebody walks into a room.

create table if not exists public.mop_floors (
  world       text     not null check (char_length(world) between 1 and 16),
  room        smallint not null check (room between 0 and 2000),
  mask        text     not null check (char_length(mask) <= 1400),
  patches     smallint not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (world, room)
);

alter table public.mop_floors enable row level security;

-- Read and write, never delete: the anon key is public, so a delete policy
-- would let any visitor wipe a corridor other people had mopped. There is
-- no policy for delete, which means nobody but the dashboard can.
drop policy if exists "read floors"  on public.mop_floors;
drop policy if exists "add floors"   on public.mop_floors;
drop policy if exists "keep floors"  on public.mop_floors;
drop policy if exists "write floors" on public.mop_floors;
create policy "read floors" on public.mop_floors for select to anon using (true);
create policy "add floors"  on public.mop_floors for insert to anon with check (true);
create policy "keep floors" on public.mop_floors for update to anon using (true) with check (true);

-- A floor only ever gets cleaner. Without this, a browser that joined late
-- and has not caught up yet could write its emptier map over a fuller one.
create or replace function public.mop_floor_only_fills() returns trigger
language plpgsql as $$
begin
  if new.patches < old.patches then
    return old;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists mop_floor_only_fills on public.mop_floors;
create trigger mop_floor_only_fills before update on public.mop_floors
  for each row execute function public.mop_floor_only_fills();

-- corridors nobody has walked for a month are not worth keeping
create or replace function public.slowbroom_tidy() returns void language sql as $$
  delete from public.messages    where created_at < now() - interval '7 days';
  delete from public.presence    where seen_at    < now() - interval '10 minutes';
  delete from public.nest_events where at         < now() - interval '10 minutes';
  delete from public.bans        where until      < now() - interval '1 day';
  delete from public.mop_floors  where updated_at < now() - interval '30 days';
$$;

create index if not exists mop_floors_world_idx on public.mop_floors (world, room);
