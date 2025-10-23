-- Signal MVP Database Schema
-- This migration creates the complete database structure for the MVP

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USER PROFILES & REPUTATION
-- ============================================================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,

  -- Reputation system
  trust_score INTEGER DEFAULT 100 CHECK (trust_score >= 0),
  reputation_available INTEGER DEFAULT 100 CHECK (reputation_available >= 0),
  total_drops INTEGER DEFAULT 0,
  successful_drops INTEGER DEFAULT 0,

  -- Stats
  total_validations_given INTEGER DEFAULT 0,

  -- Metadata
  onboarded BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_trust_score ON profiles(trust_score DESC);

-- Reputation ledger (immutable event log for auditability)
CREATE TABLE reputation_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event details
  event_type VARCHAR(50) NOT NULL, -- 'drop_created', 'drop_validated', 'drop_failed', 'manual_adjustment'
  points_change INTEGER NOT NULL,

  -- Context
  related_drop_id UUID, -- References drops.id
  related_user_id UUID, -- For trust relationships
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reputation_user_time ON reputation_events(user_id, created_at DESC);
CREATE INDEX idx_reputation_drop ON reputation_events(related_drop_id);
CREATE INDEX idx_reputation_type ON reputation_events(event_type);

-- Function to automatically update trust scores
CREATE OR REPLACE FUNCTION update_trust_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET
    trust_score = GREATEST(0, trust_score + NEW.points_change),
    reputation_available = CASE
      WHEN NEW.event_type = 'drop_created' THEN
        GREATEST(0, reputation_available - COALESCE((NEW.metadata->>'stake')::INTEGER, 0))
      WHEN NEW.event_type IN ('drop_validated', 'drop_failed') THEN
        reputation_available + COALESCE((NEW.metadata->>'points_returned')::INTEGER, 0)
      ELSE reputation_available
    END,
    updated_at = NOW()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reputation_update_trigger
AFTER INSERT ON reputation_events
FOR EACH ROW EXECUTE FUNCTION update_trust_score();

-- ============================================================================
-- SPOTIFY INTEGRATION
-- ============================================================================

-- Spotify connections (OAuth tokens)
CREATE TABLE spotify_connections (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- OAuth tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Spotify profile data
  spotify_id VARCHAR(255) UNIQUE,
  spotify_email VARCHAR(255),
  spotify_display_name VARCHAR(255),
  spotify_country VARCHAR(10),

  -- Sync tracking
  last_synced TIMESTAMP WITH TIME ZONE,
  sync_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_spotify_user ON spotify_connections(user_id);
CREATE INDEX idx_spotify_sync ON spotify_connections(last_synced) WHERE sync_enabled = true;

-- Listening history (partitioned by month for performance)
CREATE TABLE listening_history (
  id BIGSERIAL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Track info
  track_id VARCHAR(255) NOT NULL,
  track_name VARCHAR(500),
  artist_name VARCHAR(500),
  album_name VARCHAR(500),

  -- Timing
  played_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_ms INTEGER,

  -- Context
  context_type VARCHAR(50), -- 'playlist', 'album', 'artist', 'collection'
  context_uri VARCHAR(255),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (id, played_at)
) PARTITION BY RANGE (played_at);

-- Create initial partitions (current month + next 3 months)
CREATE TABLE listening_history_2024_10 PARTITION OF listening_history
  FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');

CREATE TABLE listening_history_2024_11 PARTITION OF listening_history
  FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');

CREATE TABLE listening_history_2024_12 PARTITION OF listening_history
  FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

CREATE TABLE listening_history_2025_01 PARTITION OF listening_history
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Indexes on partitioned table
CREATE INDEX idx_listening_user_date ON listening_history(user_id, played_at DESC);
CREATE INDEX idx_listening_track ON listening_history(track_id);
CREATE INDEX idx_listening_artist ON listening_history(artist_name);

-- ============================================================================
-- MUSIC DROPS (THE CORE INNOVATION)
-- ============================================================================

CREATE TABLE drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Track reference
  track_id VARCHAR(255) NOT NULL,
  track_name VARCHAR(500) NOT NULL,
  artist_name VARCHAR(500) NOT NULL,
  album_name VARCHAR(500),
  album_art_url TEXT,
  spotify_url TEXT,
  preview_url TEXT,

  -- The innovation: context & stakes
  context TEXT NOT NULL CHECK (LENGTH(context) >= 50 AND LENGTH(context) <= 2000),
  listening_notes TEXT CHECK (listening_notes IS NULL OR LENGTH(listening_notes) <= 1000),
  reputation_stake INTEGER NOT NULL CHECK (reputation_stake >= 10 AND reputation_stake <= 100),

  -- Genre/tags for discovery
  genres TEXT[], -- Array of genre tags
  mood_tags TEXT[], -- e.g., ['energetic', 'melancholic']

  -- Validation tracking
  validation_score DECIMAL(3,2) DEFAULT 0 CHECK (validation_score BETWEEN 0 AND 1),
  validation_count INTEGER DEFAULT 0,
  total_rating_sum INTEGER DEFAULT 0,

  -- Lifecycle
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'validated', 'failed', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  resolved_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_drops_user ON drops(user_id, created_at DESC);
CREATE INDEX idx_drops_status ON drops(status, created_at DESC);
CREATE INDEX idx_drops_active ON drops(created_at DESC) WHERE status = 'active';
CREATE INDEX idx_drops_expiring ON drops(expires_at) WHERE status = 'active';
CREATE INDEX idx_drops_track ON drops(track_id);
CREATE INDEX idx_drops_genres ON drops USING GIN (genres);

-- Drop validations (other users rating the drop)
CREATE TABLE drop_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  validator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rating
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  listened BOOLEAN DEFAULT false,
  listen_duration_seconds INTEGER, -- How long they actually listened

  -- Optional feedback
  feedback TEXT CHECK (feedback IS NULL OR LENGTH(feedback) <= 500),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(drop_id, validator_id) -- Can only validate once
);

