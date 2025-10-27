-- Migration: Remove Validation System, Add Pure Curation Model
-- Date: 2024-10-27
--
-- Changes:
-- 1. Remove validation/reputation tables and columns
-- 2. Add following system (asymmetric, Twitter-style)
-- 3. Add private save functionality
-- 4. Add curation statement to profiles
-- 5. Remove drop expiration/stakes
-- 6. Add weekly drop limit enforcement
-- 7. Simplify user_genre_stats for engagement only

-- ============================================================================
-- STEP 1: Remove Validation & Reputation System
-- ============================================================================

-- Drop validation-related tables
DROP TABLE IF EXISTS drop_validations CASCADE;
DROP TABLE IF EXISTS reputation_events CASCADE;
DROP TABLE IF EXISTS circles CASCADE;
DROP TABLE IF EXISTS circle_memberships CASCADE;

-- Remove reputation columns from profiles
ALTER TABLE profiles
  DROP COLUMN IF EXISTS trust_score,
  DROP COLUMN IF EXISTS reputation_available,
  DROP COLUMN IF EXISTS successful_drops,
  DROP COLUMN IF EXISTS failed_drops,
  DROP COLUMN IF EXISTS total_validations_given;

-- Remove validation/reputation columns from drops
ALTER TABLE drops
  DROP COLUMN IF EXISTS validation_score,
  DROP COLUMN IF EXISTS validation_count,
  DROP COLUMN IF EXISTS total_rating_sum,
  DROP COLUMN IF EXISTS reputation_stake,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS expires_at,
  DROP COLUMN IF EXISTS resolved_at;

-- ============================================================================
-- STEP 2: Add Following System (Asymmetric)
-- ============================================================================

CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
CREATE INDEX idx_follows_created ON follows(created_at DESC);

-- Add follower counts to profiles (denormalized for performance)
ALTER TABLE profiles
  ADD COLUMN follower_count INTEGER DEFAULT 0,
  ADD COLUMN following_count INTEGER DEFAULT 0;

-- Trigger to update follow counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
    UPDATE profiles SET follower_count = follower_count - 1 WHERE id = OLD.following_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER follow_counts_trigger
AFTER INSERT OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- ============================================================================
-- STEP 3: Add Private Save Functionality
-- ============================================================================

CREATE TABLE drop_saves (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drop_id UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (user_id, drop_id)
);

CREATE INDEX idx_saves_user ON drop_saves(user_id, created_at DESC);
CREATE INDEX idx_saves_drop ON drop_saves(drop_id);

-- Add save count to drops (only for internal use, not displayed)
ALTER TABLE drops ADD COLUMN save_count INTEGER DEFAULT 0;

-- Trigger to update save count
CREATE OR REPLACE FUNCTION update_drop_save_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE drops SET save_count = save_count + 1 WHERE id = NEW.drop_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE drops SET save_count = save_count - 1 WHERE id = OLD.drop_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER drop_save_count_trigger
AFTER INSERT OR DELETE ON drop_saves
FOR EACH ROW EXECUTE FUNCTION update_drop_save_count();

-- ============================================================================
-- STEP 4: Add Curation Statement & Enhanced Profile
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN curation_statement TEXT CHECK (curation_statement IS NULL OR LENGTH(curation_statement) <= 500),
  ADD COLUMN top_genres TEXT[]; -- Auto-calculated: top 3 genres by activity

-- ============================================================================
-- STEP 5: User Genre Stats (Simplified for Engagement Only)
-- ============================================================================

CREATE TABLE user_genre_stats (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  genre VARCHAR(100) NOT NULL,

  -- Activity statistics
  total_drops INTEGER DEFAULT 0,
  total_saves_received INTEGER DEFAULT 0,

  -- Activity level (qualitative)
  activity_level VARCHAR(20) DEFAULT 'exploring'
    CHECK (activity_level IN ('exploring', 'occasional', 'active', 'prolific')),

  -- Recency
  last_drop_at TIMESTAMP WITH TIME ZONE,
  first_drop_at TIMESTAMP WITH TIME ZONE,

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (user_id, genre)
);

CREATE INDEX idx_genre_stats_user ON user_genre_stats(user_id);
CREATE INDEX idx_genre_stats_genre ON user_genre_stats(genre, total_drops DESC);
CREATE INDEX idx_genre_stats_activity ON user_genre_stats(activity_level, last_drop_at DESC);

