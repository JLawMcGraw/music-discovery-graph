-- Add indexes for efficient genre filtering and sorting on discover page

-- GIN index for genre_preferences array filtering (already exists in base schema, verify)
CREATE INDEX IF NOT EXISTS idx_profiles_genre_prefs
ON profiles USING GIN(genre_preferences);

-- Composite indexes for sorting combinations (used in discover page)
-- These support: WHERE total_drops > 0 ORDER BY follower_count DESC
CREATE INDEX IF NOT EXISTS idx_profiles_follower_count_drops
ON profiles(follower_count DESC, total_drops DESC)
WHERE total_drops > 0;

-- Support: WHERE total_drops > 0 ORDER BY total_drops DESC
CREATE INDEX IF NOT EXISTS idx_profiles_total_drops
ON profiles(total_drops DESC)
WHERE total_drops > 0;

-- Support: WHERE total_drops > 0 ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_profiles_created_at
ON profiles(created_at DESC)
WHERE total_drops > 0;

-- Comments for clarity
COMMENT ON INDEX idx_profiles_follower_count_drops IS 'Optimizes discover page sort by followers (default)';
COMMENT ON INDEX idx_profiles_total_drops IS 'Optimizes discover page sort by most active';
COMMENT ON INDEX idx_profiles_created_at IS 'Optimizes discover page sort by newest curators';

-- Rollback:
-- DROP INDEX IF EXISTS idx_profiles_follower_count_drops;
-- DROP INDEX IF EXISTS idx_profiles_total_drops;
-- DROP INDEX IF EXISTS idx_profiles_created_at;
-- Note: idx_profiles_genre_prefs is from base schema, keep it
