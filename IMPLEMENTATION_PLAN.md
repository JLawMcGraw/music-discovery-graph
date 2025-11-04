# DeepCuts - Implementation Plan
## Architecture Improvements & Feature Development

**Created:** 2025-11-03
**Status:** Ready for Execution
**Branch:** `claude/project-review-011CUYCggo6PyaMHfkxeLBCH`

---

## Overview

This document provides detailed implementation steps for critical architecture improvements identified during the project review. Each step includes exact database migrations, code changes, testing procedures, and rollback plans.

### Priority Order

1. **STEP 1:** Fix Data Model (Critical) - Unblock discovery page, enable taste areas
2. **STEP 2:** Database-Level Genre Filtering - Performance at scale
3. **STEP 3:** Instagram-Style Feed Pagination - User experience at scale
4. **STEP 4:** Robust Taste Onboarding - Enable curator recommendations

### Development Principles

- ✅ Test after EVERY change (no batching)
- ✅ Create checkpoint after each numbered step
- ✅ Ask before continuing to next major step
- ✅ Document actual vs. expected behavior
- ✅ Rollback plan for each migration

---

# STEP 1: Fix Data Model (Critical)

## Problem Statement

**Issues:**
1. `top_genres` field queried in `discover/page.tsx:52` but doesn't exist in database
2. `user_genre_stats` table exists but is never populated
3. Taste areas don't display on profiles
4. Discovery filtering may fail silently

**Impact:**
- Discover page shows null for curator genres
- Profile pages show no taste areas
- Genre-based discovery is broken

**Priority:** 🔴 Critical - Blocks core functionality

---

## Solution Architecture

### Approach 1: Computed Field (Recommended)

**Pros:**
- Always accurate (no stale data)
- No additional storage
- Simple to maintain

**Cons:**
- Computed on every query (slight performance cost)

### Approach 2: Materialized View

**Pros:**
- Better performance for large datasets
- Can be indexed

**Cons:**
- Needs refresh strategy
- Stale data between refreshes

**Decision:** Use **Approach 1** for MVP (computed field), migrate to Approach 2 if performance becomes an issue.

---

## Implementation Steps

### Step 1.1: Add `top_genres` Computed Function

**File:** `supabase/migrations/20251103000001_add_top_genres_computed.sql`

```sql
-- Add computed function to get top genres for a user
-- Returns array of top 5 genres by drop count

CREATE OR REPLACE FUNCTION get_user_top_genres(user_uuid UUID)
RETURNS TEXT[] AS $$
BEGIN
  RETURN (
    SELECT ARRAY_AGG(genre ORDER BY total_drops DESC)
    FROM (
      SELECT genre
      FROM user_genre_stats
      WHERE user_id = user_uuid
      ORDER BY total_drops DESC
      LIMIT 5
    ) top_five
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_top_genres IS 'Returns top 5 genres for a user based on drop count in user_genre_stats';
```

**Testing:**
```sql
-- Test with a user who has genre stats
SELECT get_user_top_genres('<test-user-uuid>');
-- Expected: {genre1, genre2, genre3, genre4, genre5} or NULL if no stats

-- Test with user who has no stats
SELECT get_user_top_genres('<new-user-uuid>');
-- Expected: NULL
```

**Rollback:**
```sql
DROP FUNCTION IF EXISTS get_user_top_genres(UUID);
```

---

### Step 1.2: Create Trigger to Auto-Populate `user_genre_stats`

**File:** `supabase/migrations/20251103000002_auto_populate_genre_stats.sql`

```sql
-- Function to update genre stats when a drop is created or deleted
CREATE OR REPLACE FUNCTION update_user_genre_stats()
RETURNS TRIGGER AS $$
DECLARE
  genre_item TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Loop through genres array and update/insert stats
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

  ELSIF TG_OP = 'DELETE' THEN
    -- Loop through genres array and decrement stats
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

  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle genre changes (rare, but possible if drops become editable)
    -- Remove old genres
    FOREACH genre_item IN ARRAY OLD.genres
    LOOP
      IF NOT (genre_item = ANY(NEW.genres)) THEN
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

    -- Add new genres
    FOREACH genre_item IN ARRAY NEW.genres
    LOOP
      IF NOT (genre_item = ANY(OLD.genres)) THEN
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

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on drops table
DROP TRIGGER IF EXISTS user_genre_stats_trigger ON drops;
CREATE TRIGGER user_genre_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON drops
FOR EACH ROW
WHEN (NEW.genres IS NOT NULL OR OLD.genres IS NOT NULL)
EXECUTE FUNCTION update_user_genre_stats();

COMMENT ON FUNCTION update_user_genre_stats IS 'Automatically updates user_genre_stats when drops are created/updated/deleted';
```

**Testing:**
```sql
-- Test INSERT: Create a drop with genres
INSERT INTO drops (user_id, track_id, track_name, artist_name, context, genres, platform)
VALUES (
  '<test-user-uuid>',
  'spotify:track:test123',
  'Test Track',
  'Test Artist',
  'This is a test drop with at least 50 characters in the context field to meet minimum requirements.',
  ARRAY['indie', 'rock'],
  'spotify'
);

-- Verify genre stats were created
SELECT * FROM user_genre_stats WHERE user_id = '<test-user-uuid>';
-- Expected: 2 rows (indie: 1 drop, rock: 1 drop, activity_level: exploring)

-- Test INSERT again with same genre
INSERT INTO drops (user_id, track_id, track_name, artist_name, context, genres, platform)
VALUES (
  '<test-user-uuid>',
  'spotify:track:test456',
  'Test Track 2',
  'Test Artist 2',
  'This is another test drop with at least 50 characters in the context field.',
  ARRAY['indie', 'electronic'],
  'spotify'
);

-- Verify stats updated
SELECT * FROM user_genre_stats WHERE user_id = '<test-user-uuid>';
-- Expected: 3 rows (indie: 2 drops, rock: 1 drop, electronic: 1 drop)

-- Test DELETE
DELETE FROM drops WHERE track_id = 'spotify:track:test123';

-- Verify stats decremented
SELECT * FROM user_genre_stats WHERE user_id = '<test-user-uuid>';
-- Expected: 2 rows (indie: 1 drop, electronic: 1 drop), rock row deleted
```

**Rollback:**
```sql
DROP TRIGGER IF EXISTS user_genre_stats_trigger ON drops;
DROP FUNCTION IF EXISTS update_user_genre_stats();
```

---

### Step 1.3: Backfill Existing Data

**File:** `supabase/migrations/20251103000003_backfill_genre_stats.sql`

