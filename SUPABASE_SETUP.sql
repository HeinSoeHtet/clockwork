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
