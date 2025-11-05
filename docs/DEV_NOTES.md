# Development Notes

Technical decisions, gotchas, and lessons learned during development.

---

## 2025-11-04 - Code Review Findings & Critical Bug Fixes

**Context**: Conducted comprehensive code review of commit 6e2f624 (Step 4 implementation) using code-reviewer agent before production deployment.

**Critical Bugs Found & Fixed**:

### Bug 1: Default `is_curator` Value
- **Issue**: `is_curator` column defaulted to `TRUE` instead of `FALSE`
- **Impact**: All new users would become curators by default
- **Root Cause**: Copy-paste error in migration 20251103000006
- **Fix**: Created migration 20251104000001 to set correct default and add backfill

### Bug 2: Genre Comparison Type Mismatch
- **Issue**: `recommend_curators_for_user()` function had SQL type error
- **Code**:
  ```sql
  -- BEFORE (broken):
  WHERE curator_genre = ANY((SELECT preferred_genres FROM user_taste))

  -- AFTER (fixed):
  CROSS JOIN user_taste
  WHERE curator_genre = ANY(user_taste.preferred_genres)
  ```
- **Impact**: Recommendation function would fail at runtime
- **Fix**: Applied in migration 20251104000001

### Bug 3: Missing RLS Policies
- **Issue**: `user_genre_stats` table only had SELECT policy, no INSERT/UPDATE
- **Impact**: Drop creation failed with error code 42501 (RLS violation)
- **Root Cause**: Trigger tried to INSERT/UPDATE genre stats but was blocked
- **Fix**: Created migration 20251104000002 with INSERT/UPDATE/DELETE policies

### Bug 4: Invalid ORDER BY in Aggregate
- **Issue**: `get_user_top_genres()` had ORDER BY on column not in SELECT
- **Fix**: Removed invalid ORDER BY clause (subquery already ordered)

**UX Issues Found & Fixed**:

### Issue 1: Favorite Artists Input Not Visible
- **Symptom**: User reported "no way to input anything"
- **Root Cause**: Dark styling blended into background, only 3 fields
- **Fix**:
  - Increased to 5 input fields
  - Thicker borders (`border-2`)
  - Better placeholders with examples
  - Helper text explaining purpose
- **File**: `components/onboarding/Step2TasteDevelopment.tsx:145-159`

### Issue 2: Blank Step 4/4 for Listeners
- **Symptom**: Listeners saw only progress numbers, no content
- **Root Cause**: Step 5 only rendered if `userId` was truthy (async auth check)
- **Fix**: Added loading state for when `userId` is null
- **File**: `app/onboarding/page.tsx:244-260`

### Issue 3: Curator Choice Wording Confusion
- **User Feedback**: "every user will have the access to do both"
- **Fix**: Changed wording to clarify role is a preference, not restriction
  - Added: "Everyone can both curate and discover"
  - Changed "I want to curate" → "Curate Music"
  - Changed "I just want to discover" → "Discover Music"
- **File**: `components/onboarding/Step3CuratorChoice.tsx:28-32`

**Infrastructure Issues**:

### Issue: Next.js Infinite Loading
- **Symptom**: `localhost:3001` loaded indefinitely, no compilation output
- **Root Cause**: Corrupted `.next` build cache
- **Fix**: Delete `.next` directory and restart dev server
- **PowerShell Command**: `Remove-Item -Recurse -Force .next`
- **Added to troubleshooting guide**: docs/LOCAL_TESTING_GUIDE.md

**Testing Results**:
- Created comprehensive test suite: `supabase/tests/test_recommendation_algorithm.sql`
- 6 edge cases tested: empty database, no matches, 100% match, cold start, already-followed, scoring weights
- Result: 4/6 passing, 2 partial (test environment FK constraints)

**Deployment Actions Taken**:
- Created DEPLOYMENT_CHECKLIST_RESULTS.md with 592-line deployment guide
- Created LOCAL_TESTING_GUIDE.md with PowerShell-compatible commands
- Applied all 12 migrations successfully
- Repository consolidated to `main` branch
- All critical bugs fixed before production

**Lessons Learned**:
1. Always code review migrations before applying to production
2. Test RLS policies thoroughly - they fail silently until triggered
3. UX testing catches issues automated tests miss
4. Corrupted build cache is common with rapid iteration
5. PowerShell requires different syntax than bash (`Remove-Item` vs `rm -rf`)

---

## 2025-11-04 - Simplified Experience Level Approach

**Context**: Original implementation plan called for users to manually rate their experience level (discovering/regular/deep_diver) for each genre during onboarding.

**Decision**: Removed manual experience rating. System now automatically determines experience levels based on actual user behavior over time.

**Details**:
- All genres start at `discovering` level by default during onboarding
- Experience levels automatically update via the `update_user_genre_stats()` trigger created in Step 1
- Trigger calculates experience based on `total_drops` per genre using `calculate_activity_level()` function
- Benefits:
  - Faster onboarding (fewer steps, less friction)
  - More accurate (based on real behavior, not self-perception)
  - No cold start problem with new users
  - Consistent with platform philosophy of action over claims

**Implementation**:
```typescript
// During onboarding, insert taste profile with default level
const tasteProfileEntries = data.selectedGenres.map(genre => ({
  user_id: userId,
  genre: genre,
  experience_level: 'discovering' // Default, auto-updates on drop creation
}))
```

