-- Add missing URL fields to drops table
-- These fields store Spotify URLs and preview URLs

ALTER TABLE drops
ADD COLUMN IF NOT EXISTS external_url TEXT,
ADD COLUMN IF NOT EXISTS preview_url TEXT;

COMMENT ON COLUMN drops.external_url IS 'External URL to the track on the streaming platform (e.g., Spotify track URL)';
COMMENT ON COLUMN drops.preview_url IS 'Preview/sample audio URL if available';
