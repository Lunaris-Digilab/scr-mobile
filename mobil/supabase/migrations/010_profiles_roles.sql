-- User roles for authorization (gates the admin-only camera/AI add flow).
-- Run via `supabase db push` (or paste into the Supabase SQL editor).
--
-- There is no public.users table (profile data lives in Auth user_metadata),
-- so we introduce a minimal profiles table keyed by auth.users.id.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user can read their own profile (so the app can check its own role).
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

-- A user may create their own row but cannot self-assign anything but 'user'.
-- (Role changes to 'admin' are done via SQL / service role only — no update policy.)
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id and role = 'user');

-- Auto-create a 'user' profile when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role) values (new.id, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill existing users.
insert into public.profiles (id, role)
select id, 'user' from auth.users
on conflict (id) do nothing;

-- To promote a user to admin, run (replace the email):
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');
