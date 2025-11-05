# Local Testing Guide
**Branch:** `claude/review-and-document-011CUo8g21Z4p53PqosUENGA`
**Date:** 2025-11-04

---

## Prerequisites

Before starting, ensure you have:
- [x] Git installed
- [x] Node.js and npm installed
- [x] Supabase CLI installed (via npm)
- [x] Docker Desktop running (for local Supabase)

---

## Step 1: Check Current Status

```bash
# Navigate to project directory
cd "C:\Users\Admin\OneDrive\Desktop\DEV Work\music-discovery-graph"

# Check current branch
git branch

# Check git status
git status
```

**Expected Output:** You should see which branch you're currently on (marked with `*`)

---

## Step 2: Commit or Stash Current Changes (If Any)

If you have uncommitted changes:

```bash
# Option A: Commit your changes
git add .
git commit -m "WIP: Save current work before switching branches"

# Option B: Stash your changes (to restore later)
git stash save "My current work"
```

If you have no changes, skip to Step 3.

---

## Step 3: Switch to the Review Branch

```bash
# Fetch latest from remote
git fetch origin

# Switch to the review branch
git checkout claude/review-and-document-011CUo8g21Z4p53PqosUENGA

# Verify you're on the correct branch
git branch
```

**Expected Output:**
```
* claude/review-and-document-011CUo8g21Z4p53PqosUENGA
  claude/music-discovery-platform-011CUQMePeRF6FSPXacQdMyi
  claude/project-review-011CUYCggo6PyaMHfkxeLBCH
```

The `*` should be next to `claude/review-and-document-011CUo8g21Z4p53PqosUENGA`

---

## Step 4: Install Dependencies

```bash
# Install/update npm packages
npm install
```

This ensures you have all required packages including Supabase CLI.

---

## Step 5: Start Local Supabase

```bash
# Start Supabase local development environment
npx supabase start
```

**Expected Output:**
```
Started supabase local development setup.

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
  S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
...
```

**⏱️ This may take 1-2 minutes if containers need to start.**

---

## Step 6: Reset Database with All Migrations

```bash
# Apply all migrations from scratch
npx supabase db reset
```

**What This Does:**
- Drops existing database
- Creates fresh database
- Applies ALL migrations in order (including our fixes)
- Seeds any initial data

**Expected Output:**
```
Resetting local database...
Recreating database...
Setting up initial schema...
Applying migration 20241028000000_fresh_curation_schema.sql...
Applying migration 20241101000000_add_url_fields_to_drops.sql...
Applying migration 20241101000001_fix_total_drops_counter.sql...
Applying migration 20251103000001_add_top_genres_computed.sql...
Applying migration 20251103000002_auto_populate_genre_stats.sql...
Applying migration 20251103000003_backfill_genre_stats.sql...
Applying migration 20251103000004_add_genre_filter_indexes.sql...
Applying migration 20251103000005_create_genre_filter_function.sql...
Applying migration 20251103000006_add_taste_profile.sql...
Applying migration 20251103000007_create_recommendation_function.sql...
Applying migration 20251104000001_fix_taste_profile_issues.sql...
Finished supabase db reset...
```

✅ **Success:** If you see all migrations applied without errors, the database setup is complete!

❌ **Error:** If any migration fails, note the error and we'll troubleshoot.

---

## Step 7: Run Algorithm Test Suite

```bash
# Execute the test suite we created
docker exec -i supabase_db_signal-mvp psql -U postgres -d postgres < supabase/tests/test_recommendation_algorithm.sql
```

**Expected Output:**
```
ALTER TABLE
DELETE 0
DELETE 0
DELETE 0
DELETE 0
NOTICE:  TEST 1 PASSED: Empty database returns 0 recommendations
DO
NOTICE:  TEST 2 PASSED: Curator with no genre overlap still appears
...
NOTICE:  TEST 5 PASSED: Already-followed curators correctly excluded
NOTICE:  TEST 6 PASSED: Scoring weights validation
                    status
-----------------------------------------------
 All recommendation algorithm tests completed!
(1 row)
```

