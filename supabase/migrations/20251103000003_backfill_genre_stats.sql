-- Backfill user_genre_stats from existing drops
-- This is a one-time operation to populate stats for existing data

-- Clear existing stats (in case this migration runs multiple times)
TRUNCATE user_genre_stats;

-- Populate genre stats from all existing drops
INSERT INTO user_genre_stats (user_id, genre, total_drops, total_saves_received, last_drop_at, activity_level)
SELECT
  d.user_id,
  genre,
  COUNT(*) as total_drops,
  COALESCE(SUM(d.save_count), 0) as total_saves_received,
  MAX(d.created_at) as last_drop_at,
  calculate_activity_level(COUNT(*)::INTEGER) as activity_level
FROM drops d
CROSS JOIN LATERAL UNNEST(d.genres) AS genre
WHERE d.genres IS NOT NULL AND array_length(d.genres, 1) > 0
GROUP BY d.user_id, genre
ON CONFLICT (user_id, genre) DO UPDATE
SET
  total_drops = EXCLUDED.total_drops,
  total_saves_received = EXCLUDED.total_saves_received,
  last_drop_at = EXCLUDED.last_drop_at,
  activity_level = EXCLUDED.activity_level;

-- Verify counts (output to migration log)
DO $$
DECLARE
  stats_count INTEGER;
  users_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO stats_count FROM user_genre_stats;
  SELECT COUNT(DISTINCT user_id) INTO users_count FROM user_genre_stats;

  RAISE NOTICE 'Backfill complete: % genre stats for % users', stats_count, users_count;
END $$;

COMMENT ON TABLE user_genre_stats IS 'Auto-populated by trigger on drops table. Shows user activity per genre.';

-- Rollback:
-- TRUNCATE user_genre_stats;
