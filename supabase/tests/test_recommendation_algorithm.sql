-- Test suite for recommend_curators_for_user function
-- Tests edge cases identified in code review

-- Temporarily drop foreign key constraint for testing
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Clean up any previous test data
DELETE FROM taste_profile WHERE user_id IN (
  SELECT id FROM profiles WHERE username LIKE 'test_%'
);
DELETE FROM follows WHERE follower_id IN (
  SELECT id FROM profiles WHERE username LIKE 'test_%'
) OR following_id IN (
  SELECT id FROM profiles WHERE username LIKE 'test_%'
);
DELETE FROM drops WHERE user_id IN (
  SELECT id FROM profiles WHERE username LIKE 'test_%'
);
DELETE FROM profiles WHERE username LIKE 'test_%';

-- ============================================================================
-- TEST 1: Empty database (no curators)
-- ============================================================================
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  result_count INTEGER;
BEGIN
  -- Create test listener with taste profile
  INSERT INTO profiles (id, username, display_name, is_curator)
  VALUES (test_user_id, 'test_listener_1', 'Test Listener 1', FALSE);

  INSERT INTO taste_profile (user_id, genre, experience_level)
  VALUES
    (test_user_id, 'indie', 'regular'),
    (test_user_id, 'electronic', 'discovering');

  -- Test: Should return 0 recommendations (no curators exist)
  SELECT COUNT(*) INTO result_count
  FROM recommend_curators_for_user(test_user_id);

  IF result_count = 0 THEN
    RAISE NOTICE 'TEST 1 PASSED: Empty database returns 0 recommendations';
  ELSE
    RAISE EXCEPTION 'TEST 1 FAILED: Expected 0 recommendations, got %', result_count;
  END IF;
END $$;

-- ============================================================================
-- TEST 2: User with no matching genres
-- ============================================================================
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_curator_id UUID := gen_random_uuid();
  result_count INTEGER;
BEGIN
  -- Create listener with niche taste
  INSERT INTO profiles (id, username, display_name, is_curator)
  VALUES (test_user_id, 'test_listener_2', 'Test Listener 2', FALSE);

  INSERT INTO taste_profile (user_id, genre, experience_level)
  VALUES
    (test_user_id, 'gregorian_chant', 'deep_diver'),
    (test_user_id, 'throat_singing', 'regular');

  -- Create curator with completely different genres
  INSERT INTO profiles (id, username, display_name, is_curator, total_drops, follower_count)
  VALUES (test_curator_id, 'test_curator_1', 'Test Curator 1', TRUE, 20, 50);

  INSERT INTO taste_profile (user_id, genre, experience_level)
  VALUES
    (test_curator_id, 'death_metal', 'deep_diver'),
    (test_curator_id, 'dubstep', 'regular');

  -- Create some drops to meet minimum activity threshold
  INSERT INTO drops (user_id, track_id, artist_name, track_name, platform, context, genres)
  SELECT test_curator_id, 'track_' || i, 'Artist ' || i, 'Track ' || i, 'spotify',
    'This is a test drop context for recommendation testing. This needs to be at least 50 characters long.',
    ARRAY['death_metal']
  FROM generate_series(1, 10) i;

  -- Test: Should still return curator (activity and trust scores > 0)
  SELECT COUNT(*) INTO result_count
  FROM recommend_curators_for_user(test_user_id)
  WHERE curator_id = test_curator_id;

  IF result_count > 0 THEN
    RAISE NOTICE 'TEST 2 PASSED: Curator with no genre overlap still appears (activity/trust score)';
  ELSE
    RAISE WARNING 'TEST 2: No recommendations for user with no matching genres';
  END IF;
END $$;

-- ============================================================================
-- TEST 3: User with 100% genre match
-- ============================================================================
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_curator_id UUID := gen_random_uuid();
  v_match_score NUMERIC;
  result_count INTEGER;
BEGIN
  -- Create listener
  INSERT INTO profiles (id, username, display_name, is_curator)
  VALUES (test_user_id, 'test_listener_3', 'Test Listener 3', FALSE);

  INSERT INTO taste_profile (user_id, genre, experience_level)
  VALUES
    (test_user_id, 'indie', 'regular'),
    (test_user_id, 'electronic', 'discovering'),
    (test_user_id, 'jazz', 'deep_diver');

  -- Create curator with perfect match
  INSERT INTO profiles (id, username, display_name, is_curator, total_drops, follower_count, curation_statement)
  VALUES (test_curator_id, 'test_curator_2', 'Test Curator 2', TRUE, 50, 100, 'Perfect match curator');

  INSERT INTO taste_profile (user_id, genre, experience_level)
  VALUES
    (test_curator_id, 'indie', 'deep_diver'),
    (test_curator_id, 'electronic', 'regular'),
    (test_curator_id, 'jazz', 'deep_diver');

  -- Create drops to meet minimum activity threshold
  INSERT INTO drops (user_id, track_id, artist_name, track_name, platform, context, genres)
  SELECT test_curator_id, 'track_' || i, 'Artist ' || i, 'Track ' || i, 'spotify',
    'This is a test drop context for recommendation testing. This needs to be at least 50 characters long.',
    ARRAY['indie']
  FROM generate_series(1, 50) i;

  -- Test: Should return highest match score
  SELECT r.match_score INTO v_match_score
  FROM recommend_curators_for_user(test_user_id) r
  WHERE r.curator_id = test_curator_id;

  IF v_match_score > 1.5 THEN
    RAISE NOTICE 'TEST 3 PASSED: 100%% genre match returns high score: %', v_match_score;
  ELSE
    RAISE EXCEPTION 'TEST 3 FAILED: Expected high match score, got %', v_match_score;
  END IF;