CREATE INDEX idx_validations_drop ON drop_validations(drop_id);
CREATE INDEX idx_validations_validator ON drop_validations(validator_id, created_at DESC);
CREATE INDEX idx_validations_rating ON drop_validations(rating);

-- Function to update drop validation stats
CREATE OR REPLACE FUNCTION update_drop_validation_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE drops
  SET
    validation_count = validation_count + 1,
    total_rating_sum = total_rating_sum + NEW.rating,
    validation_score = (total_rating_sum + NEW.rating)::DECIMAL / ((validation_count + 1) * 5),
    updated_at = NOW()
  WHERE id = NEW.drop_id;

  -- Update validator's stats
  UPDATE profiles
  SET
    total_validations_given = total_validations_given + 1,
    updated_at = NOW()
  WHERE id = NEW.validator_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER drop_validation_stats_trigger
AFTER INSERT ON drop_validations
FOR EACH ROW EXECUTE FUNCTION update_drop_validation_stats();

-- Function to update drop creator's stats
CREATE OR REPLACE FUNCTION update_drop_creator_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('validated', 'failed') AND OLD.status = 'active' THEN
    UPDATE profiles
    SET
      total_drops = total_drops + 1,
      successful_drops = successful_drops + CASE WHEN NEW.status = 'validated' THEN 1 ELSE 0 END,
      updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER drop_creator_stats_trigger
AFTER UPDATE OF status ON drops
FOR EACH ROW EXECUTE FUNCTION update_drop_creator_stats();

-- ============================================================================
-- TRUST RELATIONSHIPS (For future graph features)
-- ============================================================================

CREATE TABLE trust_relationships (
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Trust metrics
  trust_score DECIMAL(3,2) DEFAULT 0.5 CHECK (trust_score BETWEEN 0 AND 1),

  -- Derived from interactions
  shared_drops_count INTEGER DEFAULT 0,
  validated_drops_count INTEGER DEFAULT 0,
  agreement_rate DECIMAL(3,2), -- How often they rate similarly

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (from_user_id, to_user_id),
  CHECK (from_user_id != to_user_id)
);

CREATE INDEX idx_trust_from ON trust_relationships(from_user_id, trust_score DESC);
CREATE INDEX idx_trust_to ON trust_relationships(to_user_id);

-- ============================================================================
-- DISCOVERY CIRCLES (For Phase 2)
-- ============================================================================

CREATE TABLE circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  name VARCHAR(100) NOT NULL,
  description TEXT,
  avatar_url TEXT,

  -- Focus area
  focus_genres TEXT[] NOT NULL,
  focus_description TEXT, -- e.g., "Japanese City Pop 1975-1985"

  -- Membership
  member_count INTEGER DEFAULT 0 CHECK (member_count <= 150),
  max_members INTEGER DEFAULT 150,

  -- Settings
  is_public BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  min_trust_score INTEGER DEFAULT 0,

  -- Creator
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_circles_public ON circles(created_at DESC) WHERE is_public = true;
CREATE INDEX idx_circles_genres ON circles USING GIN (focus_genres);
CREATE INDEX idx_circles_creator ON circles(created_by);

-- Circle memberships
CREATE TABLE circle_memberships (
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'creator')),

  -- Stats
  contribution_score INTEGER DEFAULT 0,
  drops_shared INTEGER DEFAULT 0,

  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (circle_id, user_id)
);

