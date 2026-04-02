-- Fotograph Tool - Supabase Database Schema
-- Run this in the Supabase SQL Editor to set up tables, RLS, and triggers.

-- 1. Profiles table (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  onboarding_completed boolean default false,
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
create type job_feature as enum ('upscale', 'face_swap', 'try_on', 'consistency', 'model_generation', 'environment_generation', 'pose_generation', 'final_composite');
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

-- 4. Projects table
create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  description text,
  employer_name text,
  employer_notes text,
  context_text text,
  current_stage int default 0 not null,
  status text default 'active' not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_projects_user_id on projects(user_id);

alter table projects enable row level security;

create policy "Users can view own projects"
  on projects for select using (auth.uid() = user_id);

create policy "Users can create own projects"
  on projects for insert with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on projects for update using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on projects for delete using (auth.uid() = user_id);

-- 5. Project assets table
create table if not exists project_assets (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  stage int not null,
  asset_type text not null,
  role text,
  storage_path text,
  external_url text,
  source text not null check (source in ('upload', 'pinterest', 'gemini', 'library')),
  metadata jsonb default '{}'::jsonb,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_project_assets_project_id on project_assets(project_id);
create index if not exists idx_project_assets_stage on project_assets(project_id, stage);

alter table project_assets enable row level security;

create policy "Users can view own project assets"
  on project_assets for select using (auth.uid() = user_id);

create policy "Users can create own project assets"
  on project_assets for insert with check (auth.uid() = user_id);

create policy "Users can update own project assets"
  on project_assets for update using (auth.uid() = user_id);

create policy "Users can delete own project assets"
  on project_assets for delete using (auth.uid() = user_id);

-- 6. Project stage state table
create table if not exists project_stage_state (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  stage int not null,
  state jsonb default '{}'::jsonb,
  approved_at timestamptz,
  unique(project_id, stage)
);

alter table project_stage_state enable row level security;

create policy "Users can view own stage state"
  on project_stage_state for select
  using (exists (select 1 from projects where projects.id = project_stage_state.project_id and projects.user_id = auth.uid()));

create policy "Users can create own stage state"
  on project_stage_state for insert
  with check (exists (select 1 from projects where projects.id = project_stage_state.project_id and projects.user_id = auth.uid()));

create policy "Users can update own stage state"
  on project_stage_state for update
  using (exists (select 1 from projects where projects.id = project_stage_state.project_id and projects.user_id = auth.uid()));

-- 7. Add project reference to jobs table
alter table jobs add column if not exists project_id uuid references projects(id) on delete set null;
alter table jobs add column if not exists stage int;

create index if not exists idx_jobs_project_id on jobs(project_id);

-- 8. Project assets storage bucket
insert into storage.buckets (id, name, public)
values ('project-assets', 'project-assets', true)
on conflict (id) do nothing;

create policy "Users can upload project assets"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'project-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can read own project assets"
  on storage.objects for select to authenticated
  using (bucket_id = 'project-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Service can write project assets"
  on storage.objects for insert to service_role
  with check (bucket_id = 'project-assets');
