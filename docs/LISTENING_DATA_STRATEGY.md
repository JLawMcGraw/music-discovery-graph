# Listening Data Strategy - Cost & Scale Analysis

## The Core Question

**Do we need real-time access to every user's listening history?**

Short answer: **No, not for MVP**. We need enough data to build trust, but there are smarter approaches than direct Spotify OAuth for every user.

---

## Option 1: Direct Spotify OAuth (Current Plan)

### How It Works
- Each user connects their Spotify account
- We sync their listening history hourly
- Store in our database for taste matching

### Pros
- ✅ Most accurate data
- ✅ Real-time updates
- ✅ No user input required

### Cons
- ❌ Rate limits: ~180 req/30sec (10K+ users = bottleneck)
- ❌ Only Spotify users (excludes Apple Music, Tidal, etc.)
- ❌ OAuth friction in onboarding
- ❌ Privacy concerns (accessing full history)
- ❌ Server costs for hourly sync jobs

### Cost at Scale
- **API calls**: FREE
- **Server costs**: $50-200/month for background jobs (Inngest/Railway)
- **Database storage**: ~$0.10/GB/month (listening history grows ~1GB per 10K users)

**Total at 10K users**: ~$150-250/month

---

## Option 2: Last.fm Scrobbling (RECOMMENDED for MVP)

### How It Works
- Users connect their Last.fm account (or create one)
- Last.fm automatically tracks plays from Spotify, Apple Music, YouTube Music, Tidal
- We pull from Last.fm API (much higher rate limits)

### Why Last.fm is Better
- ✅ **Platform agnostic**: Works with ALL streaming services
- ✅ **Higher rate limits**: 5M calls/day vs Spotify's ~500K
- ✅ **Better user base**: Music enthusiasts already use Last.fm
- ✅ **Established credibility**: 20+ years of scrobbling data
- ✅ **Less privacy invasive**: Users choose what to scrobble

### Implementation
```typescript
// lib/lastfm/client.ts
export async function getRecentTracks(username: string, limit = 50) {
  const response = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=${limit}`
  )
  return response.json()
}

