-- Signal MVP Database Schema (Simplified - No Listening History)
-- This migration creates the complete database structure for the MVP
-- Focus: Drops with reputation stakes + validation system

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
  bio TEXT CHECK (bio IS NULL OR LENGTH(bio) <= 500),
  avatar_url TEXT,

  -- Reputation system
  trust_score INTEGER DEFAULT 100 CHECK (trust_score >= 0 AND trust_score <= 1000),
  reputation_available INTEGER DEFAULT 100 CHECK (reputation_available >= 0),

  -- Stats
  total_drops INTEGER DEFAULT 0,
  successful_drops INTEGER DEFAULT 0,
  failed_drops INTEGER DEFAULT 0,
  total_validations_given INTEGER DEFAULT 0,

  -- User tier
  tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'curator')),

  -- Genre preferences (for matching)
  genre_preferences TEXT[], -- Array of genre tags user selected during onboarding

  -- Anti-gaming
  phone_verified BOOLEAN DEFAULT false,
  phone_hash VARCHAR(64), -- SHA256 hash of phone number (for uniqueness, not storage)

  -- Metadata
  onboarded BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_trust_score ON profiles(trust_score DESC);
CREATE INDEX idx_profiles_tier ON profiles(tier);
CREATE INDEX idx_profiles_phone_hash ON profiles(phone_hash) WHERE phone_verified = true;

-- Reputation ledger (immutable event log for auditability)
CREATE TABLE reputation_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event details
  event_type VARCHAR(50) NOT NULL, -- 'drop_created', 'drop_validated', 'drop_failed', 'manual_adjustment', 'bonus_earned'
  points_change INTEGER NOT NULL,

  -- New trust score after this event
  new_trust_score INTEGER NOT NULL,
  new_reputation_available INTEGER NOT NULL,

  -- Context
  related_drop_id UUID, -- References drops.id
  related_user_id UUID, -- For future trust relationships
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reputation_user_time ON reputation_events(user_id, created_at DESC);
CREATE INDEX idx_reputation_drop ON reputation_events(related_drop_id) WHERE related_drop_id IS NOT NULL;
CREATE INDEX idx_reputation_type ON reputation_events(event_type);

-- Function to automatically update trust scores
CREATE OR REPLACE FUNCTION update_trust_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET
    trust_score = NEW.new_trust_score,
    reputation_available = NEW.new_reputation_available,
    updated_at = NOW()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reputation_update_trigger
AFTER INSERT ON reputation_events
FOR EACH ROW EXECUTE FUNCTION update_trust_score();

-- ============================================================================
-- MUSIC DROPS (THE CORE INNOVATION)
-- ============================================================================

CREATE TABLE drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Track reference (platform-agnostic)
  track_id VARCHAR(255) NOT NULL, -- e.g., "spotify:track:xyz"
  platform VARCHAR(20) NOT NULL DEFAULT 'spotify' CHECK (platform IN ('spotify', 'apple_music', 'youtube', 'soundcloud')),

  track_name VARCHAR(500) NOT NULL,
  artist_name VARCHAR(500) NOT NULL,
  album_name VARCHAR(500),
  album_art_url TEXT,
  external_url TEXT, -- Link to track on platform
  preview_url TEXT, -- 30-second preview if available

  -- The innovation: context & stakes
  context TEXT NOT NULL CHECK (LENGTH(context) >= 50 AND LENGTH(context) <= 2000),
  listening_notes TEXT CHECK (listening_notes IS NULL OR LENGTH(listening_notes) <= 1000),
  reputation_stake INTEGER NOT NULL CHECK (reputation_stake >= 10 AND reputation_stake <= 100),

  -- Genre/tags for discovery
  genres TEXT[], -- Array of genre tags
  mood_tags TEXT[], -- e.g., ['energetic', 'melancholic', 'introspective']

  -- Validation tracking
  validation_score DECIMAL(3,2) DEFAULT 0 CHECK (validation_score BETWEEN 0 AND 1),
  validation_count INTEGER DEFAULT 0,
  total_rating_sum INTEGER DEFAULT 0,

  -- Engagement tracking (for platform partnerships)
  view_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0, -- Clicks to streaming platform
  save_count INTEGER DEFAULT 0, -- Future: users saving to their library

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
CREATE INDEX idx_drops_platform ON drops(platform);

-- Drop validations (other users rating the drop)
CREATE TABLE drop_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  validator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rating
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  listened BOOLEAN DEFAULT false,

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
      failed_drops = failed_drops + CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
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
-- CONVERSION TRACKING (For Platform Partnerships)
-- ============================================================================

CREATE TABLE platform_clicks (
  id BIGSERIAL PRIMARY KEY,
  drop_id UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Can be null for anonymous

  platform VARCHAR(20) NOT NULL,
  referrer TEXT,
  user_agent TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_platform_clicks_drop ON platform_clicks(drop_id);
CREATE INDEX idx_platform_clicks_platform ON platform_clicks(platform, created_at DESC);
CREATE INDEX idx_platform_clicks_date ON platform_clicks(created_at);

-- Increment click count on drops
CREATE OR REPLACE FUNCTION increment_drop_clicks()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE drops
  SET
    click_count = click_count + 1,
    updated_at = NOW()
  WHERE id = NEW.drop_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_clicks_trigger
AFTER INSERT ON platform_clicks
FOR EACH ROW EXECUTE FUNCTION increment_drop_clicks();

-- ============================================================================
-- DISCOVERY CIRCLES (For Phase 2)
-- ============================================================================

CREATE TABLE circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  name VARCHAR(100) NOT NULL,
  description TEXT CHECK (LENGTH(description) <= 1000),
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
    UPDATE circles SET member_count = member_count + 1, updated_at = NOW() WHERE id = NEW.circle_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE circles SET member_count = member_count - 1, updated_at = NOW() WHERE id = OLD.circle_id;
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
ALTER TABLE drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE drop_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_clicks ENABLE ROW LEVEL SECURITY;
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

-- Platform clicks: Anyone can insert (for anonymous tracking)
CREATE POLICY "Anyone can log platform clicks"
  ON platform_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own clicks"
  ON platform_clicks FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

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

-- Function to get user's success rate
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

-- Function to get trending drops (high validation score + recent)
CREATE OR REPLACE FUNCTION get_trending_drops(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  drop_id UUID,
  score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id as drop_id,
    (d.validation_score * 0.7 + (1.0 / (1.0 + EXTRACT(EPOCH FROM (NOW() - d.created_at)) / 86400)) * 0.3)::DECIMAL as score
  FROM drops d
  WHERE d.status = 'active'
    AND d.validation_count >= 3
  ORDER BY score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE drops IS 'Music recommendations with reputation stakes - the core innovation';
COMMENT ON TABLE reputation_events IS 'Immutable ledger of all reputation changes for auditability';
COMMENT ON TABLE platform_clicks IS 'Tracking for conversion attribution and platform partnerships';
COMMENT ON COLUMN drops.context IS 'Required explanation of why this track matters (50-2000 chars)';
COMMENT ON COLUMN drops.reputation_stake IS 'Points at risk - returned with bonus if validated well';
COMMENT ON COLUMN profiles.phone_hash IS 'SHA256 hash of phone number for anti-Sybil (never store actual number)';
