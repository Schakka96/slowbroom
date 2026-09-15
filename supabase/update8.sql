-- SlowBroom, part eight: let the developer remove one chat message at a time.
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.
--
-- The public anon key must NOT receive a DELETE policy on `messages`: that
-- would allow any visitor to erase chat. This RPC runs with table-owner rights
-- but performs exactly one delete only after checking the dev passphrase.

create extension if not exists pgcrypto with schema extensions;

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
          <> 'c4419eaedb0d7640d9c8c16b76cf4efa610dfca91e976b0162e31d45896b9c0a' then
    raise exception 'not authorised';
  end if;

  delete from public.messages where id = p_message_id;
  return found;
end;
$$;

revoke all on function public.slowbroom_delete_message(bigint, text) from public;
grant execute on function public.slowbroom_delete_message(bigint, text) to anon;