-- ============================================================================
-- STEP 6: Weekly Drop Limit Enforcement
-- ============================================================================

-- Function to get user's drop count for current week
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

-- Function to check if user can create drop
CREATE OR REPLACE FUNCTION can_create_drop(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_weekly_drop_count(user_uuid) < 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next reset time
CREATE OR REPLACE FUNCTION get_next_week_reset()
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  RETURN date_trunc('week', NOW()) + INTERVAL '1 week';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: Update Existing RLS Policies
-- ============================================================================

-- Follows policies
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows"
  ON follows FOR SELECT
  USING (true);

CREATE POLICY "Users can create own follows"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete own follows"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Drop saves policies (private)
ALTER TABLE drop_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saves"
  ON drop_saves FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own saves"
  ON drop_saves FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saves"
  ON drop_saves FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 8: Update Helper Functions
-- ============================================================================

-- Update drop creator stats (simplified)
CREATE OR REPLACE FUNCTION update_drop_creator_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Just update total drop count
  UPDATE profiles
  SET total_drops = total_drops + 1
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger for drop creation
DROP TRIGGER IF EXISTS drop_creator_stats_trigger ON drops;
CREATE TRIGGER drop_creator_stats_trigger
AFTER INSERT ON drops
FOR EACH ROW EXECUTE FUNCTION update_drop_creator_stats();

-- Function to update genre stats (run nightly)
CREATE OR REPLACE FUNCTION calculate_user_genre_stats()
RETURNS void AS $$
BEGIN
  -- Clear existing stats
  TRUNCATE user_genre_stats;

  -- Calculate stats from drops
  INSERT INTO user_genre_stats (
    user_id,
    genre,
    total_drops,
    total_saves_received,
    last_drop_at,
    first_drop_at,
    activity_level
  )
  SELECT
    d.user_id,
    unnest(d.genres) as genre,
    COUNT(*) as total_drops,
    SUM(d.save_count) as total_saves_received,
    MAX(d.created_at) as last_drop_at,
    MIN(d.created_at) as first_drop_at,
    CASE
      WHEN COUNT(*) >= 50 THEN 'prolific'
      WHEN COUNT(*) >= 20 THEN 'active'
      WHEN COUNT(*) >= 5 THEN 'occasional'
      ELSE 'exploring'
    END as activity_level
  FROM drops d
  WHERE d.genres IS NOT NULL
  GROUP BY d.user_id, unnest(d.genres);

  -- Update top_genres in profiles (top 3 by drop count)
  UPDATE profiles p
  SET top_genres = (
    SELECT ARRAY_AGG(genre ORDER BY total_drops DESC)
    FROM (
      SELECT genre, total_drops
      FROM user_genre_stats
      WHERE user_id = p.id
      ORDER BY total_drops DESC
      LIMIT 3
    ) top
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 9: Clean up old functions/triggers
-- ============================================================================

DROP TRIGGER IF EXISTS reputation_update_trigger ON reputation_events;
DROP TRIGGER IF EXISTS drop_validation_stats_trigger ON drop_validations;
DROP TRIGGER IF EXISTS increment_clicks_trigger ON platform_clicks;
DROP TRIGGER IF EXISTS enforce_circle_limit ON circle_memberships;
DROP TRIGGER IF EXISTS circle_member_count_trigger ON circle_memberships;

DROP FUNCTION IF EXISTS update_trust_score() CASCADE;
DROP FUNCTION IF EXISTS update_drop_validation_stats() CASCADE;
DROP FUNCTION IF EXISTS check_circle_capacity() CASCADE;
DROP FUNCTION IF EXISTS update_circle_member_count() CASCADE;
DROP FUNCTION IF EXISTS get_user_success_rate(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_trending_drops(INTEGER) CASCADE;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE follows IS 'Asymmetric following relationships (Twitter-style)';
COMMENT ON TABLE drop_saves IS 'Private user saves of drops (not publicly visible)';
COMMENT ON TABLE user_genre_stats IS 'Genre-specific activity stats for discovery';
COMMENT ON COLUMN profiles.curation_statement IS 'User-written description of their curation philosophy';
COMMENT ON COLUMN profiles.top_genres IS 'Auto-calculated top 3 genres by activity';
COMMENT ON FUNCTION get_weekly_drop_count(UUID) IS 'Returns drop count for current week (Monday-Sunday)';
COMMENT ON FUNCTION can_create_drop(UUID) IS 'Checks if user can create drop (weekly limit: 10)';
