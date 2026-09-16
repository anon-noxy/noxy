begin;

drop function if exists public.list_community_profiles();

create or replace function public.list_community_profiles()
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
  order by profiles.created_at desc;
$$;

revoke all on function public.list_community_profiles() from public;
grant execute on function public.list_community_profiles() to anon, authenticated;

commit;