export async function getTopArtists(username: string, period = '3month') {
  const response = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${username}&api_key=${process.env.LASTFM_API_KEY}&period=${period}&format=json`
  )
  return response.json()
}
```

### Pros Over Spotify
- Works for 80M+ Last.fm users
- Users don't need to install anything (already scrobbling)
- Multi-platform by default
- Free tier: 5M calls/day

### Cons
- Users without Last.fm need to set it up (one-time, takes 2 mins)
- Slight delay in scrobbling (30 seconds to 5 minutes)

### Cost at Scale
- **API calls**: FREE (up to 5M/day)
- **Server costs**: $30-50/month (much lighter sync load)
- **Database storage**: Same as Spotify option

**Total at 10K users**: ~$50-100/month

---

## Option 3: Hybrid Approach (BEST for Long-term)

### Strategy
Allow multiple connection methods:

1. **Last.fm** (primary, recommended)
2. **Spotify OAuth** (fallback for non-Last.fm users)
3. **Apple Music** (future: requires Apple Music API)
4. **Manual curation** (for privacy-conscious users)

### Implementation Priority
```
MVP (Week 1-4):
  ✅ Last.fm only (prove concept fast)

Post-MVP (Month 2-3):
  ✅ Add Spotify OAuth for non-Last.fm users
  ✅ Add manual taste profile (genre tags, favorite artists)

Scale (Month 6+):
  ✅ Apple Music API
  ✅ Direct integrations with other platforms
```

### User Flow
```
Onboarding:
  "Connect your music history"
    → Option 1: Last.fm username (instant)
    → Option 2: Connect Spotify (OAuth)
    → Option 3: Build profile manually (genres + artists)
```

---

## Option 4: Inverted Model - No Listening History Required

### Radical Alternative
**What if we don't need listening history at all?**

Instead, trust is built entirely through:
- Quality of drops (context, validation scores)
- Consistency over time
- Genre expertise demonstrated through successful drops

### How It Works
1. Users create drops without proving listening history
2. Community validation determines trust
3. "Listening history" is actually "drop history"

### Pros
- ✅ Zero API dependencies
- ✅ No privacy concerns
- ✅ Platform agnostic by default
- ✅ Simplest implementation

### Cons
- ❌ Easier to game initially (Sybil attacks)
- ❌ Takes longer to build trust graph
- ❌ Less "authentic" feeling

### Mitigation for Gaming
- Phone verification (costs $0.01/verification via Twilio)
- Initial reputation starts at 50 (not 100)
- Paid tier ($5/month) starts at 100 reputation
- Rate limit drops for new users (2/day for first week)

---

## Recommendation: Start with Last.fm

### Why?
1. **Fastest to implement**: Public API, no OAuth complexity
2. **Platform agnostic**: Works for 80% of music streaming services
3. **Better user base**: Last.fm users are music enthusiasts (our target)
4. **Scalable**: 5M API calls/day vs Spotify's ~500K
5. **Cheaper**: Lower server costs for sync jobs

### MVP Implementation (Week 1-2)

**Day 1-2: Last.fm Integration**
```typescript
// app/onboarding/page.tsx
<form>
  <input
    placeholder="Your Last.fm username"
    name="lastfm_username"
  />
  <button>Connect</button>
</form>

// On submit:
// 1. Verify username exists (Last.fm API call)
// 2. Fetch recent tracks (last 50 plays)
// 3. Store in listening_history table
// 4. Calculate top genres/artists
// 5. Mark profile as verified
```

**Day 3-4: Listening History Sync**
```typescript
// app/api/cron/sync-lastfm/route.ts
// Runs every hour via Vercel Cron or Inngest

export async function GET(request: Request) {
  const supabase = createClient()

  // Get all users with Last.fm connected
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, lastfm_username')
    .not('lastfm_username', 'is', null)
    .eq('sync_enabled', true)

  for (const profile of profiles) {
    const tracks = await getRecentTracks(profile.lastfm_username)
    await storeListeningHistory(profile.id, tracks)
  }

  return Response.json({ synced: profiles.length })
}
```

**Day 5: Fallback for Non-Last.fm Users**
```typescript
// For users without Last.fm, show:
"Don't have Last.fm? No problem!"
  → Option 1: Create free account (2 mins, links to guide)
  → Option 2: Build taste profile manually (select 5 artists/genres)
```

---

## Database Schema Changes

Add Last.fm support to existing schema:

```sql
-- Add to profiles table
ALTER TABLE profiles ADD COLUMN lastfm_username VARCHAR(50) UNIQUE;
ALTER TABLE profiles ADD COLUMN lastfm_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN sync_enabled BOOLEAN DEFAULT true;

-- Optional: Track which source listening history came from
ALTER TABLE listening_history ADD COLUMN source VARCHAR(20) DEFAULT 'lastfm';
-- Possible values: 'lastfm', 'spotify', 'apple_music', 'manual'
```

---

## Cost Comparison Summary

| Approach | API Cost | Server Cost | Storage Cost | Total (10K users) |
|----------|----------|-------------|--------------|-------------------|
| Spotify OAuth | $0 | $150-200 | $10 | ~$160-210/mo |
| Last.fm | $0 | $30-50 | $10 | ~$40-60/mo |
| Hybrid | $0 | $80-120 | $10 | ~$90-130/mo |
| No History | $0 | $20-30 | $5 | ~$25-35/mo |

**Winner**: Last.fm for MVP (3x cheaper, easier to implement)

---

## Rate Limit Comparison

| Service | Requests/Day | Requests/Second | Good For |
|---------|--------------|-----------------|----------|
| Spotify | ~500,000 | ~180/30sec | < 5K users |
| Last.fm | 5,000,000 | ~57/sec | < 50K users |
| Apple Music | Unknown | Rate limited | TBD |

---

## Migration Path

### Phase 1: MVP (Month 1)
- Last.fm only
- Manual taste profile as fallback

### Phase 2: Growth (Month 2-3)
- Add Spotify OAuth for non-Last.fm users
- Implement request queue for rate limiting

### Phase 3: Scale (Month 6+)
- Apple Music API
- Build our own scrobbling SDK (users install plugin)
- Partner with streaming platforms for official access

---

## Recommendation for Next 2 Hours

**Skip direct Spotify OAuth. Build Last.fm integration instead.**

Benefits:
- ✅ Implement in 2-3 hours vs 1-2 days
- ✅ No OAuth complexity
- ✅ Works for more users
- ✅ 3x cheaper at scale
- ✅ Proves the concept faster

Shall I implement the Last.fm integration now?
