begin;

drop function if exists public.get_public_profile(text);

create or replace function public.get_public_profile(profile_username text)
returns table (
  id uuid,
  username text,
  bio text,
  avatar_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profiles.id,
    profiles.username,
    profiles.bio,
    profiles.avatar_url,
    profiles.created_at
  from public.profiles
  where profiles.username = lower(trim(profile_username))
  limit 1;
$$;

revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;

commit;
