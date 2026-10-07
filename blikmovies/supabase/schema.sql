-- Blikmovies production schema (run once in Supabase SQL Editor)

create table if not exists public.movies (
  id bigserial primary key,
  tmdb_id integer not null unique,
  title text not null,
  overview text,
  poster_path text,
  backdrop_path text,
  vote_average numeric default 0,
  release_date date,
  genres text[] default '{}',
  trailer_key text,
  runtime integer,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Safe alters for existing projects
alter table public.movies add column if not exists genres text[] default '{}';
alter table public.movies add column if not exists trailer_key text;
alter table public.movies add column if not exists runtime integer;
alter table public.movies add column if not exists updated_at timestamptz default now();

create index if not exists movies_release_idx on public.movies (release_date desc nulls last);
create index if not exists movies_vote_idx on public.movies (vote_average desc nulls last);

create table if not exists public.sync_runs (
  id bigserial primary key,
  source text not null default 'cron',
  synced integer not null default 0,
  detail jsonb default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  can_download boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.watchlist (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, movie_id)
);

create table if not exists public.download_requests (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id integer not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.movies enable row level security;
alter table public.profiles enable row level security;
alter table public.watchlist enable row level security;
alter table public.download_requests enable row level security;
alter table public.sync_runs enable row level security;

drop policy if exists "Movies public read" on public.movies;
create policy "Movies public read" on public.movies for select using (true);

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users manage own watchlist" on public.watchlist;
create policy "Users manage own watchlist" on public.watchlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own download requests" on public.download_requests;
create policy "Users manage own download requests" on public.download_requests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Sync runs public read" on public.sync_runs;
create policy "Sync runs public read" on public.sync_runs for select using (true);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
