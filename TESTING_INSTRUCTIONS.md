# Testing Instructions - November 3, 2025 Updates

## What Was Implemented

This session implemented 3 major architecture improvements:

1. **STEP 1:** Fixed data model for genre stats and taste areas
2. **STEP 2:** Database-level genre filtering for discover page
3. **STEP 3:** Instagram-style infinite scroll feed pagination

---

## Prerequisites

Before testing, ensure:
- [ ] Supabase is running: `npx supabase status`
- [ ] Dev server is running: `npm run dev`
- [ ] You have at least one user account created
- [ ] Optionally: Create some test drops with different genres

---

## Test 1: Genre Stats Auto-Population

**What Changed:** `user_genre_stats` table now auto-populates when drops are created.

### Test Steps:

1. **Navigate to:** http://localhost:3000/drop/create
2. **Create a test drop:**
   - Search for any track (e.g., "Arctic Monkeys")
   - Add context (minimum 50 characters)
   - **Important:** Add genre tags (e.g., "indie", "rock")
   - Submit the drop

3. **Open Supabase Studio:** http://localhost:54323
4. **Navigate to:** Table Editor → `user_genre_stats`
5. **Verify:**
   - New row(s) created for your user
   - `genre` matches what you entered
   - `total_drops` = 1
   - `activity_level` = 'exploring' (for first few drops)

6. **Create more drops in same genre:**
   - Create 4 more drops with "indie" genre
   - Check `user_genre_stats` again
   - `total_drops` should now be 5
   - `activity_level` should still be 'exploring'

7. **Create 15 more drops:**
   - `total_drops` = 20
   - `activity_level` should change to 'occasional'

### Expected Activity Levels:
- **Exploring:** < 5 drops
- **Occasional:** 5-19 drops
- **Active:** 20-49 drops
- **Prolific:** 50+ drops

### What to Watch For:
- ❌ Genre stats don't appear → Check migration was applied
- ❌ Activity level doesn't update → Check `calculate_activity_level()` function
- ✅ Genre stats appear immediately → Trigger working correctly

---

## Test 2: Top Genres Display on Profiles

**What Changed:** Profile pages now show "Taste Areas" based on genre activity.

### Test Steps:

1. **Navigate to your profile:** http://localhost:3000/profile/[your-username]
2. **Scroll to sidebar:** Look for "Taste Areas" section

### Verify:
- [ ] Taste Areas section visible
- [ ] Shows genres you've dropped
- [ ] Displays activity level (exploring/occasional/active/prolific)
- [ ] Shows drop count per genre
- [ ] Shows saves received per genre
- [ ] Shows last drop date

### What to Watch For:
- ❌ Taste Areas section missing → User has no drops with genres
- ❌ Empty when you have drops → Check `user_genre_stats` table has data
- ✅ Shows correct genres and counts → Working as expected

---

## Test 3: Discover Page Genre Filtering

**What Changed:** Genre filtering now happens at database level (faster, searches all curators).

### Test Steps:

1. **Navigate to:** http://localhost:3000/discover
2. **Without selecting a genre:**
   - Verify you see curators with drops
   - Check that curator cards show genre badges

3. **Select a genre from dropdown:**
   - Choose a genre (e.g., "indie")
   - Page should filter to only show curators who:
     - Have "indie" in their `genre_preferences` OR
     - Have "indie" in their top 5 genres based on activity

4. **Test different sort options:**
   - Sort by: Followers (default)
   - Sort by: Most Active
   - Sort by: Newest

### Verify:
- [ ] Genre filtering works instantly
- [ ] Curators shown match selected genre
- [ ] Sorting works correctly
- [ ] Top genres display on curator cards

### Performance Test:
- Open DevTools → Network tab
- Filter by genre
- Should see **single** RPC call to `search_curators_by_genre`
- NOT multiple queries

### What to Watch For:
- ❌ No curators appear when filtering → No curators have that genre
- ❌ Wrong curators appear → Check function logic in Supabase Studio
- ✅ Instant filtering with correct results → Database filtering working

---

## Test 4: Infinite Scroll Feed

**What Changed:** Feed now loads 20 drops at a time, fetches more as you scroll.

### Test Steps:

#### 4A: Test Following Tab (if you follow curators)

1. **Navigate to:** http://localhost:3000/feed?tab=following
2. **Initial Load:**
   - Should see first 20 drops from curators you follow
   - No loading spinner (already loaded server-side)

3. **Scroll down:**
   - When you reach bottom, loading spinner should appear
   - Next 20 drops should load automatically
   - Spinner disappears

4. **Continue scrolling:**
   - Keep scrolling to test multiple pages
   - Eventually see "You've reached the end! 🎵"

5. **Open DevTools → Network tab:**
   - Scroll to trigger load
   - Should see request to `/api/feed?tab=following&limit=20&cursor=[timestamp]`
   - Verify cursor updates with each request

#### 4B: Test Discover Tab (all drops)

1. **Navigate to:** http://localhost:3000/feed?tab=discover
2. **Repeat steps above**
3. **Verify:** Shows ALL drops from everyone, not just following

#### 4C: Test Empty States

