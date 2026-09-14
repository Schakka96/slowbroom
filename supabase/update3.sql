-- SlowBroom, part four. Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- One column: who a message was whispered to (null = everyone in the room).

alter table public.messages add column if not exists dm text
  check (dm is null or char_length(dm) between 1 and 18);
create index if not exists messages_dm_idx on public.messages (dm);
