-- Fix is_curator default value and add missing performance index
-- This migration addresses deployment concerns from code review

-- 1. Fix is_curator default value (should be FALSE, not TRUE)
ALTER TABLE profiles
ALTER COLUMN is_curator SET DEFAULT FALSE;

-- 2. Add partial index on is_curator for curator queries
-- Partial index only indexes TRUE values for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_curator
ON profiles(is_curator)
WHERE is_curator = TRUE;

-- 3. Backfill existing users with safe defaults
-- Set is_curator to FALSE for users who haven't explicitly chosen
UPDATE profiles
SET
  is_curator = COALESCE(is_curator, FALSE),
  discovery_preferences = COALESCE(discovery_preferences, ARRAY[]::TEXT[]),
  favorite_artists = COALESCE(favorite_artists, ARRAY[]::TEXT[])
WHERE is_curator IS NULL
   OR discovery_preferences IS NULL
   OR favorite_artists IS NULL;

COMMENT ON INDEX idx_profiles_is_curator IS 'Partial index for efficient curator lookups in recommendation algorithm';
