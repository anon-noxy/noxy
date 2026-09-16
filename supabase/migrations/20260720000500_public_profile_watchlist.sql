begin;

drop function if exists public.get_public_profile_watchlist(text);

create or replace function public.get_public_profile_watchlist(profile_username text)
returns table (
  anime_id integer,
  title text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    anime_watchlist.anime_id,
    anime_watchlist.title
  from public.profiles
  join public.anime_watchlist on anime_watchlist.user_id = profiles.id
  where profiles.username = lower(trim(profile_username))
  order by anime_watchlist.updated_at desc, anime_watchlist.added_at desc, anime_watchlist.title asc;
$$;

revoke all on function public.get_public_profile_watchlist(text) from public;
grant execute on function public.get_public_profile_watchlist(text) to anon, authenticated;

commit;
