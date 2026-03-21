-- Enable pgcrypto extension
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
create type meeting_status as enum ('pending', 'recording', 'processing', 'completed', 'failed');
create type team_role as enum ('admin', 'member');
create type meeting_visibility as enum ('private', 'team', 'public');

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  consent_given boolean not null default false,
  consent_at timestamptz,
  email_verified boolean not null default false,
  plan_type text not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TEAMS
-- ============================================================
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TEAM MEMBERS
-- ============================================================
create table team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role team_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique(team_id, user_id)
);

-- ============================================================
-- MEETINGS
-- ============================================================
create table meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  title text not null default 'Untitled Meeting',
  status meeting_status not null default 'pending',
  visibility meeting_visibility not null default 'private',
  duration_seconds integer default 0,
  audio_storage_path text,
  share_token text unique,
  template_id uuid,
  calendar_event_id text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Full-text search index on meetings.title
create index meetings_title_fts_idx on meetings using gin(to_tsvector('english', title));
create index meetings_user_id_idx on meetings(user_id);
create index meetings_created_at_idx on meetings(created_at desc);

-- ============================================================
-- TRANSCRIPT SEGMENTS
-- ============================================================
create table transcript_segments (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  speaker text,
  content text not null,
  start_ms integer not null,
  end_ms integer not null,
  confidence text,
  created_at timestamptz not null default now()
);

-- Full-text search index on transcript content
create index transcript_segments_fts_idx on transcript_segments using gin(to_tsvector('english', content));
create index transcript_segments_meeting_id_idx on transcript_segments(meeting_id);

-- ============================================================
-- NOTES
-- ============================================================
create table notes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null unique references meetings(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null default '',
  summary text,
  action_items text,
  follow_up_email text,
  ai_processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TEMPLATES
-- ============================================================
create table templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  name text not null,
  description text,
  content text not null,
  is_built_in boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- USAGE TRACKING
-- ============================================================
create table usage_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  billing_period_start timestamptz not null,
  billing_period_end timestamptz not null,
  recording_minutes_used integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP TRIGGER
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, email_verified)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email_confirmed_at is not null
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update email_verified when email is confirmed
create or replace function public.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.profiles
    set email_verified = true, updated_at = now()
    where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_confirmed
  after update on auth.users
  for each row execute procedure public.handle_user_email_confirmed();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table meetings enable row level security;
alter table transcript_segments enable row level security;
alter table notes enable row level security;
alter table templates enable row level security;
alter table usage_tracking enable row level security;

-- PROFILES
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- TEAMS
create policy "Team members can view team"
  on teams for select
  using (id in (select team_id from team_members where user_id = auth.uid()));

create policy "Users can create teams"
  on teams for insert
  with check (owner_id = auth.uid());

create policy "Team owners can update team"
  on teams for update
  using (owner_id = auth.uid());

create policy "Team owners can delete team"
  on teams for delete
  using (owner_id = auth.uid());

-- TEAM MEMBERS
create policy "Team members can view team roster"
  on team_members for select
  using (team_id in (select team_id from team_members where user_id = auth.uid()));

create policy "Team admins can manage members"
  on team_members for all
  using (team_id in (
    select team_id from team_members where user_id = auth.uid() and role = 'admin'
  ));

-- MEETINGS
create policy "Users can view accessible meetings"
  on meetings for select
  using (
    user_id = auth.uid()
    or (visibility = 'team' and team_id in (select team_id from team_members where user_id = auth.uid()))
    or visibility = 'public'
  );

create policy "Users can create own meetings"
  on meetings for insert
  with check (user_id = auth.uid());

create policy "Users can update own meetings"
  on meetings for update
  using (user_id = auth.uid());

create policy "Users can delete own meetings"
  on meetings for delete
  using (user_id = auth.uid());

-- TRANSCRIPT SEGMENTS
create policy "Users can view accessible transcript segments"
  on transcript_segments for select
  using (
    meeting_id in (
      select id from meetings where
        user_id = auth.uid()
        or (visibility = 'team' and team_id in (select team_id from team_members where user_id = auth.uid()))
        or visibility = 'public'
    )
  );

create policy "Users can insert transcript segments for own meetings"
  on transcript_segments for insert
  with check (
    meeting_id in (select id from meetings where user_id = auth.uid())
  );

-- NOTES
create policy "Users can view accessible notes"
  on notes for select
  using (
    meeting_id in (
      select id from meetings where
        user_id = auth.uid()
        or (visibility = 'team' and team_id in (select team_id from team_members where user_id = auth.uid()))
        or visibility = 'public'
    )
  );

create policy "Users can manage own notes"
  on notes for all
  using (user_id = auth.uid());

-- TEMPLATES
create policy "Users can view accessible templates"
  on templates for select
  using (
    is_built_in = true
    or user_id = auth.uid()
    or (team_id is not null and team_id in (select team_id from team_members where user_id = auth.uid()))
  );

create policy "Users can manage own templates"
  on templates for all
  using (user_id = auth.uid() and is_built_in = false);

-- USAGE TRACKING
create policy "Users can view own usage"
  on usage_tracking for select
  using (user_id = auth.uid());

create policy "Service role can manage usage"
  on usage_tracking for all
  using (auth.uid() = user_id);