```sql
-- Backfill user_genre_stats from existing drops
-- This is a one-time operation to populate stats for existing data

-- Clear existing stats (in case this migration runs multiple times)
TRUNCATE user_genre_stats;

-- Populate genre stats from all existing drops
INSERT INTO user_genre_stats (user_id, genre, total_drops, total_saves_received, last_drop_at, activity_level)
SELECT
  d.user_id,
  genre,
  COUNT(*) as total_drops,
  COALESCE(SUM(d.save_count), 0) as total_saves_received,
  MAX(d.created_at) as last_drop_at,
  calculate_activity_level(COUNT(*)::INTEGER) as activity_level
FROM drops d
CROSS JOIN LATERAL UNNEST(d.genres) AS genre
WHERE d.genres IS NOT NULL AND array_length(d.genres, 1) > 0
GROUP BY d.user_id, genre
ON CONFLICT (user_id, genre) DO UPDATE
SET
  total_drops = EXCLUDED.total_drops,
  total_saves_received = EXCLUDED.total_saves_received,
  last_drop_at = EXCLUDED.last_drop_at,
  activity_level = EXCLUDED.activity_level;

-- Verify counts
SELECT COUNT(*) as total_genre_stats FROM user_genre_stats;
SELECT COUNT(DISTINCT user_id) as users_with_stats FROM user_genre_stats;

COMMENT ON TABLE user_genre_stats IS 'Auto-populated by trigger on drops table. Shows user activity per genre.';
```

**Testing:**
```sql
-- Before backfill
SELECT COUNT(*) FROM user_genre_stats;
-- Expected: 0 (or current count)

-- After backfill
SELECT COUNT(*) FROM user_genre_stats;
-- Expected: > 0 if there are drops with genres

-- Verify accuracy for a specific user
SELECT
  ugs.genre,
  ugs.total_drops,
  (SELECT COUNT(*) FROM drops d WHERE d.user_id = ugs.user_id AND ugs.genre = ANY(d.genres)) as actual_drops
FROM user_genre_stats ugs
WHERE user_id = '<test-user-uuid>';
-- Expected: total_drops = actual_drops for each genre
```

**Rollback:**
```sql
TRUNCATE user_genre_stats;
```

---

### Step 1.4: Update Discover Page to Use Computed Field

**File:** `app/discover/page.tsx`

**Current Code (Lines 40-53):**
```typescript
let query = supabase
  .from('profiles')
  .select(`
    id,
    username,
    display_name,
    bio,
    curation_statement,
    avatar_url,
    follower_count,
    following_count,
    total_drops,
    genre_preferences,
    top_genres  // ❌ This field doesn't exist
  `)
  .gt('total_drops', 0)
```

**Updated Code:**
```typescript
// Fetch curators
let query = supabase
  .from('profiles')
  .select(`
    id,
    username,
    display_name,
    bio,
    curation_statement,
    avatar_url,
    follower_count,
    following_count,
    total_drops,
    genre_preferences
  `)
  .gt('total_drops', 0)

// Apply ordering
if (sortBy === 'active') {
  query = query.order('total_drops', { ascending: false })
} else if (sortBy === 'new') {
  query = query.order('created_at', { ascending: false })
} else {
  // default: followers
  query = query.order('follower_count', { ascending: false })
}

const { data: allCurators } = await query.limit(50)

// Fetch top_genres separately for each curator using RPC
const curatorsWithGenres = await Promise.all(
  (allCurators || []).map(async (curator) => {
    const { data: topGenres } = await supabase.rpc('get_user_top_genres', {
      user_uuid: curator.id
    })

    return {
      ...curator,
      top_genres: topGenres || []
    }
  })
)

// Filter by genre if selected (client-side for now, will move to DB in Step 2)
let curators = curatorsWithGenres
if (selectedGenre) {
  curators = curators.filter(
    (c) =>
      c.genre_preferences?.includes(selectedGenre) ||
      c.top_genres?.includes(selectedGenre)
  )
}
```

**Alternative (More Efficient - Use in Step 2):**
Instead of fetching top_genres separately, we'll create a materialized view or add as computed column. For now, the Promise.all approach works.

**Testing:**
```bash
# Start dev server
npm run dev

# Navigate to http://localhost:3000/discover
# Expected: Curator cards show top genres (up to 5)
# Expected: No console errors about missing top_genres field

# Test filtering by genre
# Expected: Filtering still works (includes both genre_preferences and top_genres)
```

**Rollback:**
```typescript
// Revert to original code (remove RPC call)
```

---

### Step 1.5: Update Profile Page to Display Taste Areas

**File:** `app/profile/[username]/page.tsx`

**Current Status:** Need to check if taste areas are displayed. If not, add them.

**Expected Code Addition (after profile header section):**
```typescript
// Fetch genre stats for this user
const { data: genreStats } = await supabase
  .from('user_genre_stats')
  .select('genre, total_drops, activity_level')
  .eq('user_id', profile.id)
  .order('total_drops', { ascending: false })

// ... in JSX ...

{/* Taste Areas Section */}
{genreStats && genreStats.length > 0 && (
  <div className="bg-gray-800 rounded-lg p-6 mb-6">
    <h2 className="text-xl font-semibold text-white mb-4">Taste Areas</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {genreStats.map((stat) => (
        <div
          key={stat.genre}
          className="bg-gray-900 rounded-lg p-4 border border-gray-700"
        >
          <h3 className="text-lg font-semibold text-purple-400 mb-1">
            {stat.genre}
          </h3>
          <div className="text-sm text-gray-400">
            <p>{stat.total_drops} drops</p>
            <p className="capitalize">{stat.activity_level}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

**Testing:**
```bash
# Navigate to a profile with drops
# Expected: "Taste Areas" section displays with genre cards
# Expected: Each card shows genre name, drop count, activity level

# Test activity levels:
# - Create 3 drops in "indie" → Should show "exploring"
# - Create 6 more drops in "indie" → Should show "occasional"
# - Create 15 more drops in "indie" → Should show "active"
# - Create 30 more drops in "indie" → Should show "prolific"
```

**Rollback:**
Remove the Taste Areas section from JSX.

---

## Step 1 Success Criteria

- [ ] `get_user_top_genres()` function returns correct top 5 genres for any user
- [ ] `user_genre_stats` table auto-populates when drops are created
- [ ] `user_genre_stats` table auto-updates when drops are deleted
- [ ] Backfill successfully populates stats for all existing drops
- [ ] Discover page displays top genres for each curator without errors
- [ ] Profile pages display "Taste Areas" section with correct data
- [ ] Activity levels calculate correctly (exploring/occasional/active/prolific)
- [ ] All tests pass with no console errors

---

## Step 1 Testing Checklist

**Database Tests:**
- [ ] Create drop with genres → Verify genre stats created
- [ ] Create another drop with same genre → Verify count incremented
- [ ] Delete drop → Verify genre stats decremented
- [ ] Delete last drop in genre → Verify genre stat row deleted
- [ ] Backfill with 100+ existing drops → Verify accurate counts

**UI Tests:**
- [ ] Discover page loads without errors
- [ ] Curator cards display top genres (badges)
- [ ] Genre filtering includes top_genres
- [ ] Profile page shows Taste Areas section
- [ ] Activity levels display correctly

**Edge Cases:**
- [ ] User with no drops → top_genres returns NULL
- [ ] Drop with no genres → Stats not affected
- [ ] Drop with 10 genres → All 10 genres get stats
- [ ] User with 20 genres → top_genres returns only top 5

---

# STEP 2: Database-Level Genre Filtering

## Problem Statement

**Issue:** Discover page fetches 50 curators, then filters by genre client-side

**Current Code:**
```typescript
const { data: allCurators } = await query.limit(50)