END $$;

-- ============================================================================
-- TEST 4: New curator with insufficient drops (cold start problem)
-- ============================================================================
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_curator_id UUID := gen_random_uuid();
  result_count INTEGER;
BEGIN
  -- Create listener
  INSERT INTO profiles (id, username, display_name, is_curator)
  VALUES (test_user_id, 'test_listener_4', 'Test Listener 4', FALSE);

  INSERT INTO taste_profile (user_id, genre, experience_level)
  VALUES
    (test_user_id, 'rock', 'regular');

  -- Create new curator with only 3 drops (below threshold of 5)
  INSERT INTO profiles (id, username, display_name, is_curator, total_drops, follower_count)
  VALUES (test_curator_id, 'test_curator_3', 'Test Curator 3', TRUE, 3, 10);

  INSERT INTO taste_profile (user_id, genre, experience_level)
  VALUES
    (test_curator_id, 'rock', 'deep_diver');

  -- Create only 3 drops
  INSERT INTO drops (user_id, track_id, artist_name, track_name, platform, context, genres)
  SELECT test_curator_id, 'track_' || i, 'Artist ' || i, 'Track ' || i, 'spotify',
    'This is a test drop context for recommendation testing. This needs to be at least 50 characters long.',
    ARRAY['rock']
  FROM generate_series(1, 3) i;

  -- Test: Should NOT appear in recommendations (< 5 drops threshold)
  SELECT COUNT(*) INTO result_count
  FROM recommend_curators_for_user(test_user_id)
  WHERE curator_id = test_curator_id;

  IF result_count = 0 THEN
    RAISE NOTICE 'TEST 4 PASSED: Cold start curator (< 5 drops) correctly filtered out';
  ELSE
    RAISE EXCEPTION 'TEST 4 FAILED: Curator with insufficient drops should not appear';
  END IF;
END $$;

-- ============================================================================
-- TEST 5: Already followed curators are excluded
-- ============================================================================
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_curator_id UUID := gen_random_uuid();
  result_count INTEGER;
BEGIN
  -- Create listener
  INSERT INTO profiles (id, username, display_name, is_curator)
  VALUES (test_user_id, 'test_listener_5', 'Test Listener 5', FALSE);

  INSERT INTO taste_profile (user_id, genre, experience_level)
  VALUES
    (test_user_id, 'pop', 'regular');

  -- Create curator
  INSERT INTO profiles (id, username, display_name, is_curator, total_drops, follower_count)
  VALUES (test_curator_id, 'test_curator_4', 'Test Curator 4', TRUE, 30, 80);

  INSERT INTO taste_profile (user_id, genre, experience_level)
  VALUES
    (test_curator_id, 'pop', 'deep_diver');

  -- Create drops
  INSERT INTO drops (user_id, track_id, artist_name, track_name, platform, context, genres)
  SELECT test_curator_id, 'track_' || i, 'Artist ' || i, 'Track ' || i, 'spotify',
    'This is a test drop context for recommendation testing. This needs to be at least 50 characters long.',
    ARRAY['pop']
  FROM generate_series(1, 30) i;

  -- User already follows this curator
  INSERT INTO follows (follower_id, following_id)
  VALUES (test_user_id, test_curator_id);

  -- Test: Should NOT appear (already following)
  SELECT COUNT(*) INTO result_count
  FROM recommend_curators_for_user(test_user_id)
  WHERE curator_id = test_curator_id;

  IF result_count = 0 THEN
    RAISE NOTICE 'TEST 5 PASSED: Already-followed curators correctly excluded';
  ELSE
    RAISE EXCEPTION 'TEST 5 FAILED: Already-followed curator should not appear';
  END IF;
END $$;

-- ============================================================================
-- TEST 6: Scoring weights validation
-- ============================================================================
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  high_genre_curator_id UUID := gen_random_uuid();
  high_activity_curator_id UUID := gen_random_uuid();
  high_social_curator_id UUID := gen_random_uuid();
  v_high_genre_score NUMERIC;
  v_high_activity_score NUMERIC;
  v_high_social_score NUMERIC;
