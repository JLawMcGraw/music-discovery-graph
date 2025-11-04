-- Add computed function to get top genres for a user
-- Returns array of top 5 genres by drop count

CREATE OR REPLACE FUNCTION get_user_top_genres(user_uuid UUID)
RETURNS TEXT[] AS $$
BEGIN
  RETURN (
    SELECT ARRAY_AGG(genre ORDER BY total_drops DESC)
    FROM (
      SELECT genre
      FROM user_genre_stats
      WHERE user_id = user_uuid
      ORDER BY total_drops DESC
      LIMIT 5
    ) top_five
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_top_genres IS 'Returns top 5 genres for a user based on drop count in user_genre_stats';

-- Rollback:
-- DROP FUNCTION IF EXISTS get_user_top_genres(UUID);
