-- Safe Database Migration for TagIt Automatic Tagging System
-- Use this script for EXISTING databases that need to be updated
-- Run this in your Supabase SQL Editor - it checks for existing objects first

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

-- Step 8: Create RLS policies for players (only if they don't exist)
DO $$ 
BEGIN
    -- Players SELECT policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'players' 
        AND policyname = 'Users can view players of their projects'
    ) THEN
        CREATE POLICY "Users can view players of their projects" ON players
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM projects p WHERE p.id = players.project_id AND p.user_id = auth.uid()
            )
        );
    END IF;
    
    -- Players INSERT policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'players' 
        AND policyname = 'Users can insert players for their projects'
    ) THEN
        CREATE POLICY "Users can insert players for their projects" ON players
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM projects p WHERE p.id = players.project_id AND p.user_id = auth.uid()
            )
        );
    END IF;
    
    -- Players UPDATE policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'players' 
        AND policyname = 'Users can update players of their projects'
    ) THEN
        CREATE POLICY "Users can update players of their projects" ON players
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM projects p WHERE p.id = players.project_id AND p.user_id = auth.uid()
            )
        );
    END IF;
    
    -- Players DELETE policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'players' 
        AND policyname = 'Users can delete players of their projects'
    ) THEN
        CREATE POLICY "Users can delete players of their projects" ON players
        FOR DELETE USING (
            EXISTS (
                SELECT 1 FROM projects p WHERE p.id = players.project_id AND p.user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Step 9: Create RLS policies for photos (only if they don't exist)
DO $$ 
BEGIN
    -- Photos SELECT policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'photos' 
        AND policyname = 'Users can view photos of their projects'
    ) THEN
        CREATE POLICY "Users can view photos of their projects" ON photos
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM projects p WHERE p.id = photos.project_id AND p.user_id = auth.uid()
            )
        );
    END IF;
    
    -- Photos INSERT policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'photos' 
        AND policyname = 'Users can insert photos for their projects'
    ) THEN
        CREATE POLICY "Users can insert photos for their projects" ON photos
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM projects p WHERE p.id = photos.project_id AND p.user_id = auth.uid()
            )
        );
    END IF;
    
    -- Photos UPDATE policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'photos' 
        AND policyname = 'Users can update photos of their projects'
    ) THEN
        CREATE POLICY "Users can update photos of their projects" ON photos
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM projects p WHERE p.id = photos.project_id AND p.user_id = auth.uid()
            )
        );
    END IF;
    
    -- Photos DELETE policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'photos' 
        AND policyname = 'Users can delete photos of their projects'
    ) THEN
        CREATE POLICY "Users can delete photos of their projects" ON photos
        FOR DELETE USING (
            EXISTS (
                SELECT 1 FROM projects p WHERE p.id = photos.project_id AND p.user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Step 10: Create basic indexes (only if they don't exist)
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

-- Step 12: Show existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('players', 'photos')
ORDER BY tablename, policyname;

-- Safe Database Migration for TagIt - Add Sport Type and Team Classification
-- This script safely adds new fields to existing databases without data loss
-- Run this in your Supabase SQL Editor to upgrade existing installations

-- Step 1: Add roster columns to existing projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS roster_type TEXT,
ADD COLUMN IF NOT EXISTS roster_data TEXT;

-- Step 2: Set default roster_type for existing projects
UPDATE projects 
SET roster_type = 'url'
WHERE roster_type IS NULL;

-- Step 3: Make roster_type NOT NULL
ALTER TABLE projects ALTER COLUMN roster_type SET NOT NULL;

-- Step 4: Add CHECK constraint for roster_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'projects_roster_type_check'
    ) THEN
        ALTER TABLE projects ADD CONSTRAINT projects_roster_type_check
        CHECK (roster_type IN ('file', 'url'));
    END IF;
END $$;

-- Step 5: Add new sport type and team classification fields to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS sport_type TEXT,
ADD COLUMN IF NOT EXISTS team_classification TEXT;

-- Step 6: Add CHECK constraint for team_classification
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'projects_team_classification_check'
    ) THEN
        ALTER TABLE projects ADD CONSTRAINT projects_team_classification_check
        CHECK (team_classification IN ('university', 'professional', 'amateur', 'other'));
    END IF;
END $$;

-- Step 7: Add new fields to players table
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS school_name TEXT,
ADD COLUMN IF NOT EXISTS sport_type TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Step 8: Create index for better query performance on sport_type
CREATE INDEX IF NOT EXISTS idx_projects_sport_type ON projects(sport_type);
CREATE INDEX IF NOT EXISTS idx_projects_team_classification ON projects(team_classification);
CREATE INDEX IF NOT EXISTS idx_players_sport_type ON players(sport_type);
CREATE INDEX IF NOT EXISTS idx_players_school_name ON players(school_name);

-- Step 9: Update existing projects to have default team classification
UPDATE projects 
SET team_classification = 'other'
WHERE team_classification IS NULL;

-- Step 10: Update existing players to have default sport type from their project
UPDATE players 
SET sport_type = (
    SELECT sport_type FROM projects WHERE projects.id = players.project_id
)
WHERE sport_type IS NULL;