// Filter by genre (client-side) ❌
let curators = allCurators || []
if (selectedGenre) {
  curators = curators.filter(
    (c) => c.genre_preferences?.includes(selectedGenre) || c.top_genres?.includes(selectedGenre)
  )
}
```

**Problems:**
- Only searches first 50 curators
- If 50 curators don't include selected genre, returns empty
- Inefficient (fetches unnecessary data)
- Won't scale beyond 50 curators

**Impact:** 🟡 Medium - Limits discovery as platform grows

---

## Solution Architecture

Move genre filtering to PostgreSQL query using array operators and proper indexing.

**Benefits:**
- Searches entire curator database
- Only returns relevant curators
- Much faster with proper indexes
- Scales to millions of curators

---

## Implementation Steps

### Step 2.1: Add Composite Index for Genre Filtering

**File:** `supabase/migrations/20251103000004_add_genre_filter_indexes.sql`

```sql
-- Add GIN index for efficient array filtering on genre_preferences
-- This index already exists in base migration, verify it's there
CREATE INDEX IF NOT EXISTS idx_profiles_genre_prefs
ON profiles USING GIN(genre_preferences);

-- Add index for sorting combinations (used in discover page)
CREATE INDEX IF NOT EXISTS idx_profiles_follower_count_drops
ON profiles(follower_count DESC, total_drops DESC)
WHERE total_drops > 0;

CREATE INDEX IF NOT EXISTS idx_profiles_total_drops
ON profiles(total_drops DESC)
WHERE total_drops > 0;

CREATE INDEX IF NOT EXISTS idx_profiles_created_at
ON profiles(created_at DESC)
WHERE total_drops > 0;

COMMENT ON INDEX idx_profiles_follower_count_drops IS 'Optimizes discover page sort by followers';
COMMENT ON INDEX idx_profiles_total_drops IS 'Optimizes discover page sort by activity';
COMMENT ON INDEX idx_profiles_created_at IS 'Optimizes discover page sort by newest';
```

**Testing:**
```sql
-- Test index usage with EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT id, username, display_name
FROM profiles
WHERE genre_preferences @> ARRAY['indie']
  AND total_drops > 0
ORDER BY follower_count DESC
LIMIT 50;

-- Expected: "Bitmap Index Scan" or "Index Scan" on idx_profiles_genre_prefs
-- Should NOT show "Seq Scan" (sequential scan)
```

**Rollback:**
```sql
DROP INDEX IF EXISTS idx_profiles_follower_count_drops;
DROP INDEX IF EXISTS idx_profiles_total_drops;
DROP INDEX IF EXISTS idx_profiles_created_at;
-- Keep idx_profiles_genre_prefs as it's from base migration
```

---

### Step 2.2: Create Helper Function for Genre Filtering

**File:** `supabase/migrations/20251103000005_create_genre_filter_function.sql`

```sql
-- Create function to search curators by genre
-- Searches both genre_preferences and top_genres (computed from user_genre_stats)

CREATE OR REPLACE FUNCTION search_curators_by_genre(
  search_genre TEXT,
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
  SELECT * FROM curator_data
  ORDER BY
    CASE WHEN sort_by = 'followers' THEN curator_data.follower_count END DESC,
    CASE WHEN sort_by = 'active' THEN curator_data.total_drops END DESC,
    CASE WHEN sort_by = 'new' THEN curator_data.created_at END DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION search_curators_by_genre IS 'Searches curators by genre, sorts by followers/activity/newest';
```

**Testing:**
```sql
-- Test search by genre
SELECT username, total_drops, genre_preferences, top_genres
FROM search_curators_by_genre('indie', 'followers', 20);
-- Expected: Up to 20 curators with 'indie' in genre_preferences OR top_genres

-- Test sort by active
SELECT username, total_drops
FROM search_curators_by_genre('rock', 'active', 10);
-- Expected: Results sorted by total_drops DESC

-- Test no genre filter (all curators)
SELECT username, total_drops
FROM search_curators_by_genre(NULL, 'followers', 50);
-- Expected: All curators with drops, sorted by follower_count
```

**Rollback:**
```sql
DROP FUNCTION IF EXISTS search_curators_by_genre(TEXT, TEXT, INTEGER);
```

---

### Step 2.3: Update Discover Page to Use Database Filtering

**File:** `app/discover/page.tsx`

**Replace the entire curator query section:**

```typescript
// ❌ OLD CODE (remove)
let query = supabase
  .from('profiles')
  .select(`...`)
  .gt('total_drops', 0)

// Apply ordering...
const { data: allCurators } = await query.limit(50)

// Fetch top_genres separately...
const curatorsWithGenres = await Promise.all(...)

// Filter by genre (client-side)...
let curators = curatorsWithGenres
if (selectedGenre) {
  curators = curators.filter(...)
}

// ✅ NEW CODE (add)
const { data: curators, error: curatorsError } = await supabase
  .rpc('search_curators_by_genre', {
    search_genre: selectedGenre || null,
    sort_by: sortBy,
    limit_count: 50
  })

if (curatorsError) {
  console.error('Failed to fetch curators:', curatorsError)
}
```

**Complete Updated Section (Lines 26-76):**

```typescript
export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = createClient()

  // Get current user
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  const selectedGenre = searchParams.genre
  const sortBy = searchParams.sort || 'followers'

  // Get list of all genres from genre stats
  const { data: allGenres } = await supabase
    .from('user_genre_stats')
    .select('genre')
    .order('genre')

  const uniqueGenres = allGenres
    ? Array.from(new Set(allGenres.map((g) => g.genre))).sort()
    : []

  // Fetch curators using database-level filtering
  const { data: curators, error: curatorsError } = await supabase
    .rpc('search_curators_by_genre', {
      search_genre: selectedGenre || null,
      sort_by: sortBy,
      limit_count: 50
    })

  if (curatorsError) {
    console.error('Failed to fetch curators:', curatorsError)
  }

  // Get following list for current user
  let followingIds: string[] = []
  if (currentUser) {
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUser.id)

    followingIds = following?.map((f) => f.following_id) || []
  }

  return (
    // ... rest of component unchanged
  )
}
```

**Testing:**
```bash
# Start dev server
npm run dev

