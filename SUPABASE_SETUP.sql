-- Run this script in your Supabase SQL Editor to set up the database

-- 1. Create the clockworks table
create table clockworks (
  "id" text primary key,
  "user_id" uuid references auth.users not null,
  "name" text not null,
  "icon" text not null,
  "color" text not null,
  "frequency" text not null,
  "lastCompleted" text,
  "nextDue" text not null,
  "streak" integer not null default 0,
  "completedDates" text[] not null default '{}',
  "missedDates" text[] not null default '{}',
  "skippedDates" text[] not null default '{}',
  "remindersEnabled" boolean not null default true,
  "startDate" text not null,
  "endDate" text,
  "notes" text,
  "dueDateOffset" integer not null default 0,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table clockworks enable row level security;

-- 3. Create Security Policies

-- Policy: Users can see their own clockworks
create policy "Users can see their own clockworks"
  on clockworks for select
  using ( auth.uid() = user_id );

-- Policy: Users can insert their own clockworks
create policy "Users can insert their own clockworks"
  on clockworks for insert
  with check ( auth.uid() = user_id );

-- Policy: Users can update their own clockworks
create policy "Users can update their own clockworks"
  on clockworks for update
  using ( auth.uid() = user_id );

-- Policy: Users can delete their own clockworks
create policy "Users can delete their own clockworks"
  on clockworks for delete
  using ( auth.uid() = user_id );

-- 4. Enable Realtime (Optional)
-- alter publication supabase_realtime add table clockworks;

-- 5. Create Profiles table for user settings
create table profiles (
  "id" uuid references auth.users on delete cascade not null primary key,
  "timezone" text not null default 'UTC',
  "updated_at" timestamp with time zone default now()
);

-- Enable RLS for profiles
alter table profiles enable row level security;

-- Profile Policies
create policy "Users can see their own profile"
  on profiles for select
  using ( auth.uid() = id );

create policy "Users can update their own profile"
  on profiles for update
  using ( auth.uid() = id );

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, timezone)
  values (new.id, 'UTC');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