**Success Criteria:** You should see 4-6 tests PASSED

---

## Step 8: Open Supabase Studio (Visual Database Tool)

```bash
# Open in browser (or manually navigate to the URL)
start http://127.0.0.1:54323
```

**In Supabase Studio, you can:**

1. **Table Editor** → View tables:
   - `profiles` - Check for `is_curator`, `discovery_preferences`, `favorite_artists` columns
   - `taste_profile` - New table for user genre preferences
   - `user_genre_stats` - Genre statistics

2. **SQL Editor** → Run test queries:
   ```sql
   -- Check if indexes exist
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = 'profiles'
   AND indexname LIKE 'idx_%';

   -- Should show: idx_profiles_is_curator (and others)
   ```

3. **Database** → Functions:
   - Find `recommend_curators_for_user`
   - Find `get_user_top_genres`

---

## Step 9: Test Recommendation Function Manually

In Supabase Studio SQL Editor, create test data and run the function:

```sql
-- 1. Create a test user (bypassing FK constraint for testing)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

INSERT INTO profiles (id, username, display_name, is_curator, total_drops, follower_count)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'test_listener', 'Test Listener', FALSE, 0, 0),
  ('22222222-2222-2222-2222-222222222222', 'test_curator_1', 'Indie Curator', TRUE, 50, 100),
  ('33333333-3333-3333-3333-333333333333', 'test_curator_2', 'Rock Curator', TRUE, 30, 50);

-- 2. Add taste profiles
INSERT INTO taste_profile (user_id, genre, experience_level)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'indie', 'regular'),
  ('11111111-1111-1111-1111-111111111111', 'rock', 'discovering'),
  ('22222222-2222-2222-2222-222222222222', 'indie', 'deep_diver'),
  ('33333333-3333-3333-3333-333333333333', 'rock', 'deep_diver');

-- 3. Add some drops for curators (to populate genre stats)
INSERT INTO drops (user_id, track_id, artist_name, track_name, platform, context, genres)
SELECT
  '22222222-2222-2222-2222-222222222222',
  'track_' || i,
  'Artist ' || i,
  'Track ' || i,
  'spotify',
  'This is a test drop for indie music. Great vibes and excellent production quality all around!',
  ARRAY['indie']
FROM generate_series(1, 50) i;

INSERT INTO drops (user_id, track_id, artist_name, track_name, platform, context, genres)
SELECT
  '33333333-3333-3333-3333-333333333333',
  'track_rock_' || i,
  'Rock Artist ' || i,
  'Rock Track ' || i,
  'spotify',
  'This is a test drop for rock music. Heavy guitar riffs and amazing drum work throughout!',
  ARRAY['rock']
FROM generate_series(1, 30) i;

-- 4. Test the recommendation function
SELECT
  username,
  display_name,
  follower_count,
  total_drops,
  top_genres,
  match_score
FROM recommend_curators_for_user('11111111-1111-1111-1111-111111111111');

-- Expected: Should return both curators with match scores
```

**Expected Result:**
| username | display_name | follower_count | total_drops | top_genres | match_score |
|----------|--------------|----------------|-------------|------------|-------------|
| test_curator_1 | Indie Curator | 100 | 50 | {indie} | ~1.5+ |
| test_curator_2 | Rock Curator | 50 | 30 | {rock} | ~0.8+ |