# Test 1: No genre selected
# Navigate to http://localhost:3000/discover
# Expected: Shows all curators with drops

# Test 2: Select a genre
# Click on genre filter, select "indie"
# Expected: Shows only curators with indie in genre_preferences or top_genres

# Test 3: Sort options
# Try "Sort by: Followers" → Expect descending by follower count
# Try "Sort by: Most Active" → Expect descending by total drops
# Try "Sort by: Newest" → Expect descending by created_at

# Test 4: Genre with 0 curators
# Select a genre that no one curates
# Expected: "No curators found" message

# Test 5: Performance
# Check Network tab in DevTools
# Expected: Single RPC call, not multiple queries
```

**Rollback:**
Revert `app/discover/page.tsx` to previous version using git.

---

## Step 2 Success Criteria

- [ ] Discover page filters by genre at database level (no client-side filtering)
- [ ] Genre filtering searches both `genre_preferences` and `top_genres`
- [ ] Sorting works correctly (followers, active, newest)
- [ ] Performance: Single database query instead of N+1
- [ ] Scales to 1000+ curators
- [ ] Indexes used (verified with EXPLAIN ANALYZE)
- [ ] No regression in existing functionality

---

## Step 2 Testing Checklist

**Database Performance:**
- [ ] EXPLAIN ANALYZE shows index usage for genre filter
- [ ] Query time < 100ms with 1000+ curators
- [ ] No sequential scans on profiles table

**Functional Tests:**
- [ ] All curators shown when no genre selected
- [ ] Only matching curators shown when genre selected
- [ ] Sort by followers works correctly
- [ ] Sort by active works correctly
- [ ] Sort by newest works correctly
- [ ] Limit of 50 curators enforced

**Edge Cases:**
- [ ] Genre with 0 curators returns empty array
- [ ] Genre with 100+ curators returns first 50
- [ ] NULL genre parameter returns all curators
- [ ] Invalid sort parameter defaults to followers

---

# STEP 3: Instagram-Style Feed Pagination

## Problem Statement

**Issue:** Feed loads ALL drops at once

**Current Behavior:**
- Fetches all drops from followed curators
- Renders entire list in single page load
- No lazy loading or pagination

**Problems:**
- Unusable with 1000+ drops
- Slow page load
- High memory usage
- Poor mobile experience

**Impact:** 🟡 Medium - Degrades UX as content grows

---

## Solution Architecture

Implement cursor-based pagination with infinite scroll (Instagram/Twitter style).

**Why Cursor-Based Over Offset-Based?**

| Offset-Based (`LIMIT 20 OFFSET 40`) | Cursor-Based (`WHERE created_at < X LIMIT 20`) |
|--------------------------------------|------------------------------------------------|
| ❌ Slow with large offsets           | ✅ Fast regardless of position                 |
| ❌ Inconsistent with new inserts     | ✅ Consistent results                          |
| ❌ Skips/duplicates possible         | ✅ No skips or duplicates                      |
| ✅ Simple to implement               | ❌ More complex                                |

**Decision:** Use cursor-based pagination for performance and consistency.

---

## Implementation Steps

### Step 3.1: Create API Route for Paginated Feed

**File:** `app/api/feed/route.ts` (NEW FILE)

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const feedQuerySchema = z.object({
  tab: z.enum(['following', 'discover']).default('following'),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(), // ISO timestamp of last drop
})

export async function GET(request: Request) {
  try {
    const supabase = createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const params = feedQuerySchema.parse({
      tab: searchParams.get('tab') || 'following',
      limit: parseInt(searchParams.get('limit') || '20'),
      cursor: searchParams.get('cursor') || undefined,
    })

    let drops: any[] = []
    let hasMore = false

    if (params.tab === 'following') {
      // Get list of users being followed
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      const followingIds = following?.map((f) => f.following_id) || []

      if (followingIds.length === 0) {
        // No following, return empty
        return NextResponse.json({
          drops: [],
          nextCursor: null,
          hasMore: false,
        })
      }

      // Build query for following feed
      let query = supabase
        .from('drops')
        .select(`
          *,
          profiles:user_id (
            username,
            display_name,
            avatar_url,
            follower_count
          )
        `)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(params.limit + 1) // Fetch one extra to check if more exist

      // Apply cursor (pagination)
      if (params.cursor) {
        query = query.lt('created_at', params.cursor)
      }

      const { data, error } = await query

      if (error) {
        console.error('Feed query error:', error)
        return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 })
      }

      drops = data || []
    } else {
      // Discover tab: all drops
      let query = supabase
        .from('drops')
        .select(`
          *,
          profiles:user_id (
            username,
            display_name,
            avatar_url,
            follower_count
          )
        `)
        .order('created_at', { ascending: false })
        .limit(params.limit + 1)

      if (params.cursor) {
        query = query.lt('created_at', params.cursor)
      }

      const { data, error } = await query

      if (error) {
        console.error('Discover query error:', error)
        return NextResponse.json({ error: 'Failed to fetch drops' }, { status: 500 })
      }

      drops = data || []
    }

    // Check if there are more results
    hasMore = drops.length > params.limit

    // Remove the extra item used for hasMore check
    if (hasMore) {
      drops = drops.slice(0, params.limit)
    }

    // Get next cursor (created_at of last item)
    const nextCursor = drops.length > 0 ? drops[drops.length - 1].created_at : null

    // Check if user has saved each drop
    const dropIds = drops.map(d => d.id)
    const { data: savedDrops } = await supabase
      .from('drop_saves')
      .select('drop_id')
      .eq('user_id', user.id)
      .in('drop_id', dropIds)

    const savedDropIds = new Set(savedDrops?.map(s => s.drop_id) || [])

    // Add isSaved flag to each drop
    const dropsWithSaveStatus = drops.map(drop => ({
      ...drop,
      isSaved: savedDropIds.has(drop.id)
    }))

    return NextResponse.json({
      drops: dropsWithSaveStatus,
      nextCursor,
      hasMore,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Feed API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Testing:**
```bash
# Test with curl (need to extract auth token from browser)
curl "http://localhost:3000/api/feed?tab=following&limit=5" \
  -H "Cookie: sb-<project>-auth-token=<token>"

# Expected response:
{
  "drops": [...],      // Array of 5 drops
  "nextCursor": "2024-11-03T...",  // Timestamp of last drop
  "hasMore": true      // Boolean indicating more results
}

# Test pagination
curl "http://localhost:3000/api/feed?tab=following&limit=5&cursor=2024-11-03T..." \
  -H "Cookie: ..."

