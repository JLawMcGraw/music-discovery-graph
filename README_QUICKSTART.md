# Signal MVP - Quick Start Guide

## What You Just Built

A working music discovery platform where:
- Users stake reputation on track recommendations
- Community validates drops with ratings
- Trust scores update based on validation outcomes
- Platform tracks clicks for future revenue attribution

**No listening history needed** - trust is built through behavior, not data access.

---

## Getting Started

### Prerequisites

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **Supabase CLI** - `npm install -g supabase`
3. **Spotify Developer Account** - [Sign up](https://developer.spotify.com/dashboard)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. No redirect URI needed (we're only using public search API)
4. Copy your **Client ID** and **Client Secret**

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Spotify credentials:

```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

### 4. Start Supabase

```bash
supabase start
```

This will:
- Start local Postgres database on port 54322
- Start Supabase Studio on http://localhost:54323
- Apply database migrations automatically
- Show you the `anon key` and `service_role key`

Copy the `anon key` from the output and add it to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Testing the MVP

### Create a Test User

1. Go to Supabase Studio: http://localhost:54323
2. Navigate to **Authentication** > **Users**
3. Click **Add user** > Create manually
4. Enter email and password
5. Confirm user immediately

### Create a Profile

In Supabase Studio SQL Editor, run:

```sql
INSERT INTO profiles (id, username, display_name)
VALUES (
  'your-user-id-from-auth-users',
  'testuser',
  'Test User'
);
```

### Sign In

Currently there's no auth UI built, so you'll need to authenticate via Supabase:

```javascript
// In browser console on http://localhost:3000
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'your-password'
})
```

### Create Your First Drop

1. Navigate to http://localhost:3000/drop/create
2. Search for a track (e.g., "Bohemian Rhapsody")
3. Select a track
4. Write context (min 50 chars)
5. Stake reputation (10-100 points)
6. Submit

### Validate a Drop

1. Navigate to http://localhost:3000/feed
2. Find a drop (not your own)
3. Click **Validate**
4. Rate 1-5 stars
5. Submit

---

## Database Structure

### Key Tables

**profiles**
- User profiles with trust scores
- Reputation available for staking
- Success rate tracking

**drops**
- Music recommendations with context
- Reputation stakes (10-100 points)
- Validation scores (0-1)
- Status: active → validated/failed

**drop_validations**
- Community ratings (1-5 stars)
- One validation per user per drop
- Triggers reputation updates

**reputation_events**
- Immutable ledger of all reputation changes
- Provides auditability
- Auto-updates trust scores via triggers

**platform_clicks**
- Tracks clicks to streaming platforms
- For conversion attribution (future revenue)

### Reputation Mechanics

When a drop is created:
```sql
-- User stakes 50 points
reputation_available: 100 → 50
trust_score: 100 (unchanged, points locked)
```

After 7 days or 3+ validations:
```sql
-- If average rating >= 3.5/5 (70%)
points_returned: stake + 25% bonus
trust_score increases

-- If average rating 2-3.5/5 (40-70%)
points_returned: original stake
trust_score unchanged

-- If average rating < 2/5 (40%)
points_returned: 0
trust_score decreases
```

---

## What's Built

✅ **Database Schema**
- Complete with triggers, RLS policies, and helper functions
- No listening history tables (simplified architecture)

✅ **API Routes**
- `/api/search/tracks` - Spotify track search (no OAuth needed)
- `/api/drops/create` - Create drops with validation
- `/api/drops/[id]/validate` - Submit ratings
- `/api/drops/[id]/click` - Track platform clicks

✅ **UI Components**
- `TrackSearch` - Real-time Spotify search
- `DropCard` - Display drops with validation UI
- Drop creation form with context editor
- Feed page with infinite scroll ready

✅ **Features**
- Reputation staking (10-100 points)
- Context-rich recommendations (50-2000 chars)
- Star rating validation system
- Click tracking for attribution
- Rate limiting (3 drops/day for free tier)

---

## What's Missing (Intentionally)

These are **not needed for MVP**:

❌ Listening history sync
❌ OAuth flow (using public Spotify API)
❌ Discovery circles (Phase 2)
❌ Advanced taste matching (Phase 2)
❌ Premium subscription UI (Phase 2)
❌ Email notifications
❌ Mobile app

---

## Next Steps

### Immediate (Week 1)

1. **Add Auth UI**
   - Sign up / sign in pages
   - Profile creation flow
   - Session management

2. **Reputation Resolution Cron**
   - Daily job to resolve expired drops
   - Calculate outcomes based on ratings
   - Update trust scores accordingly

3. **Profile Pages**
   - Show user's drops
   - Display trust score history
   - Genre expertise breakdown

### Near-term (Week 2-3)

4. **Onboarding Flow**
   - Welcome tutorial
   - Genre preference selection
   - First drop guidance

5. **Analytics Dashboard**
   - Drop performance metrics
   - Click-through rates
   - Validation trends

6. **Search & Filters**
   - Filter feed by genre
   - Filter by trust score threshold
   - Search drops by track/artist

### Medium-term (Month 2)

7. **Discovery Circles**
   - Create hyper-specific communities
   - Max 150 members (Dunbar's number)
   - Circle-specific feeds

8. **Platform Partnerships**
   - Attribution reporting
   - Revenue share negotiation
   - API for curator data

---

## Architecture Decisions

### Why No Listening History?

**Problem:** Syncing listening history is complex and expensive
- Requires OAuth for each platform
- Background jobs cost $150-200/month at scale
- Privacy concerns
- Platform lock-in

**Solution:** Trust through behavior, not data
- Users prove taste through successful drops
- Cheaper ($50/month vs $160/month at 10K users)
- Platform-agnostic by default
- No privacy issues

### Why Supabase?

- **Zero ops** - managed Postgres, auth, storage
- **Real-time** - websockets for live updates (future)
- **Row Level Security** - built-in auth at DB level
- **Local development** - `supabase start` = full stack locally

### Why Next.js 14?

- **Server Components** - fast initial page loads
- **API Routes** - backend in same repo
- **Type Safety** - TypeScript everywhere
- **Deployment** - one-click Vercel deploy

---

## Troubleshooting

### "Failed to search tracks"

- Check Spotify credentials in `.env.local`
- Verify both `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are set
- Restart dev server after changing `.env.local`

### "Failed to create drop"

- Ensure you're authenticated (check browser console)
- Verify profile exists in `profiles` table
- Check you have sufficient `reputation_available`

### "Drop not found"

- Ensure Supabase is running (`supabase status`)
- Check migrations applied (`supabase db reset`)
- Verify RLS policies in Supabase Studio

### Database connection issues

```bash
# Reset database
supabase db reset

# Check status
supabase status

# View logs
supabase logs
```

---

## Deployment

### Vercel (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
```

### Supabase (Production)

1. Create project at [supabase.com](https://supabase.com)
2. Link project: `supabase link --project-ref your-project-ref`
3. Push migrations: `supabase db push`
4. Update environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Questions?

- Check `/docs` folder for strategy documents
- Review `ARCHITECTURE.md` for system design
- See `PLATFORM_STRATEGY.md` for business model

**Built with ♫ and trust**
