-- Rosters: one row per uploaded roster PDF. Players belong to a roster.
-- Run in the Supabase SQL Editor.
--
-- WARNING: this DROPS the old flat `players` table. Those rows have no roster grouping,
-- so re-upload your roster PDFs after running this.

DROP TABLE IF EXISTS players CASCADE;

CREATE TABLE IF NOT EXISTS rosters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  roster_id UUID NOT NULL REFERENCES rosters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- TEXT so '0' and '00' stay distinct
  jersey_number TEXT
);

CREATE INDEX IF NOT EXISTS idx_players_roster_id ON players(roster_id);

ALTER TABLE rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own rosters" ON rosters;
CREATE POLICY "Users manage their own rosters" ON rosters
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage players of their rosters" ON players
  FOR ALL
  USING (EXISTS (SELECT 1 FROM rosters r WHERE r.id = players.roster_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM rosters r WHERE r.id = players.roster_id AND r.user_id = auth.uid()));

-- User-chosen roster name (added later; safe to re-run). Existing rosters get their file name.
ALTER TABLE rosters ADD COLUMN IF NOT EXISTS name TEXT;
UPDATE rosters SET name = file_name WHERE name IS NULL;
ALTER TABLE rosters ALTER COLUMN name SET NOT NULL;
