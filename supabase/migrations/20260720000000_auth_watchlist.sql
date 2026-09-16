begin;

do $$
begin
  create type public.watchlist_status as enum ('watching', 'plan-to-watch', 'completed', 'on-hold');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,24}$'),
  constraint profiles_email_not_empty check (length(trim(email)) > 0)
);

create table if not exists public.anime_watchlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  anime_id integer not null,
  title text not null,
  image text not null default '',
  episodes integer,
  note text not null default '',
  status public.watchlist_status not null default 'plan-to-watch',
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, anime_id),
  constraint anime_watchlist_title_not_empty check (length(trim(title)) > 0),
  constraint anime_watchlist_episodes_positive check (episodes is null or episodes > 0),
  constraint anime_watchlist_note_length check (char_length(note) <= 500)
);

create index if not exists anime_watchlist_user_updated_idx
  on public.anime_watchlist (user_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists anime_watchlist_set_updated_at on public.anime_watchlist;
create trigger anime_watchlist_set_updated_at
  before update on public.anime_watchlist
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    lower(trim(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))),
    lower(trim(new.email))
  )
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.anime_watchlist enable row level security;

drop policy if exists "Profiles are readable by owner" on public.profiles;
create policy "Profiles are readable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles are updateable by owner" on public.profiles;
create policy "Profiles are updateable by owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can read their watchlist" on public.anime_watchlist;
create policy "Users can read their watchlist"
  on public.anime_watchlist for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their watchlist" on public.anime_watchlist;
create policy "Users can insert their watchlist"
  on public.anime_watchlist for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their watchlist" on public.anime_watchlist;
create policy "Users can update their watchlist"
  on public.anime_watchlist for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their watchlist" on public.anime_watchlist;
create policy "Users can delete their watchlist"
  on public.anime_watchlist for delete
  using (auth.uid() = user_id);

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.anime_watchlist to authenticated;

commit;