# Expected: Next 5 drops after cursor
```

**Rollback:**
Delete `app/api/feed/route.ts`

---

### Step 3.2: Create Infinite Scroll Component

**File:** `components/InfiniteScrollFeed.tsx` (NEW FILE)

```typescript
'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import DropCard from './DropCard'

interface Drop {
  id: string
  track_name: string
  artist_name: string
  album_name?: string
  album_art_url?: string
  context: string
  listening_notes?: string
  genres?: string[]
  platform: string
  external_url?: string
  preview_url?: string
  created_at: string
  isSaved: boolean
  profiles: {
    username: string
    display_name?: string
    avatar_url?: string
    follower_count?: number
  }
}

interface InfiniteScrollFeedProps {
  initialDrops: Drop[]
  initialCursor: string | null
  initialHasMore: boolean
  tab: 'following' | 'discover'
}

export default function InfiniteScrollFeed({
  initialDrops,
  initialCursor,
  initialHasMore,
  tab,
}: InfiniteScrollFeedProps) {
  const [drops, setDrops] = useState<Drop[]>(initialDrops)
  const [cursor, setCursor] = useState<string | null>(initialCursor)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !cursor) return

    setLoading(true)

    try {
      const response = await fetch(
        `/api/feed?tab=${tab}&limit=20&cursor=${encodeURIComponent(cursor)}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch more drops')
      }

      const data = await response.json()

      setDrops((prev) => [...prev, ...data.drops])
      setCursor(data.nextCursor)
      setHasMore(data.hasMore)
    } catch (error) {
      console.error('Failed to load more drops:', error)
    } finally {
      setLoading(false)
    }
  }, [cursor, hasMore, loading, tab])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [loadMore, hasMore, loading])

  return (
    <div className="space-y-6">
      {/* Drops list */}
      {drops.map((drop) => (
        <DropCard
          key={drop.id}
          drop={drop}
          curator={drop.profiles}
          isSaved={drop.isSaved}
        />
      ))}

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      )}

      {/* Intersection observer target */}
      {hasMore && <div ref={observerTarget} className="h-10" />}

      {/* End of feed message */}
      {!hasMore && drops.length > 0 && (
        <div className="text-center py-8 text-gray-400">
          You've reached the end! 🎵
        </div>
      )}

      {/* Empty state */}
      {drops.length === 0 && (
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">🎵</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No drops yet
          </h3>
          <p className="text-gray-400">
            {tab === 'following'
              ? "Drops from curators you follow will appear here. Try discovering some curators!"
              : "Be the first to share a drop!"}
          </p>
        </div>
      )}
    </div>
  )
}
```

**Testing:**
Manual testing in browser (covered in Step 3.4).

---

### Step 3.3: Update Feed Page to Use Infinite Scroll

**File:** `app/feed/page.tsx`

**Replace server-side rendering with client-side infinite scroll:**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FeedTabs from '@/components/FeedTabs'
import InfiniteScrollFeed from '@/components/InfiniteScrollFeed'

export const dynamic = 'force-dynamic'

interface SearchParams {
  tab?: string
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // Check if user completed onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded')
    .eq('id', user.id)
    .single()

  if (!profile?.onboarded) {
    redirect('/onboarding')
  }

  const activeTab = (searchParams.tab === 'discover' ? 'discover' : 'following') as 'following' | 'discover'

  // Fetch initial page of drops (20 items)
  let initialDrops: any[] = []
  let initialCursor: string | null = null
  let initialHasMore = false

  if (activeTab === 'following') {
    // Get following list
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds = following?.map((f) => f.following_id) || []

    if (followingIds.length > 0) {
      const { data: drops } = await supabase
        .from('drops')
        .select(`
          *,
          profiles:user_id (
            username,
            display_name,
            avatar_url,
            follower_count
          )
        `)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(21) // Fetch 21 to check if more exist

      if (drops && drops.length > 0) {
        initialHasMore = drops.length > 20
        initialDrops = drops.slice(0, 20)
        initialCursor = initialDrops[initialDrops.length - 1].created_at

        // Get save status for initial drops
        const dropIds = initialDrops.map(d => d.id)
        const { data: savedDrops } = await supabase
          .from('drop_saves')
          .select('drop_id')
          .eq('user_id', user.id)
          .in('drop_id', dropIds)

        const savedDropIds = new Set(savedDrops?.map(s => s.drop_id) || [])
        initialDrops = initialDrops.map(drop => ({
          ...drop,
          isSaved: savedDropIds.has(drop.id)
        }))
      }
    }
  } else {
    // Discover: all drops
    const { data: drops } = await supabase
      .from('drops')
      .select(`
        *,
        profiles:user_id (
          username,
          display_name,
          avatar_url,
          follower_count
        )
      `)
      .order('created_at', { ascending: false })
      .limit(21)

    if (drops && drops.length > 0) {
      initialHasMore = drops.length > 20
      initialDrops = drops.slice(0, 20)
      initialCursor = initialDrops[initialDrops.length - 1].created_at

      // Get save status
      const dropIds = initialDrops.map(d => d.id)
      const { data: savedDrops } = await supabase
        .from('drop_saves')
        .select('drop_id')
        .eq('user_id', user.id)
        .in('drop_id', dropIds)

      const savedDropIds = new Set(savedDrops?.map(s => s.drop_id) || [])
      initialDrops = initialDrops.map(drop => ({
        ...drop,
        isSaved: savedDropIds.has(drop.id)
      }))
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Feed</h1>
          <a
            href="/drop/create"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
          >
            New Drop
          </a>
        </div>

        {/* Tabs */}
        <FeedTabs activeTab={activeTab} />

        {/* Infinite Scroll Feed */}
        <div className="mt-6">
          <InfiniteScrollFeed
            initialDrops={initialDrops}
            initialCursor={initialCursor}
            initialHasMore={initialHasMore}
            tab={activeTab}
          />
        </div>
      </div>
    </div>
  )
}
```

**Testing:**
Covered in Step 3.4.

---

### Step 3.4: Create FeedTabs Component

**File:** `components/FeedTabs.tsx` (NEW FILE)

```typescript
'use client'

import Link from 'next/link'

interface FeedTabsProps {
  activeTab: 'following' | 'discover'
}

export default function FeedTabs({ activeTab }: FeedTabsProps) {
  return (
    <div className="flex gap-2 border-b border-gray-700">
      <Link
        href="/feed?tab=following"
        className={`px-6 py-3 font-semibold transition-colors ${
          activeTab === 'following'
            ? 'text-purple-400 border-b-2 border-purple-400'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        Following
      </Link>
      <Link
        href="/feed?tab=discover"
        className={`px-6 py-3 font-semibold transition-colors ${
          activeTab === 'discover'
            ? 'text-purple-400 border-b-2 border-purple-400'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        Discover
      </Link>
    </div>
  )
}
```

---

### Step 3.5: Testing Infinite Scroll

**Manual Testing Checklist:**

```bash
# Start dev server
npm run dev

# Test 1: Following tab with no follows
# Expected: "No drops yet" empty state

# Test 2: Follow some curators, navigate to feed
# Expected: First 20 drops displayed

# Test 3: Scroll to bottom
# Expected: Loading spinner appears, next 20 drops load automatically

# Test 4: Continue scrolling
# Expected: More drops load until reaching end

# Test 5: End of feed
# Expected: "You've reached the end!" message

# Test 6: Switch to Discover tab
# Expected: All drops across platform, infinite scroll works

# Test 7: Performance
# Open DevTools > Network tab
# Scroll through feed
# Expected: API calls only when scrolling near bottom, ~20 items per call

# Test 8: Save a drop
# Click save button on a drop
# Expected: Button updates immediately (optimistic UI)
# Scroll down, scroll back up
# Expected: Save state persists
```

**Rollback:**
```bash
git checkout app/feed/page.tsx
rm app/api/feed/route.ts
rm components/InfiniteScrollFeed.tsx
rm components/FeedTabs.tsx
```

---

## Step 3 Success Criteria

- [ ] Feed loads initial 20 drops
- [ ] Scrolling to bottom loads next 20 drops automatically
- [ ] Loading spinner displays during fetch
- [ ] End of feed message displays when no more drops
- [ ] No duplicate drops appear
- [ ] No dropped items (gaps in feed)
- [ ] Performance: < 200ms per page load
- [ ] Works on mobile (touch scrolling)
- [ ] Tab switching preserves scroll position

---

## Step 3 Testing Checklist

**Functional Tests:**
- [ ] Following tab shows drops from followed curators only
- [ ] Discover tab shows all drops
- [ ] Infinite scroll loads more drops
- [ ] Loading indicator appears during fetch
- [ ] End of feed message displays correctly
- [ ] Empty state shows when no drops

**Performance Tests:**
- [ ] Initial page load < 1 second
- [ ] Subsequent page loads < 200ms
- [ ] Memory usage stable (no leaks)
- [ ] Smooth scrolling (60fps)

**Edge Cases:**
- [ ] User with 0 follows → Empty state
- [ ] User with 1000+ drops in feed → Pagination works
- [ ] Network error during fetch → Error handling
- [ ] Rapid scrolling → No duplicate API calls

---

# STEP 4: Robust Taste Development Onboarding

## Problem Statement

**Issue:** Current onboarding doesn't develop taste profile for algorithmic matching

**Current Onboarding:**
1. Username + display name
2. Bio (optional)
3. Genre preferences (up to 5)
4. Curation statement

**Problems:**
- No taste questionnaire
- Can't recommend curators to new users
- Cold start problem: empty following list
- Generic genre selection not granular enough

**Impact:** 🟡 Medium - Poor new user experience

---

## Solution Architecture

**New Onboarding Flow:**

1. **Identity** (unchanged)
2. **Taste Development** (NEW - Critical)
   - Select 3-10 genres (required)
   - Rate experience level per genre
   - Select discovery preferences
   - Optional: List favorite artists
3. **Curator or Listener Choice** (NEW)
   - Choose to curate or just discover
4. **Curation Statement** (only if curator)
5. **Recommended Curators** (NEW)
   - Algorithm suggests curators based on taste
   - Quick follow interface

---

## Implementation Steps

### Step 4.1: Add Taste Profile to Database

**File:** `supabase/migrations/20251103000006_add_taste_profile.sql`

```sql
-- Add taste profile fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_curator BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS discovery_preferences TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS favorite_artists TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create taste_profile table for detailed genre ratings
CREATE TABLE IF NOT EXISTS taste_profile (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  genre TEXT NOT NULL,
  experience_level TEXT NOT NULL CHECK (experience_level IN ('discovering', 'regular', 'deep_diver')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (user_id, genre)
);

CREATE INDEX IF NOT EXISTS idx_taste_profile_user ON taste_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_taste_profile_genre ON taste_profile(genre);

-- Enable RLS
ALTER TABLE taste_profile ENABLE ROW LEVEL SECURITY;

-- Taste profile policies
DROP POLICY IF EXISTS "Users can view their own taste profile" ON taste_profile;
CREATE POLICY "Users can view their own taste profile"
ON taste_profile FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own taste profile" ON taste_profile;
CREATE POLICY "Users can update their own taste profile"
ON taste_profile FOR ALL
USING (auth.uid() = user_id);

COMMENT ON TABLE taste_profile IS 'Detailed taste profile for algorithmic curator matching';
COMMENT ON COLUMN profiles.is_curator IS 'Whether user wants to curate (vs just discover)';
COMMENT ON COLUMN profiles.discovery_preferences IS 'What user looks for: new_releases, deep_cuts, classics, experimental, lyrical, production';
COMMENT ON COLUMN profiles.favorite_artists IS 'User-provided favorite artists for taste matching';
```

**Testing:**
```sql
-- Test insert taste profile
INSERT INTO taste_profile (user_id, genre, experience_level)
VALUES ('<test-user-uuid>', 'indie', 'deep_diver');

-- Verify
SELECT * FROM taste_profile WHERE user_id = '<test-user-uuid>';
-- Expected: 1 row

-- Test constraints
INSERT INTO taste_profile (user_id, genre, experience_level)
VALUES ('<test-user-uuid>', 'rock', 'invalid_level');
-- Expected: Error (constraint violation)
```

**Rollback:**
```sql
DROP TABLE IF EXISTS taste_profile CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS is_curator;
ALTER TABLE profiles DROP COLUMN IF EXISTS discovery_preferences;
ALTER TABLE profiles DROP COLUMN IF EXISTS favorite_artists;
```

---

### Step 4.2: Create Curator Recommendation Algorithm

**File:** `supabase/migrations/20251103000007_create_recommendation_function.sql`

```sql
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
```

**Testing:**
```sql
-- Create taste profile for test user
INSERT INTO taste_profile (user_id, genre, experience_level)
VALUES
  ('<test-user-uuid>', 'indie', 'deep_diver'),
  ('<test-user-uuid>', 'rock', 'regular'),
  ('<test-user-uuid>', 'electronic', 'discovering');

-- Get recommendations
SELECT
  username,
  total_drops,
  top_genres,
  match_score
FROM recommend_curators_for_user('<test-user-uuid>', 10);

-- Expected: Up to 10 curators, ordered by match_score DESC
-- Curators with 'indie' in top_genres should have higher scores
```

**Rollback:**
```sql
DROP FUNCTION IF EXISTS recommend_curators_for_user(UUID, INTEGER);
```

---

### Step 4.3: Update Onboarding UI (Multi-Step Form)

This step involves significant UI changes. I'll provide the structure:

**Files to Create/Update:**
- `app/onboarding/page.tsx` - Update to multi-step wizard
- `components/onboarding/Step1Identity.tsx`
- `components/onboarding/Step2TasteDevelopment.tsx` (NEW)
- `components/onboarding/Step3CuratorChoice.tsx` (NEW)
- `components/onboarding/Step4CurationStatement.tsx`
- `components/onboarding/Step5RecommendedCurators.tsx` (NEW)

**Due to length, I'll document the structure and key code in a separate onboarding spec:**

**File:** `app/onboarding/page.tsx` (Updated Structure)

```typescript
'use client'

import { useState } from 'react'
import Step1Identity from '@/components/onboarding/Step1Identity'
import Step2TasteDevelopment from '@/components/onboarding/Step2TasteDevelopment'
import Step3CuratorChoice from '@/components/onboarding/Step3CuratorChoice'
import Step4CurationStatement from '@/components/onboarding/Step4CurationStatement'
import Step5RecommendedCurators from '@/components/onboarding/Step5RecommendedCurators'

interface OnboardingData {
  username: string
  display_name: string
  bio: string
  selectedGenres: string[]
  genreExperience: Record<string, 'discovering' | 'regular' | 'deep_diver'>
  discoveryPreferences: string[]
  favoriteArtists: string[]
  isCurator: boolean
  curationStatement: string
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<OnboardingData>({
    username: '',
    display_name: '',
    bio: '',
    selectedGenres: [],
    genreExperience: {},
    discoveryPreferences: [],
    favoriteArtists: [],
    isCurator: true,
    curationStatement: '',
  })

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }

  const nextStep = () => setStep((prev) => prev + 1)
  const prevStep = () => setStep((prev) => prev - 1)

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold ${
                  s === step
                    ? 'bg-purple-600 text-white'
                    : s < step
                    ? 'bg-purple-900 text-purple-300'
                    : 'bg-gray-800 text-gray-500'
                }`}
              >
                {s}
              </div>
            ))}
          </div>
          <div className="text-center text-sm text-gray-400">
            Step {step} of 5
          </div>
        </div>

        {/* Step content */}
        {step === 1 && (
          <Step1Identity
            data={data}
            updateData={updateData}
            onNext={nextStep}
          />
        )}
        {step === 2 && (
          <Step2TasteDevelopment
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}
        {step === 3 && (
          <Step3CuratorChoice
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}
        {step === 4 && data.isCurator && (
          <Step4CurationStatement
            data={data}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}
        {step === 4 && !data.isCurator && (
          <Step5RecommendedCurators data={data} />
        )}
        {step === 5 && data.isCurator && (
          <Step5RecommendedCurators data={data} />
        )}
      </div>
    </div>
  )
}
```

**Step 2: Taste Development Component Example:**

**File:** `components/onboarding/Step2TasteDevelopment.tsx` (NEW)

```typescript
'use client'

import { useState } from 'react'

const AVAILABLE_GENRES = [
  'Indie', 'Rock', 'Electronic', 'Hip Hop', 'Jazz', 'Classical',
  'Folk', 'Metal', 'R&B', 'Soul', 'Funk', 'Reggae', 'Pop',
  'Country', 'Blues', 'Punk', 'Alternative', 'Ambient'
]

const DISCOVERY_PREFERENCES = [
  { value: 'new_releases', label: 'New Releases', description: 'Just dropped' },
  { value: 'deep_cuts', label: 'Deep Cuts', description: 'Hidden gems' },
  { value: 'classics', label: 'Classics', description: 'Timeless tracks' },
  { value: 'experimental', label: 'Experimental', description: 'Pushing boundaries' },
  { value: 'lyrical', label: 'Lyrical', description: 'Focus on words' },
  { value: 'production', label: 'Production', description: 'Sound design' },
]

interface Step2Props {
  data: any
  updateData: (updates: any) => void
  onNext: () => void
  onBack: () => void
}

export default function Step2TasteDevelopment({
  data,
  updateData,
  onNext,
  onBack,
}: Step2Props) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    data.selectedGenres || []
  )
  const [genreExperience, setGenreExperience] = useState<Record<string, string>>(
    data.genreExperience || {}
  )
  const [discoveryPrefs, setDiscoveryPrefs] = useState<string[]>(
    data.discoveryPreferences || []
  )
  const [artists, setArtists] = useState<string[]>(
    data.favoriteArtists || ['', '', '']
  )

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== genre))
      const newExp = { ...genreExperience }
      delete newExp[genre]
      setGenreExperience(newExp)
    } else if (selectedGenres.length < 10) {
      setSelectedGenres([...selectedGenres, genre])
    }
  }

  const setExperience = (genre: string, level: string) => {
    setGenreExperience({ ...genreExperience, [genre]: level })
  }

  const togglePref = (pref: string) => {
    if (discoveryPrefs.includes(pref)) {
      setDiscoveryPrefs(discoveryPrefs.filter((p) => p !== pref))
    } else {
      setDiscoveryPrefs([...discoveryPrefs, pref])
    }
  }

  const handleNext = () => {
    // Validate: at least 3 genres, each with experience level
    if (selectedGenres.length < 3) {
      alert('Please select at least 3 genres')
      return
    }

    const missingExperience = selectedGenres.some((g) => !genreExperience[g])
    if (missingExperience) {
      alert('Please rate your experience level for each selected genre')
      return
    }

    updateData({
      selectedGenres,
      genreExperience,
      discoveryPreferences: discoveryPrefs,
      favoriteArtists: artists.filter((a) => a.trim().length > 0),
    })
    onNext()
  }

  return (
    <div className="bg-gray-800 rounded-lg p-8">
      <h2 className="text-2xl font-bold text-white mb-2">
        Let's understand your music taste
      </h2>
      <p className="text-gray-400 mb-6">
        This helps us recommend curators who match your taste
      </p>

      {/* Genre Selection */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">
          Select 3-10 genres you love
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {AVAILABLE_GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => toggleGenre(genre)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedGenres.includes(genre)
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-400">
          {selectedGenres.length}/10 genres selected (minimum 3)
        </p>
      </div>

      {/* Experience Level */}
      {selectedGenres.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-3">
            Rate your experience in each genre
          </h3>
          <div className="space-y-4">
            {selectedGenres.map((genre) => (
              <div key={genre} className="bg-gray-900 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">{genre}</h4>
                <div className="grid grid-cols-3 gap-2">
                  {['discovering', 'regular', 'deep_diver'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setExperience(genre, level)}
                      className={`py-2 px-3 rounded text-sm font-medium transition-colors ${
                        genreExperience[genre] === level
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {level === 'discovering' && 'Just discovering'}
                      {level === 'regular' && 'Regular listener'}
                      {level === 'deep_diver' && 'Deep diver'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discovery Preferences */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">
          What are you looking for? (optional)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {DISCOVERY_PREFERENCES.map((pref) => (
            <button
              key={pref.value}
              onClick={() => togglePref(pref.value)}
              className={`p-4 rounded-lg text-left transition-colors ${
                discoveryPrefs.includes(pref.value)
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-900 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="font-semibold">{pref.label}</div>
              <div className="text-sm opacity-80">{pref.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Favorite Artists */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">
          Name 3-5 artists you've been obsessed with lately (optional)
        </h3>
        <div className="space-y-2">
          {artists.map((artist, index) => (
            <input
              key={index}
              type="text"
              value={artist}
              onChange={(e) => {
                const newArtists = [...artists]
                newArtists[index] = e.target.value
                setArtists(newArtists)
              }}
              placeholder={`Artist ${index + 1}`}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
            />
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  )
}
```

**Due to length constraints, the remaining components (Step3, Step4, Step5) follow the same pattern. I'll document them in the vision.md if needed.**

---

## Step 4 Success Criteria

- [ ] New users complete taste development questionnaire
- [ ] Taste profile stored in database
- [ ] Curator recommendations based on taste profile
- [ ] Users can choose "curator" or "listener" mode
- [ ] Curators complete curation statement step
- [ ] Listeners skip curation statement
- [ ] Final step shows 6-12 recommended curators
- [ ] Quick follow buttons work
- [ ] After onboarding, feed has content (from followed curators)

---

## Step 4 Testing Checklist

**Functional Tests:**
- [ ] Step 1: Username validation works
- [ ] Step 2: Minimum 3 genres required
- [ ] Step 2: Each genre requires experience rating
- [ ] Step 3: Curator/listener choice saves correctly
- [ ] Step 4: Curation statement appears only for curators
- [ ] Step 5: Recommended curators based on taste
- [ ] Follow button works in step 5
- [ ] Onboarded flag set correctly

**Algorithm Tests:**
- [ ] Recommendations include genre overlap
- [ ] Recommendations exclude already-followed curators
- [ ] Recommendations prioritize active curators (5+ drops)
- [ ] Match score calculation accurate
- [ ] Users with no matching genres get popular curators

**Edge Cases:**
- [ ] User selects 10 genres → All stored correctly
- [ ] User skips optional fields → Recommendations still work
- [ ] No curators match taste → Show top curators by follower count
- [ ] Database error → Graceful error handling

---

# Implementation Order & Checkpoints

## Execution Plan

**Phase 1: Data Model Fixes (1-2 hours)**
1. Run migration 20251103000001 (top_genres function)
   - **CHECKPOINT:** Test function with existing user
2. Run migration 20251103000002 (genre stats trigger)
   - **CHECKPOINT:** Create test drop, verify stats updated
3. Run migration 20251103000003 (backfill)
   - **CHECKPOINT:** Verify all existing drops have stats
4. Update discover page
   - **CHECKPOINT:** Test in browser, verify genres display
5. Update profile page
   - **CHECKPOINT:** Test taste areas display

**Phase 2: Genre Filtering (30 minutes)**
1. Run migration 20251103000004 (indexes)
   - **CHECKPOINT:** Run EXPLAIN ANALYZE on queries
2. Run migration 20251103000005 (search function)
   - **CHECKPOINT:** Test function in SQL editor
3. Update discover page to use function
   - **CHECKPOINT:** Test genre filtering in browser

**Phase 3: Feed Pagination (2-3 hours)**
1. Create API route /api/feed
   - **CHECKPOINT:** Test with curl
2. Create InfiniteScrollFeed component
   - **CHECKPOINT:** Build and verify no TypeScript errors
3. Create FeedTabs component
   - **CHECKPOINT:** Build success
4. Update feed page
   - **CHECKPOINT:** Test following tab in browser
5. Test discover tab
   - **CHECKPOINT:** Verify infinite scroll works

**Phase 4: Taste Onboarding (4-6 hours)**
1. Run migration 20251103000006 (taste profile table)
   - **CHECKPOINT:** Test insert/select
2. Run migration 20251103000007 (recommendation function)
   - **CHECKPOINT:** Test with SQL, verify results
3. Create Step2TasteDevelopment component
   - **CHECKPOINT:** Build success
4. Create Step3CuratorChoice component
   - **CHECKPOINT:** Build success
5. Create Step5RecommendedCurators component
   - **CHECKPOINT:** Build success
6. Update onboarding page
   - **CHECKPOINT:** Complete full onboarding flow
7. Create API route for saving onboarding data
   - **CHECKPOINT:** Test with browser DevTools

---

## Rollback Procedures

**If migration fails:**
```bash
# Check current migration version
supabase migration list

# Rollback last migration
supabase db reset

# Re-apply up to failed migration
supabase db push --except <failed-migration-file>
```

**If UI breaks:**
```bash
# Revert to last working commit
git log --oneline  # Find last working commit
git checkout <commit-hash> -- <file-path>

# Or revert entire branch
git reset --hard HEAD~1
```

**If production database corrupted:**
```sql
-- Use rollback SQL from each migration section
-- Execute in Supabase SQL editor
```

---

## Post-Implementation Tasks

**After Step 1:**
- [ ] Monitor genre stats population over 24 hours
- [ ] Verify trigger performance (check Supabase logs)
- [ ] Collect user feedback on taste areas display

**After Step 2:**
- [ ] Monitor query performance (Supabase dashboard)
- [ ] Check index usage with EXPLAIN ANALYZE
- [ ] A/B test: client-side vs server-side filtering speed

**After Step 3:**
- [ ] Monitor API route performance
- [ ] Check for memory leaks (Chrome DevTools)
- [ ] Collect metrics: avg drops loaded per session

**After Step 4:**
- [ ] Track onboarding completion rate
- [ ] Monitor recommendation accuracy (user feedback)
- [ ] Measure: % users who follow recommended curators

---

## Success Metrics

**Overall Implementation Success:**
- [ ] All migrations applied successfully
- [ ] No production errors in Supabase logs
- [ ] All tests passing
- [ ] Performance metrics within targets:
  - Discover page load < 1s
  - Feed pagination < 200ms
  - Onboarding completion time < 5 min
- [ ] User satisfaction: > 80% positive feedback

---

**END OF IMPLEMENTATION PLAN**

Next Steps:
1. Review this plan with user
2. Get approval to proceed
3. Execute Phase 1 (Data Model Fixes)
4. Checkpoint after each major change
5. Ask before continuing to next phase
