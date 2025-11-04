-- Add trigger to update total_drops counter on profile

CREATE OR REPLACE FUNCTION update_profile_drop_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles
    SET total_drops = total_drops + 1
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles
    SET total_drops = total_drops - 1
    WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profile_drop_count_trigger ON drops;
CREATE TRIGGER profile_drop_count_trigger
AFTER INSERT OR DELETE ON drops
FOR EACH ROW EXECUTE FUNCTION update_profile_drop_count();

-- Fix existing counts
UPDATE profiles p
SET total_drops = (
  SELECT COUNT(*)
  FROM drops d
  WHERE d.user_id = p.id
);
