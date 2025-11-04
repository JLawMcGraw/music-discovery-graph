# DeepCuts - Architecture Documentation

## Executive Summary

DeepCuts is a music discovery platform focused on **finding trusted tastemakers**, not gamifying taste or creating competitive metrics. This document outlines the architecture decisions made for the MVP (v1.0 - Pure Curation Model) and future scaling considerations.

**Core Philosophy**: Help users find curators whose taste aligns with their own through organic curation, following, and discovery - not through validation, ratings, or competition.

---

## System Overview

### What DeepCuts Does

1. **Curators share music**: Up to 10 drops per week with context explaining why each track matters
2. **Users follow tastemakers**: Asymmetric following system (Twitter-style)
3. **Private saves**: Users save drops they love (no public metrics)
4. **Genre-based discovery**: Find curators by genre activity and curation statements
5. **Platform-agnostic**: Works with any streaming service (Spotify, Apple Music, YouTube, SoundCloud)

### What DeepCuts Does NOT Do

- ❌ Validation/rating system (no 1-5 star votes)
- ❌ Reputation stakes (no points at risk)
- ❌ Trust scores or competitive metrics
- ❌ Drop expiration (drops live forever)
- ❌ Listening history sync (no OAuth required)
- ❌ Leaderboards or rankings
- ❌ Gamification elements

---

## MVP Architecture (Current Implementation)

### Tech Stack

**Frontend:**
- Next.js 14 (App Router) with TypeScript
- Tailwind CSS for styling
- React Server Components for performance

**Backend:**
- Supabase (PostgreSQL + Auth + Storage)
- Row-Level Security (RLS) for multi-tenant data
- PostgreSQL functions for business logic

**Music Integration:**
- Spotify Web API (Client Credentials flow - public search only)
- No user OAuth required
- Platform-agnostic metadata storage

**Hosting:**
- Vercel (frontend + serverless API routes)
- Supabase (managed PostgreSQL)

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│         Next.js 14 Frontend (Vercel)                │
│  ├─ Server Components (feed, profiles, discover)   │
│  ├─ Client Components (drop creation, interactions)│
│  └─ API Routes (drop creation, save, follow)       │
└──────────────────┬──────────────────────────────────┘
                   │ Supabase Client SDK
┌──────────────────▼──────────────────────────────────┐
│              Supabase Platform                      │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │  PostgreSQL 15+ with Extensions               │ │
│  │  ├─ Core tables (profiles, drops, follows)   │ │
│  │  ├─ RLS policies for data security           │ │
│  │  ├─ Functions (weekly limit, stats calc)     │ │
│  │  └─ Indexes for feed/discovery performance   │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────┐  ┌──────────────────────────┐  │
│  │ Supabase Auth │  │  Supabase Storage        │  │
│  │ (email/pw)    │  │  (future: user avatars)  │  │
│  └───────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│         Spotify Web API (Read-only)                 │
│  - Client Credentials flow (no user OAuth)          │
│  - Track search for drop creation                   │
│  - Metadata enrichment                              │
└─────────────────────────────────────────────────────┘
```

---

## Database Schema Design

### Core Tables

#### `profiles`
User identity and curation approach.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  curation_statement TEXT,  -- How they curate (500 chars)
  genre_preferences TEXT[],  -- Up to 5 genres
  avatar_url TEXT,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  total_drops INTEGER DEFAULT 0,
  onboarded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_genre_prefs ON profiles USING GIN(genre_preferences);
```

**Design Decisions:**
- `curation_statement`: Core differentiator - explains how user curates
- `genre_preferences`: For discovery filtering
- `follower_count`/`following_count`: Cached for performance (updated via triggers)
- No `trust_score` or `reputation` fields

#### `drops`
Music recommendations with context.

