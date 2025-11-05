-- Fix RLS policies for user_genre_stats table
-- The trigger that updates genre stats was being blocked because there was no INSERT/UPDATE policy

-- Allow users to insert their own genre stats (via trigger)
CREATE POLICY "Users can insert own genre stats"
ON user_genre_stats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own genre stats (via trigger)
CREATE POLICY "Users can update own genre stats"
ON user_genre_stats
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own genre stats
CREATE POLICY "Users can delete own genre stats"
ON user_genre_stats
FOR DELETE
USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can insert own genre stats" ON user_genre_stats IS
'Allows trigger to insert genre stats when user creates drops';

COMMENT ON POLICY "Users can update own genre stats" ON user_genre_stats IS
'Allows trigger to update genre stats when user creates/deletes drops';
