-- TagIt database schema. Run in the Supabase SQL Editor.
-- Idempotent: safe to re-run on a fresh or an existing database; never drops data.

-- Projects: a photo folder + the roster used to tag it
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  folder_path TEXT,
  roster_type TEXT NOT NULL CHECK (roster_type IN ('file', 'url')) DEFAULT 'url',
  -- roster id when roster_type = 'file'
  roster_data TEXT,
  sport_type TEXT,
  team_classification TEXT CHECK (team_classification IN ('university', 'professional', 'amateur', 'other')),
  metadata_config JSONB DEFAULT '{}',
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_project_name UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rosters: one row per uploaded roster PDF
CREATE TABLE IF NOT EXISTS rosters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  -- SHA-256 of the PDF bytes; the same PDF can't be saved twice per user
  pdf_hash TEXT NOT NULL,
  sport TEXT NOT NULL,
  -- Always two consecutive years, e.g. '2026-2027'
  season TEXT NOT NULL CHECK (
    season ~ '^[0-9]{4}-[0-9]{4}$'
    AND split_part(season, '-', 2)::int = split_part(season, '-', 1)::int + 1
  ),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, pdf_hash)
);

CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  roster_id UUID NOT NULL REFERENCES rosters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- TEXT so '0' and '00' stay distinct
  jersey_number TEXT
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_players_roster_id ON players(roster_id);

-- Row Level Security: every row belongs to auth.uid()
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own projects" ON projects;
CREATE POLICY "Users manage their own projects" ON projects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage their own profile" ON profiles;
CREATE POLICY "Users manage their own profile" ON profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage their own rosters" ON rosters;
CREATE POLICY "Users manage their own rosters" ON rosters
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage players of their rosters" ON players;
CREATE POLICY "Users manage players of their rosters" ON players
  FOR ALL
  USING (EXISTS (SELECT 1 FROM rosters r WHERE r.id = players.roster_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM rosters r WHERE r.id = players.roster_id AND r.user_id = auth.uid()));