**Restore FK constraint after testing:**
```sql
ALTER TABLE profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

---

## Step 10: Start the Frontend (Test Onboarding Flow)

```bash
# Start Next.js development server
npm run dev
```

**Expected Output:**
```
▲ Next.js 14.0.4
- Local:        http://localhost:3000
- Ready in 2.3s
```

---

## Step 11: Test Onboarding in Browser

1. **Open:** http://localhost:3000

2. **Sign Up:** Create a new account (or use test mode if available)

3. **Onboarding Steps to Test:**
   - ✅ **Step 1:** Username + Display Name + Bio
   - ✅ **Step 2:** Genre Selection (3-10 genres)
     - Should allow selecting multiple genres
     - Should show discovery preferences
     - Should allow entering favorite artists
   - ✅ **Step 3:** Curator Choice
     - Radio buttons: "I want to curate" vs "I want to discover"
   - ✅ **Step 4 (Curators Only):** Curation Statement
     - Should only appear if you selected "I want to curate"
   - ✅ **Step 5:** Recommended Curators
     - Should show personalized curator recommendations
     - Should have "Follow" buttons
     - Should show genre overlap

4. **Verify Progress Indicator:**
   - Listeners should see: 1/4, 2/4, 3/4, 4/4 (skips curation statement)
   - Curators should see: 1/5, 2/5, 3/5, 4/5, 5/5

---

## Step 12: Verify Data in Database

After completing onboarding, check Supabase Studio:

```sql
-- Check your profile was created correctly
SELECT
  username,
  display_name,
  is_curator,
  discovery_preferences,
  favorite_artists
FROM profiles
WHERE username = 'your-test-username';

-- Check your taste profile
SELECT
  genre,
  experience_level
FROM taste_profile
WHERE user_id = (SELECT id FROM profiles WHERE username = 'your-test-username');
```

---

## Step 13: Test Curator Recommendations

In the app, you should see recommended curators. Verify:

1. **Curators appear** based on your genre preferences
2. **Match scores** make sense (curators with overlapping genres ranked higher)
3. **Quick follow works** - Click "Follow" button
4. **Already-followed curators disappear** from recommendations

---

## Troubleshooting

### Issue: "supabase command not found"

```bash
# Install Supabase CLI locally
npm install supabase --save-dev

# Or use npx prefix for all commands
npx supabase start
```

### Issue: Docker containers not starting

```bash
# Check Docker is running
docker ps

# If empty, start Docker Desktop

# Then restart Supabase
npx supabase stop
npx supabase start
```

### Issue: Port conflicts (54321, 54322, etc. already in use)

```bash
# Stop Supabase
npx supabase stop

# Check what's using the ports
netstat -ano | findstr :54321

# Kill the process or change Supabase ports in config
```

### Issue: Migration fails

```bash
# Check migration file syntax
cat supabase/migrations/20251104000001_fix_taste_profile_issues.sql

# Try applying just that migration
npx supabase migration repair 20251104000001 --status applied

# Then reset
npx supabase db reset
```

### Issue: Frontend shows errors

```bash
# Check environment variables
cat .env.local

# Should have:
# NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-start>

# Restart dev server
npm run dev
```

---

## Verification Checklist

After testing, verify:

- [ ] All migrations applied successfully
- [ ] Test suite shows 4+ tests passing
- [ ] Indexes exist on `profiles.is_curator` and `taste_profile.genre`
- [ ] `recommend_curators_for_user()` function returns results
- [ ] Frontend onboarding flow works (5 steps for curators, 4 for listeners)
- [ ] User data saves correctly to database
- [ ] Curator recommendations appear and are relevant
- [ ] Already-followed curators don't appear in recommendations

---

## Clean Up After Testing

```bash
# Stop Supabase when done
npx supabase stop

# Stop Next.js dev server
# Press Ctrl+C in the terminal running npm run dev

# Switch back to your previous branch (if needed)
git checkout your-previous-branch

# Restore stashed changes (if you used git stash)
git stash pop
```

---

## Next Steps

After successful testing:

1. **Report Results:** Note any issues or bugs found
2. **Review Code:** Examine the implementation files
3. **Prepare for Deployment:** Follow `DEPLOYMENT_CHECKLIST_RESULTS.md`
4. **Merge Branch:** If everything looks good, merge to main

---

## Need Help?

If you encounter issues:

1. Check the error message carefully
2. Look in Supabase Studio → Logs
3. Check browser console (F12) for frontend errors
4. Review migration files for syntax errors
5. Ask for assistance with specific error messages

---

**Happy Testing! 🚀**
