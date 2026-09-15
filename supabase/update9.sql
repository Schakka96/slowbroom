-- SlowBroom, part nine: reset the developer passphrase for chat deletion.
-- Paste into Supabase → SQL Editor → Run after update8.sql.
-- This keeps the existing, narrowly scoped delete function and only changes
-- which passphrase it accepts.

create or replace function public.slowbroom_delete_message(
  p_message_id bigint,
  p_passphrase text
) returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_message_id is null
     or encode(extensions.digest(coalesce(p_passphrase, ''), 'sha256'), 'hex')
          <> 'ae65ee56dadd2ce8048064673b10f044571cee23e756e167718218cf9c9c10bf' then
    raise exception 'not authorised';
  end if;

  delete from public.messages where id = p_message_id;
  return found;
end;
$$;