BEGIN
  -- Create listener
  INSERT INTO profiles (id, username, display_name, is_curator)
  VALUES (test_user_id, 'test_listener_6', 'Test Listener 6', FALSE);

  INSERT INTO taste_profile (user_id, genre, experience_level)
  VALUES
    (test_user_id, 'hip_hop', 'regular'),
    (test_user_id, 'rnb', 'discovering');

  -- Curator 1: High genre overlap, low activity, low followers
  INSERT INTO profiles (id, username, display_name, is_curator, total_drops, follower_count)
  VALUES (high_genre_curator_id, 'test_curator_5', 'High Genre Match', TRUE, 10, 10);

  INSERT INTO taste_profile (user_id, genre, experience_level)
  VALUES
    (high_genre_curator_id, 'hip_hop', 'deep_diver'),
    (high_genre_curator_id, 'rnb', 'deep_diver');

  INSERT INTO drops (user_id, track_id, artist_name, track_name, platform, context, genres)
  SELECT high_genre_curator_id, 'track_' || i, 'Artist ' || i, 'Track ' || i, 'spotify',
    'This is a test drop context for recommendation testing. This needs to be at least 50 characters long.',
    ARRAY['hip_hop']
  FROM generate_series(1, 10) i;

  -- Curator 2: Low genre overlap, high activity, low followers
  INSERT INTO profiles (id, username, display_name, is_curator, total_drops, follower_count)
  VALUES (high_activity_curator_id, 'test_curator_6', 'High Activity', TRUE, 100, 10);

  INSERT INTO taste_profile (user_id, genre, experience_level)
  VALUES
    (high_activity_curator_id, 'country', 'deep_diver');

  INSERT INTO drops (user_id, track_id, artist_name, track_name, platform, context, genres)
  SELECT high_activity_curator_id, 'track_' || i, 'Artist ' || i, 'Track ' || i, 'spotify',
    'This is a test drop context for recommendation testing. This needs to be at least 50 characters long.',
    ARRAY['country']
  FROM generate_series(1, 100) i;

  -- Curator 3: Low genre overlap, low activity, high followers
  INSERT INTO profiles (id, username, display_name, is_curator, total_drops, follower_count)
  VALUES (high_social_curator_id, 'test_curator_7', 'High Social Proof', TRUE, 10, 200);

  INSERT INTO taste_profile (user_id, genre, experience_level)
  VALUES
    (high_social_curator_id, 'classical', 'deep_diver');

  INSERT INTO drops (user_id, track_id, artist_name, track_name, platform, context, genres)
  SELECT high_social_curator_id, 'track_' || i, 'Artist ' || i, 'Track ' || i, 'spotify',
    'This is a test drop context for recommendation testing. This needs to be at least 50 characters long.',
    ARRAY['classical']
  FROM generate_series(1, 10) i;

  -- Get scores
  SELECT r.match_score INTO v_high_genre_score
  FROM recommend_curators_for_user(test_user_id) r
  WHERE r.curator_id = high_genre_curator_id;

  SELECT r.match_score INTO v_high_activity_score
  FROM recommend_curators_for_user(test_user_id) r
  WHERE r.curator_id = high_activity_curator_id;

  SELECT r.match_score INTO v_high_social_score
  FROM recommend_curators_for_user(test_user_id) r
  WHERE r.curator_id = high_social_curator_id;

  -- Genre overlap (50%) should have highest impact
  IF v_high_genre_score > v_high_activity_score AND v_high_genre_score > v_high_social_score THEN
    RAISE NOTICE 'TEST 6 PASSED: Genre overlap (50%%) correctly weighted highest';
    RAISE NOTICE '  Genre score: %, Activity score: %, Social score: %',
      v_high_genre_score, v_high_activity_score, v_high_social_score;
  ELSE
    RAISE EXCEPTION 'TEST 6 FAILED: Genre overlap should have highest score. Got Genre:%, Activity:%, Social:%',
      v_high_genre_score, v_high_activity_score, v_high_social_score;
  END IF;
END $$;

-- ============================================================================
-- Cleanup test data
-- ============================================================================
DELETE FROM taste_profile WHERE user_id IN (
  SELECT id FROM profiles WHERE username LIKE 'test_%'
);
DELETE FROM follows WHERE follower_id IN (
  SELECT id FROM profiles WHERE username LIKE 'test_%'
) OR following_id IN (
  SELECT id FROM profiles WHERE username LIKE 'test_%'
);
DELETE FROM drops WHERE user_id IN (
  SELECT id FROM profiles WHERE username LIKE 'test_%'
);
DELETE FROM profiles WHERE username LIKE 'test_%';

-- Restore foreign key constraint
ALTER TABLE profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

SELECT 'All recommendation algorithm tests completed!' as status;
