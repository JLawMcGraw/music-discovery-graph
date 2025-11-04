-- Fresh Database Schema: Pure Curation Model
-- Date: 2024-10-28
-- Description: Complete schema for DeepCuts pure curation platform

-- ============================================================================
-- User Profiles
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  curation_statement TEXT CHECK (char_length(curation_statement) <= 500),
  genre_preferences TEXT[], -- Up to 5 genres
  avatar_url TEXT,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  total_drops INTEGER DEFAULT 0,
  onboarded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_genre_prefs ON profiles USING GIN(genre_preferences);

-- ============================================================================
-- Drops (Music Recommendations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Track metadata (platform-agnostic)
  track_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_name TEXT,
  album_art_url TEXT,
  platform TEXT DEFAULT 'spotify',

  -- Curation content
  context TEXT NOT NULL CHECK (char_length(context) BETWEEN 50 AND 2000),
  listening_notes TEXT CHECK (listening_notes IS NULL OR char_length(listening_notes) <= 1000),
  genres TEXT[],
  moods TEXT[],

  -- Engagement (internal only)
  save_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drops_user_id ON drops(user_id);
CREATE INDEX IF NOT EXISTS idx_drops_created_at ON drops(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drops_genres ON drops USING GIN(genres);

-- ============================================================================
-- Following System (Asymmetric)
-- ============================================================================

CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- Update follower counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET follower_count = follower_count + 1
    WHERE id = NEW.following_id;

    UPDATE profiles SET following_count = following_count + 1
    WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET follower_count = follower_count - 1
    WHERE id = OLD.following_id;

    UPDATE profiles SET following_count = following_count - 1
    WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS follow_count_trigger ON follows;
CREATE TRIGGER follow_count_trigger
AFTER INSERT OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- ============================================================================
-- Private Saves
-- ============================================================================

CREATE TABLE IF NOT EXISTS drop_saves (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  drop_id UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (user_id, drop_id)
);

CREATE INDEX IF NOT EXISTS idx_drop_saves_user ON drop_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_drop_saves_drop ON drop_saves(drop_id);
CREATE INDEX IF NOT EXISTS idx_drop_saves_created ON drop_saves(created_at DESC);

-- Update save count on drops
CREATE OR REPLACE FUNCTION update_save_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE drops SET save_count = save_count + 1
    WHERE id = NEW.drop_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE drops SET save_count = save_count - 1
    WHERE id = OLD.drop_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS save_count_trigger ON drop_saves;
CREATE TRIGGER save_count_trigger
AFTER INSERT OR DELETE ON drop_saves
FOR EACH ROW EXECUTE FUNCTION update_save_count();

-- ============================================================================
-- Genre Stats (Taste Areas)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_genre_stats (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  genre TEXT NOT NULL,
  total_drops INTEGER DEFAULT 0,
  total_saves_received INTEGER DEFAULT 0,
  activity_level TEXT, -- exploring, occasional, active, prolific
  last_drop_at TIMESTAMP WITH TIME ZONE,

  PRIMARY KEY (user_id, genre)
);

CREATE INDEX IF NOT EXISTS idx_genre_stats_user ON user_genre_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_genre_stats_genre ON user_genre_stats(genre);

-- Calculate activity level
CREATE OR REPLACE FUNCTION calculate_activity_level(drop_count INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN drop_count < 5 THEN 'exploring'
    WHEN drop_count < 20 THEN 'occasional'
    WHEN drop_count < 50 THEN 'active'
    ELSE 'prolific'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Platform Clicks (Attribution Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_clicks_drop ON platform_clicks(drop_id);
CREATE INDEX IF NOT EXISTS idx_platform_clicks_date ON platform_clicks(clicked_at);

-- ============================================================================
-- Weekly Drop Limit Functions
-- ============================================================================

-- Get count of drops posted this week (Monday 00:00 UTC = week start)
CREATE OR REPLACE FUNCTION get_weekly_drop_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  drop_count INTEGER;
  week_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate start of current week (Monday 00:00 UTC)
  week_start := date_trunc('week', NOW());

  SELECT COUNT(*) INTO drop_count
  FROM drops
  WHERE user_id = user_uuid
    AND created_at >= week_start;

  RETURN drop_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get next reset time (next Monday 00:00 UTC)
CREATE OR REPLACE FUNCTION get_next_week_reset()
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  RETURN date_trunc('week', NOW()) + INTERVAL '1 week';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Row-Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE drop_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_genre_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_clicks ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read, users can update their own
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Drops: Public read, users can manage their own
DROP POLICY IF EXISTS "Drops are viewable by everyone" ON drops;
CREATE POLICY "Drops are viewable by everyone"
ON drops FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can create their own drops" ON drops;
CREATE POLICY "Users can create their own drops"
ON drops FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own drops" ON drops;
CREATE POLICY "Users can update their own drops"
ON drops FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own drops" ON drops;
CREATE POLICY "Users can delete their own drops"
ON drops FOR DELETE
USING (auth.uid() = user_id);

-- Follows: Public read, users can manage their own follows
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON follows;
CREATE POLICY "Follows are viewable by everyone"
ON follows FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can follow others" ON follows;
CREATE POLICY "Users can follow others"
ON follows FOR INSERT
WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON follows;
CREATE POLICY "Users can unfollow"
ON follows FOR DELETE
USING (auth.uid() = follower_id);

-- Drop Saves: Private - users can only see/manage their own
DROP POLICY IF EXISTS "Users can view their own saves" ON drop_saves;
CREATE POLICY "Users can view their own saves"
ON drop_saves FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can save drops" ON drop_saves;
CREATE POLICY "Users can save drops"
ON drop_saves FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unsave drops" ON drop_saves;
CREATE POLICY "Users can unsave drops"
ON drop_saves FOR DELETE
USING (auth.uid() = user_id);

-- Genre Stats: Public read
DROP POLICY IF EXISTS "Genre stats are viewable by everyone" ON user_genre_stats;
CREATE POLICY "Genre stats are viewable by everyone"
ON user_genre_stats FOR SELECT
USING (true);

-- Platform Clicks: Public write (for anonymous tracking)
DROP POLICY IF EXISTS "Anyone can record clicks" ON platform_clicks;
CREATE POLICY "Anyone can record clicks"
ON platform_clicks FOR INSERT
WITH CHECK (true);
