-- Add taste profile fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_curator BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS discovery_preferences TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS favorite_artists TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create taste_profile table for detailed genre ratings
CREATE TABLE IF NOT EXISTS taste_profile (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  genre TEXT NOT NULL,
  experience_level TEXT NOT NULL CHECK (experience_level IN ('discovering', 'regular', 'deep_diver')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (user_id, genre)
);

CREATE INDEX IF NOT EXISTS idx_taste_profile_user ON taste_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_taste_profile_genre ON taste_profile(genre);

-- Enable RLS
ALTER TABLE taste_profile ENABLE ROW LEVEL SECURITY;

-- Taste profile policies
DROP POLICY IF EXISTS "Users can view their own taste profile" ON taste_profile;
CREATE POLICY "Users can view their own taste profile"
ON taste_profile FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own taste profile" ON taste_profile;
CREATE POLICY "Users can update their own taste profile"
ON taste_profile FOR ALL
USING (auth.uid() = user_id);

COMMENT ON TABLE taste_profile IS 'Detailed taste profile for algorithmic curator matching';
COMMENT ON COLUMN profiles.is_curator IS 'Whether user wants to curate (vs just discover)';
COMMENT ON COLUMN profiles.discovery_preferences IS 'What user looks for: new_releases, deep_cuts, classics, experimental, lyrical, production';
COMMENT ON COLUMN profiles.favorite_artists IS 'User-provided favorite artists for taste matching';
