-- Function to recommend curators based on taste profile
CREATE OR REPLACE FUNCTION recommend_curators_for_user(
  target_user_id UUID,
  limit_count INTEGER DEFAULT 12
)
RETURNS TABLE (
  curator_id UUID,
  username TEXT,
  display_name TEXT,
  curation_statement TEXT,
  avatar_url TEXT,
  follower_count INTEGER,
  total_drops INTEGER,
  top_genres TEXT[],
  match_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH user_taste AS (
    -- Get user's taste profile
    SELECT
      array_agg(genre) as preferred_genres,
      array_agg(CASE
        WHEN experience_level = 'deep_diver' THEN 3
        WHEN experience_level = 'regular' THEN 2
        ELSE 1
      END) as genre_weights
    FROM taste_profile
    WHERE user_id = target_user_id
  ),
  curator_scores AS (
    SELECT
      p.id,
      p.username,
      p.display_name,
      p.curation_statement,
      p.avatar_url,
      p.follower_count,
      p.total_drops,
      get_user_top_genres(p.id) as top_genres,
      -- Calculate match score based on:
      -- 1. Genre overlap (50% weight)
      -- 2. Curator activity level (30% weight)
      -- 3. Follower count as trust signal (20% weight)
      (
        -- Genre overlap score
        COALESCE(
          (SELECT COUNT(*)::NUMERIC * 0.5
           FROM unnest(get_user_top_genres(p.id)) curator_genre
           WHERE curator_genre = ANY((SELECT preferred_genres FROM user_taste))
          ),
          0
        ) +
        -- Activity score (normalized)
        (LEAST(p.total_drops::NUMERIC / 50, 1.0) * 0.3) +
        -- Trust score (normalized follower count)
        (LEAST(p.follower_count::NUMERIC / 100, 1.0) * 0.2)
      ) as score
    FROM profiles p
    WHERE p.id != target_user_id
      AND p.total_drops > 5  -- Only curators with meaningful activity
      AND p.is_curator = TRUE
      -- Exclude already followed curators
      AND NOT EXISTS (
        SELECT 1 FROM follows f
        WHERE f.follower_id = target_user_id
          AND f.following_id = p.id
      )
  )
  SELECT
    cs.id as curator_id,
    cs.username,
    cs.display_name,
    cs.curation_statement,
    cs.avatar_url,
    cs.follower_count,
    cs.total_drops,
    cs.top_genres,
    cs.score as match_score
  FROM curator_scores cs
  WHERE cs.score > 0
  ORDER BY cs.score DESC, cs.follower_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION recommend_curators_for_user IS 'Recommends curators based on taste profile match';
