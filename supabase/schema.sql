-- Dayzero Client Tracker: database schema and security rules for Supabase.
--
-- Run this once in the Supabase SQL editor (it is safe to run again).
-- Who can see what is enforced HERE, by row-level security, not by the app:
--   * The coach (an email listed in public.coaches) can read and write everything.
--   * A client can read their own profile, read/write their own daily logs,
--     read their own check-ins and send new ones. Nothing else.
--   * Anyone else who signs in sees nothing.

-- ---------------------------------------------------------------- tables

create table if not exists public.coaches (
  email text primary key check (email = lower(email)),
  -- Filled in automatically the first time this email signs in.
  user_id uuid unique
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  -- The email the client signs in with. Lower-cased so matching is reliable.
  email text unique check (email = lower(email)),
  phone text,
  lead_source text not null check (lead_source in ('referral', 'social', 'gym', 'email_list')),
  stage text not null check (stage in ('lead', 'consult', 'beta', 'active', 'paused', 'churned')),
  stage_history jsonb not null,
  start_date date,
  program_tier text not null check (program_tier in ('beta', 'tier_1', 'tier_2', 'tier_3')),
  next_check_in_date date,
  goal text not null check (goal in ('fat_loss', 'muscle_gain', 'recomp', 'maintenance')),
  targets jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Linked automatically when the client first signs in with their email.
  user_id uuid unique
);

-- Coach-only notes live in their own table so clients can never read them.
create table if not exists public.client_private (
  client_id uuid primary key references public.clients (id) on delete cascade,
  notes text not null default ''
);

create table if not exists public.progress_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  date date not null,
  weight_lbs double precision check (weight_lbs > 0),
  calories double precision check (calories >= 0),
  protein_g double precision check (protein_g >= 0),
  carbs_g double precision check (carbs_g >= 0),
  fat_g double precision check (fat_g >= 0),
  steps integer check (steps >= 0),
  note text,
  unique (client_id, date)
);

create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  date date not null,
  adherence_rating integer not null check (adherence_rating between 1 and 5),
  wins text not null default '',
  struggles text not null default '',
  questions text not null default '',
  coach_notes text not null default '',
  next_actions text not null default '',
  submitted_by text not null check (submitted_by in ('client', 'coach')),
  status text not null check (status in ('awaiting_coach', 'complete')),
  created_at timestamptz not null default now()
);

create index if not exists progress_logs_client_date on public.progress_logs (client_id, date);
create index if not exists check_ins_client_date on public.check_ins (client_id, date desc);

-- ------------------------------------------------------- who is asking?

-- These run with the owner's rights so the security rules can look people up
-- without granting clients access to the tables themselves.

create or replace function public.is_coach()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.coaches where user_id = auth.uid());
$$;

create or replace function public.my_client_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.clients where user_id = auth.uid();
$$;

-- Called by the app after sign-in to decide which area to show.
create or replace function public.my_role()
returns text language sql stable security definer set search_path = '' as $$
  select case
    when public.is_coach() then 'coach'
    when public.my_client_id() is not null then 'client'
    else 'unlinked'
  end;
$$;

-- --------------------------------------------- link sign-ins to people

-- When someone signs in for the first time, connect them to the coach row or
-- client row with the same email.
create or replace function public.link_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.coaches set user_id = new.id where email = lower(new.email) and user_id is null;
  update public.clients set user_id = new.id where email = lower(new.email) and user_id is null;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.link_new_user();

-- If the coach adds (or changes) a client's email after that person already
-- signed in, link them straight away.
create or replace function public.link_existing_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.user_id := coalesce(new.user_id, (select id from auth.users where lower(email) = new.email limit 1));
  elsif new.email is distinct from old.email then
    new.user_id := (select id from auth.users where lower(email) = new.email limit 1);
  end if;
  return new;
end;
$$;

drop trigger if exists clients_link_user on public.clients;
create trigger clients_link_user
  before insert or update of email on public.clients
  for each row execute function public.link_existing_user();

create or replace function public.link_existing_coach()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.user_id := coalesce(new.user_id, (select id from auth.users where lower(email) = new.email limit 1));
  return new;
end;
$$;

drop trigger if exists coaches_link_user on public.coaches;
create trigger coaches_link_user
  before insert on public.coaches
  for each row execute function public.link_existing_coach();

-- ------------------------------------------------------- security rules

alter table public.coaches enable row level security;
alter table public.clients enable row level security;
alter table public.client_private enable row level security;
alter table public.progress_logs enable row level security;
alter table public.check_ins enable row level security;

-- Nothing is readable without signing in.
revoke all on public.coaches, public.clients, public.client_private, public.progress_logs, public.check_ins from anon;
-- Nobody edits the coach list from the app; add coaches here in the SQL editor.
revoke all on public.coaches from authenticated;

drop policy if exists "coach: everything" on public.clients;
create policy "coach: everything" on public.clients
  for all to authenticated using (public.is_coach()) with check (public.is_coach());

drop policy if exists "client: read own profile" on public.clients;
create policy "client: read own profile" on public.clients
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "coach: everything" on public.client_private;
create policy "coach: everything" on public.client_private
  for all to authenticated using (public.is_coach()) with check (public.is_coach());

drop policy if exists "coach: everything" on public.progress_logs;
create policy "coach: everything" on public.progress_logs
  for all to authenticated using (public.is_coach()) with check (public.is_coach());

drop policy if exists "client: own logs" on public.progress_logs;
create policy "client: own logs" on public.progress_logs
  for all to authenticated
  using (client_id = public.my_client_id())
  with check (client_id = public.my_client_id());

drop policy if exists "coach: everything" on public.check_ins;
create policy "coach: everything" on public.check_ins
  for all to authenticated using (public.is_coach()) with check (public.is_coach());

drop policy if exists "client: read own check-ins" on public.check_ins;
create policy "client: read own check-ins" on public.check_ins
  for select to authenticated using (client_id = public.my_client_id());

-- Clients can only send a fresh check-in for themselves, with no coach reply filled in.
drop policy if exists "client: send check-in" on public.check_ins;
create policy "client: send check-in" on public.check_ins
  for insert to authenticated
  with check (
    client_id = public.my_client_id()
    and submitted_by = 'client'
    and status = 'awaiting_coach'
    and coach_notes = ''
    and next_actions = ''
  );

grant execute on function public.is_coach(), public.my_client_id(), public.my_role() to authenticated;

-- ------------------------------------------------------ add the coach
-- Replace the email below with YOUR email (lower case), then run this line.
-- insert into public.coaches (email) values ('you@example.com') on conflict do nothing;