CREATE INDEX idx_memberships_circle ON circle_memberships(circle_id, joined_at DESC);
CREATE INDEX idx_memberships_user ON circle_memberships(user_id, joined_at DESC);

-- Prevent joining full circles
CREATE OR REPLACE FUNCTION check_circle_capacity()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_count INTEGER;
BEGIN
  SELECT member_count, max_members INTO current_count, max_count
  FROM circles
  WHERE id = NEW.circle_id;

  IF current_count >= max_count THEN
    RAISE EXCEPTION 'Circle is at maximum capacity (% members)', max_count;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_circle_limit
BEFORE INSERT ON circle_memberships
FOR EACH ROW EXECUTE FUNCTION check_circle_capacity();

-- Update member count
CREATE OR REPLACE FUNCTION update_circle_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE circles SET member_count = member_count + 1 WHERE id = NEW.circle_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE circles SET member_count = member_count - 1 WHERE id = OLD.circle_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER circle_member_count_trigger
AFTER INSERT OR DELETE ON circle_memberships
FOR EACH ROW EXECUTE FUNCTION update_circle_member_count();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE drop_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_memberships ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read, own write
CREATE POLICY "Profiles are publicly readable"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Spotify connections: Only own access
CREATE POLICY "Users can view own spotify connection"
  ON spotify_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own spotify connection"
  ON spotify_connections FOR ALL
  USING (auth.uid() = user_id);

-- Listening history: Private
CREATE POLICY "Users can view own listening history"
  ON listening_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own listening history"
  ON listening_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Drops: Public read, own write
CREATE POLICY "Drops are publicly readable"
  ON drops FOR SELECT
  USING (true);

CREATE POLICY "Users can create own drops"
  ON drops FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drops"
  ON drops FOR UPDATE
  USING (auth.uid() = user_id);

-- Validations: Public read, authenticated write (once per drop)
CREATE POLICY "Validations are publicly readable"
  ON drop_validations FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create validations"
  ON drop_validations FOR INSERT
  WITH CHECK (auth.uid() = validator_id);

-- Reputation events: Public read (for transparency)
CREATE POLICY "Reputation events are publicly readable"
  ON reputation_events FOR SELECT
  USING (true);

-- Trust relationships: Users can see their own
CREATE POLICY "Users can view own trust relationships"
  ON trust_relationships FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Circles: Public read, members write
CREATE POLICY "Public circles are readable"
  ON circles FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create circles"
  ON circles FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Circle creators can update their circles"
  ON circles FOR UPDATE
  USING (auth.uid() = created_by);

-- Circle memberships: Public read, members manage
CREATE POLICY "Memberships are publicly readable"
  ON circle_memberships FOR SELECT
  USING (true);

CREATE POLICY "Users can join circles"
  ON circle_memberships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave circles"
  ON circle_memberships FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's taste profile (top genres from listening history)
CREATE OR REPLACE FUNCTION get_user_top_genres(user_uuid UUID, limit_count INTEGER DEFAULT 5)
RETURNS TABLE (artist_name TEXT, play_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lh.artist_name::TEXT,
    COUNT(*)::BIGINT as play_count
  FROM listening_history lh
  WHERE lh.user_id = user_uuid
    AND lh.played_at > NOW() - INTERVAL '90 days'
  GROUP BY lh.artist_name
  ORDER BY play_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's drop success rate
CREATE OR REPLACE FUNCTION get_user_success_rate(user_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
  success_rate DECIMAL;
BEGIN
  SELECT
    CASE
      WHEN total_drops = 0 THEN 0
      ELSE ROUND((successful_drops::DECIMAL / total_drops) * 100, 2)
    END INTO success_rate
  FROM profiles
  WHERE id = user_uuid;

  RETURN COALESCE(success_rate, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Feed generation (active drops sorted by recency)
CREATE INDEX idx_drops_feed ON drops(created_at DESC, validation_count)
  WHERE status = 'active';

-- User profile page (user's drops)
CREATE INDEX idx_drops_user_status ON drops(user_id, status, created_at DESC);

-- Reputation history
CREATE INDEX idx_reputation_user_events ON reputation_events(user_id, event_type, created_at DESC);

-- Comments for future (placeholder)
COMMENT ON TABLE drops IS 'Music recommendations with reputation stakes - the core innovation';
COMMENT ON TABLE reputation_events IS 'Immutable ledger of all reputation changes for auditability';
COMMENT ON TABLE listening_history IS 'Synced from Spotify - partitioned by month for performance';
COMMENT ON COLUMN drops.context IS 'Required explanation of why this track matters (50-2000 chars)';
COMMENT ON COLUMN drops.reputation_stake IS 'Points at risk - returned with bonus if validated well';
