# Development Notes

Technical decisions, gotchas, and lessons learned during development.

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