**Gotcha**: New users won't have differentiated experience levels until they start creating drops. Recommendation algorithm handles this gracefully by weighting genre overlap more heavily (50%) than activity level.

---

## 2025-11-04 - Curator Recommendation Algorithm Design

**Context**: Need to recommend relevant curators to new users during onboarding Step 5.

**Decision**: Implemented weighted scoring algorithm with three factors.

**Algorithm Details**:
```sql
-- Match score calculation:
-- 1. Genre overlap (50% weight) - primary matching factor
-- 2. Curator activity level (30% weight) - prefer active curators
-- 3. Follower count trust signal (20% weight) - social proof

match_score = (genre_overlap_count * 0.5) +
              (min(total_drops/50, 1.0) * 0.3) +
              (min(follower_count/100, 1.0) * 0.2)
```

**Rationale**:
- Genre overlap is primary factor (50%) because taste match is most important
- Activity ensures recommendations are for engaged curators (30%)
- Follower count provides social proof without over-indexing on popularity (20%)
- Normalization prevents any single factor from dominating

**Filters Applied**:
- Only curators with `is_curator = TRUE`
- Minimum 5 drops (meaningful activity threshold)
- Exclude already-followed curators
- Exclude the current user

**Future Improvements**:
- A/B test different weight ratios
- Consider recency factor (last_drop_at)
- Add diversity factor to avoid echo chambers
- Consider user's discovery_preferences alignment

---

## 2025-11-04 - Conditional Onboarding Flow Implementation

**Context**: Need different onboarding paths for curators vs listeners.

**Decision**: Implemented smart step navigation with conditional rendering.

**Details**:
```typescript
// Flow logic:
// Step 1 → Step 2 → Step 3 (choice) →
//   If curator: Step 4 (statement) → Step 5 (recommendations)
//   If listener: Skip Step 4 → Step 5 (recommendations)

const handleStepTransition = async (fromStep: number) => {
  if (fromStep === 3) {
    if (data.isCurator) {
      setStep(4) // Go to curation statement
    } else {
      await saveProfile() // Skip to save, then recommendations
    }
  }
  else if (fromStep === 4) {
    await saveProfile() // Save then go to recommendations
  }
}
```

**Progress Indicator**: Dynamically shows 4 steps for listeners, 5 for curators
```typescript
const getTotalSteps = () => data.isCurator ? 5 : 4
```

**Gotcha**: Listeners see "Step 4 of 4" when they reach recommendations (actually internal step 5), curators see "Step 5 of 5". This maintains consistent UX despite conditional flow.

---

## 2025-11-03 - Cursor-Based Pagination vs Offset-Based

**Context**: Feed needs pagination for performance at scale.

**Decision**: Implemented cursor-based pagination instead of offset-based.

**Comparison**:
| Offset-Based | Cursor-Based |
|--------------|--------------|
| `LIMIT 20 OFFSET 40` | `WHERE created_at < X LIMIT 20` |
| Slow with large offsets | Fast regardless of position |
| Inconsistent with new data | Consistent results |
| Skips/duplicates possible | No skips or duplicates |

**Implementation**:
```typescript
// API returns: { drops, nextCursor, hasMore }
// Client uses nextCursor for next page request
const nextCursor = drops[drops.length - 1].created_at
```

**Benefits**:
- O(1) query time regardless of page depth
- No duplicate items when new content is added
- No missing items between pages
- Better for infinite scroll UX

---

## Common Issues & Solutions

### Issue: Supabase not found
**Error**: `supabase: command not found`
**Solution**: Use `npx supabase` instead of global `supabase` command

### Issue: Migration not applied
**Error**: `Cannot find project ref. Have you run supabase link?`
**Solution**:
1. Ensure Docker Desktop is running
2. Run `npx supabase start` to start local instance
3. Then run `npx supabase db push`

### Issue: RLS policies blocking data
**Symptom**: Empty results despite data existing in table
**Solution**: Check Row Level Security policies in Supabase dashboard, ensure `auth.uid()` matches user_id

---

## Architecture Decisions

### Why Supabase Over Custom Backend?
- Built-in auth with JWT
- Real-time subscriptions ready
- Automatic REST API
- Row Level Security
- ~$50/month at 10K users vs $200+ for custom

### Why Next.js App Router?
- Server components reduce JS bundle
- Streaming SSR for better UX
- Built-in API routes
- Edge runtime support for global deployment

### Why Platform-Agnostic Design?
- Users shouldn't need Spotify account
- Supports Apple Music, YouTube, SoundCloud
- Future-proof for new platforms
- Better for international users

---

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Discover page load | < 1s | ✅ Achieved |
| Feed pagination | < 200ms | ✅ Achieved |
| Genre filter query | < 100ms | ⏳ Pending verification |
| Onboarding completion | < 5 min | ⏳ Testing needed |
| Scale to curators | 1000+ | ✅ Architecture supports |

---

## TODO: Verify These Assumptions
- [ ] Recommendation algorithm weights (50/30/20) produce good results
- [ ] 3-10 genre selection is optimal range (not too narrow, not overwhelming)
- [ ] Default 'discovering' level doesn't hurt recommendations for power users
- [ ] 12 curator recommendations in Step 5 is enough (not too few, not overwhelming)
- [ ] Followers should see drops immediately after following in Step 5