```sql
CREATE TABLE drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Track metadata (platform-agnostic)
  track_id TEXT NOT NULL,           -- e.g., spotify:track:xyz
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_name TEXT,
  album_art_url TEXT,
  platform TEXT DEFAULT 'spotify',  -- spotify, apple_music, youtube, soundcloud

  -- Curation content
  context TEXT NOT NULL,            -- Required: 50-2000 chars
  listening_notes TEXT,             -- Optional: what to pay attention to
  genres TEXT[],
  moods TEXT[],

  -- Engagement (private)
  save_count INTEGER DEFAULT 0,     -- Internal only (not shown publicly)

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT context_length CHECK (char_length(context) BETWEEN 50 AND 2000),
  CONSTRAINT listening_notes_length CHECK (
    listening_notes IS NULL OR char_length(listening_notes) <= 1000
  )
);

CREATE INDEX idx_drops_user_id ON drops(user_id);
CREATE INDEX idx_drops_created_at ON drops(created_at DESC);
CREATE INDEX idx_drops_genres ON drops USING GIN(genres);
```

**Design Decisions:**
- Platform-agnostic `track_id` field (not just Spotify)
- `context` is required (enforced at DB level)
- `save_count` exists but not displayed publicly
- No `validation_score`, `status`, `reputation_stake`, or `expires_at` fields
- Drops never expire

#### `follows`
Asymmetric following relationships.

```sql
CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),

  PRIMARY KEY (follower_id, following_id),

  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- Update follower counts via trigger
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET follower_count = follower_count + 1
    WHERE id = NEW.following_id;

    UPDATE profiles SET following_count = following_count + 1
    WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET follower_count = follower_count - 1
    WHERE id = OLD.following_id;

    UPDATE profiles SET following_count = following_count - 1
    WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER follow_count_trigger
AFTER INSERT OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION update_follow_counts();
```

**Design Decisions:**
- Asymmetric (Twitter-style, not Facebook-style mutual)
- Cached counts for performance (avoid COUNT queries)
- Self-follow prevented at DB level

