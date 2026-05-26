-- Complete Database Setup for TagIt Automatic Tagging System
-- Use this script for NEW installations or when setting up from scratch
-- Run this in your Supabase SQL Editor to set up all required tables

-- 1. Create projects table with roster support
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  folder_path TEXT,
  roster_type TEXT NOT NULL CHECK (roster_type IN ('file', 'url')) DEFAULT 'url',
  roster_data TEXT,
  sport_type TEXT,
  team_classification TEXT CHECK (team_classification IN ('university', 'professional', 'amateur', 'other')),
  metadata_config JSONB DEFAULT '{}',
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create players table for storing roster information
CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  jersey_number INTEGER,
  position TEXT,
  team TEXT,
  school_name TEXT,
  sport_type TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create photos table for storing photo metadata and tagging information
CREATE TABLE IF NOT EXISTS photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  width INTEGER,
  height INTEGER,
  detected_players JSONB DEFAULT '[]',
  detected_faces JSONB DEFAULT '[]',
  detected_jersey_numbers JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create user profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Projects RLS Policies
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Players RLS Policies
CREATE POLICY "Users can view players of their projects" ON players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p WHERE p.id = players.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert players for their projects" ON players
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p WHERE p.id = players.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update players of their projects" ON players
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p WHERE p.id = players.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete players of their projects" ON players
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p WHERE p.id = players.project_id AND p.user_id = auth.uid()
    )
  );

-- Photos RLS Policies
CREATE POLICY "Users can view photos of their projects" ON photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p WHERE p.id = photos.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert photos for their projects" ON photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p WHERE p.id = photos.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update photos of their projects" ON photos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p WHERE p.id = photos.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete photos of their projects" ON photos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p WHERE p.id = photos.project_id AND p.user_id = auth.uid()
    )
  );

-- Profiles RLS Policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" ON profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_players_project_id ON players(project_id);
CREATE INDEX IF NOT EXISTS idx_photos_project_id ON photos(project_id);
CREATE INDEX IF NOT EXISTS idx_photos_file_path ON photos(file_path);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Add unique constraints (with proper error handling)
DO $$ 
BEGIN
    -- Add unique constraint for user project names
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_user_project_name' 
        AND table_name = 'projects'
    ) THEN
        ALTER TABLE projects ADD CONSTRAINT unique_user_project_name UNIQUE(user_id, name);
    END IF;
    
    -- Add unique constraint for project file paths
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_project_file' 
        AND table_name = 'photos'
    ) THEN
        ALTER TABLE photos ADD CONSTRAINT unique_project_file UNIQUE(project_id, file_path);
    END IF;
END $$;

-- Verify the setup
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name IN ('projects', 'players', 'photos', 'profiles')
ORDER BY table_name, ordinal_position;