1. **Following tab with no follows:**
   - Create a new user account
   - Don't follow anyone
   - Navigate to Following tab
   - Should see: "Drops from curators you follow will appear here..."

2. **Discover tab with no drops:**
   - Fresh database with no drops
   - Should see: "Be the first to share a drop!"

### Verify:
- [ ] Initial 20 drops load immediately
- [ ] Scrolling triggers automatic load
- [ ] Loading spinner appears during fetch
- [ ] No duplicate drops
- [ ] End message appears when no more drops
- [ ] Tab switching works correctly

### Performance Metrics:
- Initial page load: < 1 second
- Subsequent page loads: < 200ms
- Smooth scrolling (no jank)

### What to Watch For:
- ❌ Infinite loading spinner → API error, check console
- ❌ Duplicate drops → Cursor pagination bug
- ❌ Skipped drops → Cursor pagination bug
- ✅ Smooth continuous scrolling → Working correctly

---

## Test 5: End-to-End User Journey

**Complete workflow test:**

1. **Sign up new account:**
   - http://localhost:3000/auth/signup
   - Complete onboarding
   - Choose username

2. **Create drops with genres:**
   - Create 3 drops with "indie" genre
   - Create 2 drops with "electronic" genre
   - Create 1 drop with "jazz" genre

3. **Check your profile:**
   - Navigate to your profile
   - Verify Taste Areas show:
     - indie: 3 drops (exploring)
     - electronic: 2 drops (exploring)
     - jazz: 1 drop (exploring)

4. **Discover curators:**
   - Navigate to /discover
   - Filter by "indie"
   - Your profile should appear if no one else has indie drops
   - Check your curator card shows "indie" badge

5. **Follow someone and test feed:**
   - Follow another curator
   - Navigate to /feed?tab=following
   - See their drops
   - Scroll to test infinite scroll

6. **Test discover feed:**
   - Navigate to /feed?tab=discover
   - See all drops across platform
   - Scroll to test pagination

---

## Common Issues & Solutions

### Issue: "Genre stats not populating"

**Solution:**
```bash
# Check if migrations applied
npx supabase db reset

# Verify trigger exists
# Open Supabase Studio → Database → Functions
# Look for: update_user_genre_stats()
```

### Issue: "Discover page shows no curators"

**Solution:**
- Ensure users have `total_drops > 0`
- Check `user_genre_stats` table has data
- Try without genre filter first

### Issue: "Infinite scroll not loading more"

**Solution:**
- Open DevTools → Console (check for errors)
- Open DevTools → Network (check API calls)
- Verify cursor is updating
- Check you have > 20 drops total

### Issue: "Top genres not showing on profile"

**Solution:**
- User must have drops with genre tags
- Check `user_genre_stats` table
- Verify `get_user_top_genres()` function exists

---

## Testing Checklist

Before marking as complete, verify:

**Data Model:**
- [ ] Genre stats auto-populate on drop creation
- [ ] Genre stats update on drop deletion
- [ ] Activity levels calculate correctly
- [ ] Top genres function returns correct data

**Discover Page:**
- [ ] Genre filtering works
- [ ] All sort options work (followers/active/newest)
- [ ] Curator cards show top genres
- [ ] Single database query (not N+1)

**Feed Pagination:**
- [ ] Initial 20 drops load fast
- [ ] Scrolling triggers automatic load
- [ ] No duplicate drops
- [ ] End of feed message appears
- [ ] Both tabs work (following/discover)

**Profile Pages:**
- [ ] Taste Areas section displays
- [ ] Shows correct genres and counts
- [ ] Activity levels accurate
- [ ] Updates when new drops created

---

## Performance Benchmarks

**Target Metrics:**
- Discover page load: < 1 second
- Feed initial load: < 1 second
- Feed pagination: < 200ms per page
- Genre filtering: < 100ms

**How to Measure:**
1. Open DevTools → Network tab
2. Reload page
3. Check "DOMContentLoaded" time
4. Should be under targets above

---

## What's Next (Tomorrow)

**STEP 4: Robust Taste Development Onboarding**

Will implement:
- Enhanced onboarding with taste questionnaire
- Curator recommendation algorithm
- "Curator vs Listener" choice
- Recommended curators based on taste match

**Not included in today's changes:**
- Taste profile table
- Recommendation algorithm
- Enhanced onboarding flow

---

## Rollback Instructions

If something breaks and you need to rollback:

```bash
# View recent commits
git log --oneline

# Rollback to before today's changes
git reset --hard aba6922

# Restart Supabase
npx supabase stop
npx supabase start

# Restart dev server
npm run dev
```

---

## Need Help?

**Check logs:**
- Supabase Studio: http://localhost:54323 → Logs
- Next.js console: Terminal running `npm run dev`
- Browser console: DevTools → Console

**Review documentation:**
- `vision.md` - Product vision and features
- `ConnectionGuide.txt` - Ports and endpoints
- `IMPLEMENTATION_PLAN.md` - Technical details

**Current branch:**
`claude/project-review-011CUYCggo6PyaMHfkxeLBCH`

---

**Last Updated:** 2025-11-03
**Testing these features:** Steps 1, 2, 3
**Next session:** Step 4 (Taste Development Onboarding)