#### `drop_saves`
Private saved drops (user's personal collection).

```sql
CREATE TABLE drop_saves (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  drop_id UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),

  PRIMARY KEY (user_id, drop_id)
);

CREATE INDEX idx_drop_saves_user ON drop_saves(user_id);
CREATE INDEX idx_drop_saves_drop ON drop_saves(drop_id);

-- Update save count on drops
CREATE OR REPLACE FUNCTION update_save_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE drops SET save_count = save_count + 1
    WHERE id = NEW.drop_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE drops SET save_count = save_count - 1
    WHERE id = OLD.drop_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER save_count_trigger
AFTER INSERT OR DELETE ON drop_saves
FOR EACH ROW EXECUTE FUNCTION update_save_count();
```

**Design Decisions:**
- Saves are private (only user sees their own saves)
- No public display of save counts on drops
- Used internally for future taste matching

#### `user_genre_stats`
Activity breakdown per genre per user.

```sql
CREATE TABLE user_genre_stats (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  genre TEXT NOT NULL,
  total_drops INTEGER DEFAULT 0,
  total_saves_received INTEGER DEFAULT 0,
  activity_level TEXT,  -- exploring, occasional, active, prolific
  last_drop_at TIMESTAMP,

  PRIMARY KEY (user_id, genre)
);

CREATE INDEX idx_genre_stats_user ON user_genre_stats(user_id);
CREATE INDEX idx_genre_stats_genre ON user_genre_stats(genre);

-- Calculate activity level
CREATE OR REPLACE FUNCTION calculate_activity_level(drop_count INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN drop_count < 5 THEN 'exploring'
    WHEN drop_count < 20 THEN 'occasional'
    WHEN drop_count < 50 THEN 'active'
    ELSE 'prolific'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Design Decisions:**
- Shows "taste areas" on profiles (what genres user curates)
- Activity levels are qualitative, not rankings
- No competitive metrics or "expert" labels

#### `platform_clicks`
Track clicks to streaming platforms (for future attribution).

```sql
CREATE TABLE platform_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  clicked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_platform_clicks_drop ON platform_clicks(drop_id);
CREATE INDEX idx_platform_clicks_date ON platform_clicks(clicked_at);
```

**Design Decisions:**
- Tracks "Listen on Spotify" clicks for attribution
- Future: revenue share with streaming platforms
- User can be NULL (anonymous clicks)

---

## Core Business Logic

### Weekly Drop Limit (10 per week)

The core constraint that encourages quality curation.

```sql
-- Calculate drops posted this week (Monday 00:00 UTC = week start)
CREATE OR REPLACE FUNCTION get_weekly_drop_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  drop_count INTEGER;
  week_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate start of current week (Monday 00:00 UTC)
  week_start := date_trunc('week', NOW());

  SELECT COUNT(*) INTO drop_count
  FROM drops
  WHERE user_id = user_uuid
    AND created_at >= week_start;

  RETURN drop_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get next reset time (next Monday 00:00 UTC)
CREATE OR REPLACE FUNCTION get_next_week_reset()
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  RETURN date_trunc('week', NOW()) + INTERVAL '1 week';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Enforcement in API:**
```typescript
// app/api/drops/create/route.ts
const { data: weeklyCount } = await supabase
  .rpc('get_weekly_drop_count', { user_uuid: user.id })

if (weeklyCount >= 10) {
  return NextResponse.json({
    error: 'Weekly limit reached',
    message: 'You can post 10 drops per week.',
    drops_this_week: weeklyCount,
    limit: 10,
    resets_at: nextReset,
  }, { status: 429 })
}
```

**Design Decisions:**
- Same limit for all users (no premium tier yet)
- Resets Monday 00:00 UTC (consistent globally)
- No rollover or banking of unused drops
- Forces curation quality over quantity

---

## Row-Level Security (RLS)

Supabase RLS policies enforce data access rules at the database level.

### Example: `drops` Table

```sql
-- Anyone can read drops
CREATE POLICY "Drops are viewable by everyone"
ON drops FOR SELECT
USING (true);

-- Users can only insert their own drops
CREATE POLICY "Users can create their own drops"
ON drops FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own drops
CREATE POLICY "Users can update their own drops"
ON drops FOR UPDATE
USING (auth.uid() = user_id);

-- Users can only delete their own drops
CREATE POLICY "Users can delete their own drops"
ON drops FOR DELETE
USING (auth.uid() = user_id);
```

### Example: `drop_saves` Table

```sql
-- Users can only see their own saves
CREATE POLICY "Users can view their own saves"
ON drop_saves FOR SELECT
USING (auth.uid() = user_id);

-- Users can only create their own saves
CREATE POLICY "Users can save drops"
ON drop_saves FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own saves
CREATE POLICY "Users can unsave drops"
ON drop_saves FOR DELETE
USING (auth.uid() = user_id);
```

**Design Decisions:**
- Security enforced at database level (can't bypass in client)
- Saves are private by design (enforced via RLS)
- Public read access for discovery (drops, profiles)

---

## API Architecture

### API Routes

All API routes are Next.js API Route Handlers under `app/api/`.

#### `POST /api/drops/create`
Create a new drop with weekly limit enforcement.

**Request:**
```typescript
{
  track_id: string,
  track_name: string,
  artist_name: string,
  album_name?: string,
  album_art_url?: string,
  platform: 'spotify' | 'apple_music' | 'youtube' | 'soundcloud',
  context: string,  // 50-2000 chars
  listening_notes?: string,
  genres?: string[],
  moods?: string[]
}
```

**Response (Success):**
```typescript
{
  id: string,
  created_at: string
}
```

**Response (Weekly Limit Reached):**
```typescript
{
  error: 'Weekly limit reached',
  message: 'You can post 10 drops per week.',
  drops_this_week: 10,
  limit: 10,
  resets_at: '2024-10-28T00:00:00Z'
}
```

#### `POST /api/drops/[id]/save`
Save a drop to private collection.

**Response:**
```typescript
{ success: true }
```

#### `DELETE /api/drops/[id]/save`
Unsave a drop.

**Response:**
```typescript
{ success: true }
```

#### `POST /api/users/[username]/follow`
Follow a curator.

**Response:**
```typescript
{ success: true }
```

**Error (Self-follow):**
```typescript
{ error: 'Cannot follow yourself' }
```

#### `DELETE /api/users/[username]/follow`
Unfollow a curator.

**Response:**
```typescript
{ success: true }
```

---

## Performance Optimizations

### Database Indexes

```sql
-- Feed queries (most common operation)
CREATE INDEX idx_drops_created_at ON drops(created_at DESC);
CREATE INDEX idx_drops_user_id ON drops(user_id);

-- Discovery page
CREATE INDEX idx_profiles_genre_prefs ON profiles USING GIN(genre_preferences);

-- Following feed
CREATE INDEX idx_follows_follower ON follows(follower_id);

-- Saved drops page
CREATE INDEX idx_drop_saves_user ON drop_saves(user_id);
CREATE INDEX idx_drop_saves_created ON drop_saves(created_at DESC);

-- Genre filtering
CREATE INDEX idx_drops_genres ON drops USING GIN(genres);
```

### Caching Strategy

**Current (MVP):**
- No caching layer (Supabase handles connection pooling)
- Rely on Vercel Edge caching for static pages

**Future (Phase 2):**
- Redis for feed caching (especially "Discover" tab)
- Cache user profiles for 5 minutes
- Cache genre stats for 1 hour
- Invalidate on new drop/follow/save

### Query Optimization

**Feed Query (Following Tab):**
```typescript
// Get drops from users I follow
const { data: following } = await supabase
  .from('follows')
  .select('following_id')
  .eq('follower_id', user.id)

const followingIds = following?.map(f => f.following_id) || []

const { data: drops } = await supabase
  .from('drops')
  .select(`
    *,
    profiles:user_id (username, avatar_url, follower_count)
  `)
  .in('user_id', followingIds)
  .order('created_at', { ascending: false })
  .limit(20)
```

**Design Decision:** Two queries instead of JOIN for flexibility (can cache following list separately).

---

## Spotify Integration

### Public API (No OAuth)

DeepCuts uses Spotify's **Client Credentials flow** for track search only.

**Why not OAuth?**
- ❌ No need for user's listening history
- ✅ Simpler auth flow
- ✅ No privacy concerns
- ✅ Platform-agnostic by design
- ✅ Lower costs (~$50/mo vs ~$160/mo)

### Track Search Implementation

```typescript
// lib/spotify/client.ts
async function getAccessToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')
    },
    body: 'grant_type=client_credentials'
  })

  const data = await response.json()
  return data.access_token
}

async function searchTracks(query: string) {
  const token = await getAccessToken()

  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  )

  const data = await response.json()
  return data.tracks.items
}
```

**Design Decisions:**
- Token cached for 1 hour (Spotify's expiration)
- Search limited to 10 results (reduce API calls)
- Track metadata stored in DeepCuts DB (not re-fetched)

---

## Future Architecture Considerations

### Phase 2 Features & Scaling

#### 1. Taste Matching Algorithm

**Goal:** Recommend curators based on save overlap.

**Approach:**
```sql
-- Find users who saved similar drops
WITH my_saves AS (
  SELECT drop_id FROM drop_saves WHERE user_id = $1
),
similar_users AS (
  SELECT ds.user_id, COUNT(*) as overlap
  FROM drop_saves ds
  WHERE ds.drop_id IN (SELECT drop_id FROM my_saves)
    AND ds.user_id != $1
  GROUP BY ds.user_id
  HAVING COUNT(*) >= 3  -- At least 3 shared saves
)
SELECT
  p.username,
  p.curation_statement,
  su.overlap as shared_taste_count
FROM similar_users su
JOIN profiles p ON p.id = su.user_id
ORDER BY su.overlap DESC
LIMIT 10;
```

**Alternative:** Use `pgvector` for embedding-based similarity.

```sql
CREATE EXTENSION vector;

ALTER TABLE profiles ADD COLUMN taste_embedding vector(384);

-- Find similar taste profiles
SELECT username,
       1 - (taste_embedding <=> $1) as similarity
FROM profiles
WHERE id != $2
ORDER BY taste_embedding <=> $1
LIMIT 20;
```

#### 2. Discovery Circles (Phase 2)

**Status:** Database schema exists but no UI yet.

**Schema:**
```sql
CREATE TABLE circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  focus_genres TEXT[],
  member_count INTEGER DEFAULT 0 CHECK (member_count <= 150),
  created_by UUID REFERENCES profiles(id),
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE circle_memberships (
  circle_id UUID REFERENCES circles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  role TEXT DEFAULT 'member',  -- member, moderator, creator
  PRIMARY KEY (circle_id, user_id)
);
```

**Design Decision:** Defer to Phase 2 - MVP focuses on individual following.

#### 3. Analytics Dashboard

**For Curators:**
- Which drops get most saves
- Follower growth over time
- Genre breakdown of followers
- Click-through rates to platforms

**Implementation:**
```sql
-- Materialized view for curator stats (refreshed nightly)
CREATE MATERIALIZED VIEW curator_analytics AS
SELECT
  d.user_id,
  COUNT(DISTINCT ds.user_id) as total_saves_received,
  COUNT(DISTINCT pc.id) as total_clicks,
  AVG(ds.created_at - d.created_at) as avg_time_to_save,
  json_agg(DISTINCT jsonb_build_object(
    'drop_id', d.id,
    'saves', (SELECT COUNT(*) FROM drop_saves WHERE drop_id = d.id),
    'clicks', (SELECT COUNT(*) FROM platform_clicks WHERE drop_id = d.id)
  )) as drop_performance
FROM drops d
LEFT JOIN drop_saves ds ON ds.drop_id = d.id
LEFT JOIN platform_clicks pc ON pc.drop_id = d.id
GROUP BY d.user_id;

CREATE UNIQUE INDEX ON curator_analytics(user_id);
```

#### 4. Notification System

**Triggers:**
- New follower
- Someone saved your drop
- Curator you follow posted a drop
- Weekly recap (email digest)

**Implementation Options:**
- Supabase Realtime for in-app notifications
- SendGrid/Resend for email notifications
- Database triggers + queue (Inngest/QStash)

---

## Deployment Architecture

### Current Setup (MVP)

```
┌─────────────────────────────────────────┐
│   Vercel (Global Edge Network)          │
│   ├─ Next.js frontend (SSR + RSC)      │
│   ├─ API routes (serverless functions) │
│   └─ Static assets (CDN)               │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Supabase (us-east-1)                  │
│   ├─ PostgreSQL 15                      │
│   ├─ Auth service                       │
│   ├─ Storage (future)                   │
│   └─ Realtime (future)                  │
└─────────────────────────────────────────┘
```

**Estimated Costs (10K users):**
- Vercel Pro: $20/month
- Supabase Pro: $25/month (includes 8GB DB, 100GB bandwidth)
- **Total: ~$50/month**

### Scaling Plan (100K+ users)

**Bottlenecks to Watch:**
1. Feed generation (N+1 queries)
2. Discover page (full table scans)
3. Genre stats calculation (nightly job)

**Solutions:**
1. **Redis caching layer**: Cache feeds for 5 minutes
2. **Read replicas**: Offload feed/discover queries to read-only replica
3. **Denormalization**: Pre-compute "trending curators" table
4. **CDN**: Cloudflare in front of Vercel for DDoS protection

**Estimated Costs (100K users):**
- Vercel Pro: $20/month
- Supabase Pro: $100/month (50GB DB)
- Redis (Upstash): $30/month
- CDN: $20/month
- **Total: ~$170/month**

---

## Security Considerations

### Authentication
- Supabase Auth with email/password
- Future: Social auth (Google, Apple)
- Rate limiting on signup (prevent spam accounts)

### Authorization
- Row-Level Security (RLS) enforces access control
- API routes verify `auth.uid()` before mutations
- No public write access to any table

### Input Validation
- Zod schemas on API routes
- Database constraints (e.g., context length 50-2000 chars)
- SQL injection prevention (parameterized queries via Supabase SDK)

### Rate Limiting
- Weekly drop limit (10 per week)
- Future: API rate limiting via Vercel middleware
- Future: CAPTCHA on signup

### Privacy
- Saves are private (enforced via RLS)
- No listening history collection
- No tracking pixels or analytics (yet)
- Future: GDPR compliance (data export, deletion)

---

## Testing Strategy

### Unit Tests
- Database functions (weekly limit calculation)
- Utility functions (Spotify API client)
- Validation schemas (Zod)

### Integration Tests
- API routes (drop creation, save, follow)
- Database triggers (follower count updates)
- Authentication flows

### E2E Tests
- Onboarding flow
- Drop creation flow
- Following/unfollowing
- Save/unsave

**Testing Stack:**
- Vitest (unit tests)
- Playwright (E2E tests)
- Supabase local environment for integration tests

---

## Monitoring & Observability

### Metrics to Track (Phase 2)

**User Engagement:**
- Daily/weekly active users
- Average drops per active user per week
- % of users who follow at least 1 curator within 7 days
- Retention rate (D1, D7, D30)

**Content Quality:**
- Average context length per drop
- % of drops with listening notes
- Distribution of drops across genres

**Technical Performance:**
- API response times (p50, p95, p99)
- Database query times
- Error rates by endpoint
- Vercel function invocations

**Tools:**
- Vercel Analytics (built-in)
- Supabase Dashboard (query performance)
- Future: Sentry (error tracking)
- Future: PostHog (product analytics)

---

## Key Architectural Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Database** | PostgreSQL (Supabase) | Familiar, mature, good for relational data. No need for graph DB at MVP scale. |
| **Authentication** | Supabase Auth | Built-in, handles email/password, future social auth. |
| **Music API** | Spotify public API (no OAuth) | Platform-agnostic, simpler, cheaper, no privacy concerns. |
| **Hosting** | Vercel + Supabase | Serverless, auto-scaling, low ops burden, fast deployment. |
| **Caching** | None (MVP), Redis (Phase 2) | Keep it simple initially, add caching when needed. |
| **Validation System** | Removed entirely | Anti-gamification philosophy - no ratings, no stakes. |
| **Drop Limit** | 10 per week (PostgreSQL function) | Forces quality over quantity, prevents spam. |
| **Saves** | Private (RLS enforced) | No public metrics, no pressure to perform. |
| **Following** | Asymmetric (Twitter-style) | Organic discovery, no mutual approval needed. |
| **Circles** | Deferred to Phase 2 | MVP focuses on individual tastemaker discovery. |

---

## Migration Path from Original Design

### What Changed from "Signal" (Validation Model)

**Removed:**
- ❌ Validation/rating system (`drop_validations` table)
- ❌ Reputation stakes and point system (`reputation_events` table)
- ❌ Trust scores and competitive metrics
- ❌ Drop expiration and resolution
- ❌ Listening history sync
- ❌ Spotify OAuth
- ❌ Neo4j graph database
- ❌ Complex taste compatibility algorithm

**Added:**
- ✅ Weekly drop limit (10 per week)
- ✅ Following system (`follows` table)
- ✅ Private save functionality (`drop_saves` table)
- ✅ Curation statements on profiles
- ✅ Genre-based discovery
- ✅ Taste areas (activity per genre)
- ✅ Platform-agnostic track storage

**Database Migration:**
See `supabase/migrations/20241027000000_remove_validation_add_curation.sql` for complete schema transformation.

---

## Next Steps

### Immediate (MVP Testing)
1. ✅ Deploy to production (Vercel + Supabase)
2. ✅ Test onboarding flow with real users
3. ✅ Verify weekly limit enforcement
4. ✅ Collect feedback on curation statements

### Phase 2 (Months 1-3)
1. Implement taste matching algorithm (recommend curators)
2. Add search functionality (drops, curators)
3. Build analytics dashboard for curators
4. Email notifications (new follower, weekly recap)

### Phase 3 (Months 3-6)
1. Discovery Circles UI
2. Mobile app (React Native)
3. Platform partnerships (revenue share)
4. Premium tier (advanced analytics, unlimited drops)

---

## Questions & Contact

For architecture questions or suggestions, please open an issue on GitHub.

**Built with care for music discovery.**
