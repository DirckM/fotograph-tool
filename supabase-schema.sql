-- Fotograph Tool - Supabase Database Schema
-- Run this in the Supabase SQL Editor to set up tables, RLS, and triggers.

-- 1. Profiles table (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Jobs table
create type job_feature as enum ('upscale', 'face_swap', 'try_on', 'consistency');
create type job_status as enum ('pending', 'processing', 'completed', 'failed');

create table if not exists jobs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  feature job_feature not null,
  status job_status default 'pending' not null,
  input_params jsonb default '{}'::jsonb,
  input_images text[] default '{}',
  result_image text,
  error_message text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists idx_jobs_user_id on jobs(user_id);
create index if not exists idx_jobs_status on jobs(status);
create index if not exists idx_jobs_created_at on jobs(created_at desc);

alter table jobs enable row level security;

create policy "Users can view own jobs"
  on jobs for select using (auth.uid() = user_id);

create policy "Users can create own jobs"
  on jobs for insert with check (auth.uid() = user_id);

create policy "Users can update own jobs"
  on jobs for update using (auth.uid() = user_id);

-- 3. Storage buckets
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true),
       ('results', 'results', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Users can upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can read own uploads"
  on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can read own results"
  on storage.objects for select to authenticated
  using (bucket_id = 'results' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Service can write results"
  on storage.objects for insert to service_role
  with check (bucket_id = 'results');
