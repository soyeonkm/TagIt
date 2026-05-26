-- Simple Database Setup for TagIt Automatic Tagging System
-- Use this script for step-by-step database setup (alternative to complete setup)
-- Run this in your Supabase SQL Editor step by step

-- Step 1: Add roster columns to existing projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS roster_type TEXT,
ADD COLUMN IF NOT EXISTS roster_data TEXT;

-- Step 2: Set default values for existing projects
UPDATE projects 
SET roster_type = 'url' 
WHERE roster_type IS NULL;

-- Step 3: Make roster_type NOT NULL
ALTER TABLE projects ALTER COLUMN roster_type SET NOT NULL;

-- Step 4: Add CHECK constraint for roster_type
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'projects_roster_type_check'
    ) THEN
        ALTER TABLE projects ADD CONSTRAINT projects_roster_type_check 
        CHECK (roster_type IN ('file', 'url'));
    END IF;
END $$;

-- Step 5: Create players table if it doesn't exist
CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  jersey_number INTEGER,
  position TEXT,
  team TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Create photos table if it doesn't exist
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

-- Step 7: Enable RLS on new tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Step 8: Create basic RLS policies for players
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

-- Step 9: Create basic RLS policies for photos
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

-- Step 10: Create basic indexes
CREATE INDEX IF NOT EXISTS idx_players_project_id ON players(project_id);
CREATE INDEX IF NOT EXISTS idx_photos_project_id ON photos(project_id);
CREATE INDEX IF NOT EXISTS idx_photos_file_path ON photos(file_path);

-- Step 11: Verify the setup
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name IN ('projects', 'players', 'photos')
ORDER BY table_name, ordinal_position;
