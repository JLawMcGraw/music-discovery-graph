-- Function to update genre stats when a drop is created or deleted
CREATE OR REPLACE FUNCTION update_user_genre_stats()
RETURNS TRIGGER AS $$
DECLARE
  genre_item TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Loop through genres array and update/insert stats
    IF NEW.genres IS NOT NULL AND array_length(NEW.genres, 1) > 0 THEN
      FOREACH genre_item IN ARRAY NEW.genres
      LOOP
        INSERT INTO user_genre_stats (user_id, genre, total_drops, last_drop_at)
        VALUES (NEW.user_id, genre_item, 1, NEW.created_at)
        ON CONFLICT (user_id, genre)
        DO UPDATE SET
          total_drops = user_genre_stats.total_drops + 1,
          last_drop_at = NEW.created_at,
          activity_level = calculate_activity_level(user_genre_stats.total_drops + 1);
      END LOOP;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    -- Loop through genres array and decrement stats
    IF OLD.genres IS NOT NULL AND array_length(OLD.genres, 1) > 0 THEN
      FOREACH genre_item IN ARRAY OLD.genres
      LOOP
        UPDATE user_genre_stats
        SET
          total_drops = GREATEST(total_drops - 1, 0),
          activity_level = calculate_activity_level(GREATEST(total_drops - 1, 0))
        WHERE user_id = OLD.user_id AND genre = genre_item;

        -- Delete row if total_drops reaches 0
        DELETE FROM user_genre_stats
        WHERE user_id = OLD.user_id
          AND genre = genre_item
          AND total_drops = 0;
      END LOOP;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle genre changes (for future drop editing feature)
    -- Remove old genres
    IF OLD.genres IS NOT NULL AND array_length(OLD.genres, 1) > 0 THEN
      FOREACH genre_item IN ARRAY OLD.genres
      LOOP
        IF NEW.genres IS NULL OR NOT (genre_item = ANY(NEW.genres)) THEN
          UPDATE user_genre_stats
          SET
            total_drops = GREATEST(total_drops - 1, 0),
            activity_level = calculate_activity_level(GREATEST(total_drops - 1, 0))
          WHERE user_id = OLD.user_id AND genre = genre_item;

          DELETE FROM user_genre_stats
          WHERE user_id = OLD.user_id
            AND genre = genre_item
            AND total_drops = 0;
        END IF;
      END LOOP;
    END IF;

    -- Add new genres
    IF NEW.genres IS NOT NULL AND array_length(NEW.genres, 1) > 0 THEN
      FOREACH genre_item IN ARRAY NEW.genres
      LOOP
        IF OLD.genres IS NULL OR NOT (genre_item = ANY(OLD.genres)) THEN
          INSERT INTO user_genre_stats (user_id, genre, total_drops, last_drop_at)
          VALUES (NEW.user_id, genre_item, 1, NEW.created_at)
          ON CONFLICT (user_id, genre)
          DO UPDATE SET
            total_drops = user_genre_stats.total_drops + 1,
            last_drop_at = NEW.created_at,
            activity_level = calculate_activity_level(user_genre_stats.total_drops + 1);
        END IF;
      END LOOP;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on drops table
DROP TRIGGER IF EXISTS user_genre_stats_trigger ON drops;
CREATE TRIGGER user_genre_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON drops
FOR EACH ROW
EXECUTE FUNCTION update_user_genre_stats();

COMMENT ON FUNCTION update_user_genre_stats IS 'Automatically updates user_genre_stats when drops are created/updated/deleted';

-- Rollback:
-- DROP TRIGGER IF EXISTS user_genre_stats_trigger ON drops;
-- DROP FUNCTION IF EXISTS update_user_genre_stats();
