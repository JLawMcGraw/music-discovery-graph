-- Create function to search curators by genre at database level
-- Searches both genre_preferences and top_genres (computed from user_genre_stats)
-- Replaces client-side filtering for better performance

CREATE OR REPLACE FUNCTION search_curators_by_genre(
  search_genre TEXT DEFAULT NULL,
  sort_by TEXT DEFAULT 'followers',
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  bio TEXT,
  curation_statement TEXT,
  avatar_url TEXT,
  follower_count INTEGER,
  following_count INTEGER,
  total_drops INTEGER,
  genre_preferences TEXT[],
  top_genres TEXT[],
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH curator_data AS (
    SELECT
      p.id,
      p.username,
      p.display_name,
      p.bio,
      p.curation_statement,
      p.avatar_url,
      p.follower_count,
      p.following_count,
      p.total_drops,
      p.genre_preferences,
      get_user_top_genres(p.id) as top_genres,
      p.created_at
    FROM profiles p
    WHERE p.total_drops > 0
      AND (
        search_genre IS NULL
        OR p.genre_preferences @> ARRAY[search_genre]
        OR search_genre = ANY(get_user_top_genres(p.id))
      )
  )
  SELECT
    cd.id,
    cd.username,
    cd.display_name,
    cd.bio,
    cd.curation_statement,
    cd.avatar_url,
    cd.follower_count,
    cd.following_count,
    cd.total_drops,
    cd.genre_preferences,
    cd.top_genres,
    cd.created_at
  FROM curator_data cd
  ORDER BY
    CASE WHEN sort_by = 'followers' THEN cd.follower_count END DESC NULLS LAST,
    CASE WHEN sort_by = 'active' THEN cd.total_drops END DESC NULLS LAST,
    CASE WHEN sort_by = 'new' THEN cd.created_at END DESC NULLS LAST
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION search_curators_by_genre IS 'Database-level curator search with genre filtering. Searches genre_preferences and computed top_genres. Supports sorting by followers/active/newest.';

-- Rollback:
-- DROP FUNCTION IF EXISTS search_curators_by_genre(TEXT, TEXT, INTEGER);
