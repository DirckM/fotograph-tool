-- Migration: preserve moodboard assets when a project is deleted
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

-- 1. Make project_id nullable
alter table project_assets
  alter column project_id drop not null;

-- 2. Replace ON DELETE CASCADE with ON DELETE SET NULL
-- First, find and drop the existing FK constraint, then recreate it.
-- The constraint name may vary; this uses the Supabase default naming convention.
alter table project_assets
  drop constraint project_assets_project_id_fkey;

alter table project_assets
  add constraint project_assets_project_id_fkey
    foreign key (project_id)
    references projects(id)
    on delete set null;
