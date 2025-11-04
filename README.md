# DeepCuts - Find Music Curators You Trust

> Discover music through trusted tastemakers, not algorithms.

**📌 Current Status:** MVP Complete + Architecture Improvements (Nov 2025)
**🚀 Branch:** `claude/project-review-011CUYCggo6PyaMHfkxeLBCH`
**📖 [Testing Instructions](./TESTING_INSTRUCTIONS.md)** | **📐 [Architecture Docs](./ARCHITECTURE.md)** | **🗺️ [Vision](./vision.md)**

---

## 🆕 Recent Updates (November 3, 2025)

### ✅ Completed Architecture Improvements

**STEP 1: Fixed Data Model**
- Auto-populating genre stats trigger
- Taste areas now display on profiles
- Top genres computed from activity

**STEP 2: Database-Level Genre Filtering**
- Moved filtering from client to database
- Performance indexes for fast queries
- Scales to thousands of curators

**STEP 3: Instagram-Style Infinite Scroll**
- Cursor-based pagination API
- Smooth infinite scrolling feed
- Optimized initial page load

➡️ **[Read Testing Instructions](./TESTING_INSTRUCTIONS.md)** for how to test these features.

---

## What is DeepCuts?

DeepCuts is a music discovery platform where **taste matters**. Find curators whose music recommendations align with your own taste. Follow the tastemakers you trust, save the drops you love, and build your own music discovery network.

### The Problem We're Solving

Current music discovery is either:
- **Algorithmic**: Impersonal echo chambers optimized for engagement, not taste
- **Social**: Casual sharing without context or curation
- **Celebrity-driven**: Unattainable scale, detached from authentic passion

There's no platform for **finding trusted music curators** who share your specific taste.

### Core Innovation

**Curated Drops with Context**: Every week, curators share up to 10 drops that define their taste:
1. Select a track from any streaming platform
2. Write context explaining why it matters (50-2000 characters)
3. Add optional listening notes to highlight specific moments
4. Tag with genres and moods

**No Validation, No Gamification**:
- No voting or ratings on drops
- No public metrics or scores
- Just genuine curation and organic following
- Build your network of trusted tastemakers

**Weekly Limit**: The 10 drops per week limit encourages quality over quantity. Choose tracks that truly matter to you.

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Music Integration**: Spotify Web API (public search, no OAuth)
- **Hosting**: Vercel (frontend) + Supabase (backend)

### Key Architecture Decisions

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [docs/PLATFORM_STRATEGY.md](./docs/PLATFORM_STRATEGY.md) for full details.

- **Serverless-first** (Next.js + Supabase) for MVP speed
- **No listening history dependency** - platform-agnostic design
- **Works with any streaming service** - Spotify, Apple Music, YouTube, SoundCloud
- **Cost-effective**: ~$50/mo at 10K users

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase CLI: `npm install -g supabase` (or bundled via npm install)
- Spotify Developer Account (for public track search API)

### 1. Clone and Install

```bash
git clone <repo-url>
cd music-discovery-graph
npm install
```

### 2. Set Up Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Copy **Client ID** and **Client Secret**

> We use Spotify's public search API (Client Credentials flow), not user OAuth. No Spotify account required for users.

### 3. Configure Environment

Create `.env.local`:

```env
# Spotify (for public track search)
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret

# Supabase (from supabase start)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Start Supabase Locally

```bash
supabase start
```

This starts:
- PostgreSQL database (port 54322)
- Supabase Studio UI (http://localhost:54323)
- Auth server
- Local development environment

Copy the `API URL` and `anon key` to your `.env.local`.

### 5. Run Database Migration

```bash
supabase db push
```

This creates all tables:
- `profiles` - User profiles with curation statements
- `drops` - Music recommendations (no expiration, no stakes)
- `follows` - Asymmetric following relationships
- `drop_saves` - Private saved drops
- `user_genre_stats` - Activity tracking per genre

### 6. Generate TypeScript Types

```bash
npm run db:types
```

### 7. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

---

## 📋 Current Features (MVP + Improvements)

### ✅ Implemented & Working

**Core Platform:**
- User authentication (email/password via Supabase)
- 4-step onboarding flow
- Weekly drop limit enforcement (10 drops/week)
- Platform-agnostic track metadata (Spotify, Apple Music, YouTube, SoundCloud)

**Feed & Discovery:**
- ✨ **NEW:** Infinite scroll feed with cursor-based pagination
- ✨ **NEW:** Database-level genre filtering
- Following tab (drops from curators you follow)
- Discover tab (all drops across platform)
- Genre-based curator discovery

**Profile & Curation:**
- ✨ **NEW:** Auto-populating taste areas (genre activity)
- ✨ **NEW:** Top 5 genres computed from drops
- Public profile pages with curation statements
- Activity levels: Exploring → Occasional → Active → Prolific
- Drop creation with context (50-2000 chars required)

**Social Features:**
- Asymmetric following (Twitter-style)
- Private save functionality
- Following/follower counts

### 🚧 Planned (Step 4 - Next Session)

**Enhanced Onboarding:**
- Taste development questionnaire
- Genre experience levels (discovering/regular/deep diver)
- Discovery preferences (new releases, deep cuts, classics, etc.)
- Curator vs. Listener choice

**Recommendation System:**
- Algorithm-driven curator suggestions
- Taste compatibility matching
- Personalized "Recommended for you" curators

**See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for full roadmap.**

---

## 📚 Documentation

**Essential Reading:**
- **[TESTING_INSTRUCTIONS.md](./TESTING_INSTRUCTIONS.md)** - How to test new features
- **[vision.md](./vision.md)** - Complete product vision and user flows
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture details
- **[ConnectionGuide.txt](./ConnectionGuide.txt)** - Ports, endpoints, and debugging
- **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** - 4-step improvement plan

---

## Features (Detailed)

### For Curators

**Onboarding (4 Steps)**:
1. Choose username and display name
2. Write bio
3. Select up to 5 genres you're passionate about
4. Write curation statement (how you curate music)

**Curation Statement Examples**:
- "I dig for rare soul and funk 45s from regional labels"
- "Contemporary classical music that pushes boundaries"
- "Indie folk with literary lyrics and unusual instrumentation"
- "90s hip hop deep cuts and forgotten producers"

**Creating Drops**:
- Post up to **10 drops per week** (resets every Monday)
- Write thoughtful context explaining why each track matters
- Add optional listening notes
- Tag with genres and moods
- No stakes, no scoring, no pressure

**Building Following**:
- Followers discover you through the `/discover` page
- They follow you based on your curation statement and taste areas
- Your drops appear in their "Following" feed

### For Listeners

**Discover Curators**:
- Browse `/discover` to find curators
- Filter by genre
- Sort by followers, activity, or newest
- Read curation statements to understand their approach

**Follow & Build Network**:
- Follow curators whose taste aligns with yours
- See their drops in your "Following" feed
- Unfollow anytime (no notifications)

**Save Drops**:
- Save drops you love (private collection)
- Access saved drops at `/saved`
- No public metrics on saves

**Taste Areas**:
- Each curator's profile shows their active genres
- See their activity level: Exploring, Occasional, Active, Prolific
- View stats: drops per genre, saves received

---

## Database Schema

### Core Tables

**profiles**:
- User identity (username, display_name, bio)
- Curation statement
- Genre preferences
- Follower/following counts
- Total drops count

**drops**:
- Track metadata (Spotify, Apple Music, YouTube, SoundCloud)
- Context (required, 50-2000 chars)
- Listening notes (optional)
- Genres and mood tags
- Save count (for internal metrics only)
- Never expires

**follows**:
- Asymmetric following (Twitter-style)
- follower_id → following_id

**drop_saves**:
- Private saves (not publicly visible)
- user_id + drop_id

**user_genre_stats**:
- Activity per genre per user
- Total drops, saves received
- Activity level (exploring/occasional/active/prolific)
- Auto-calculated nightly

---

## Project Structure

```
music-discovery-graph/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── feed/page.tsx               # Main feed (Following/Discover tabs)
│   ├── discover/page.tsx           # Browse curators by genre
│   ├── saved/page.tsx              # User's saved drops
│   ├── drop/create/page.tsx        # Create drop (10/week limit)
│   ├── profile/[username]/page.tsx # User profile + taste areas
│   ├── onboarding/page.tsx         # 4-step onboarding flow
│   └── api/
│       ├── drops/
│       │   ├── create/route.ts     # POST new drop (with weekly limit)
│       │   └── [id]/
│       │       ├── save/route.ts   # POST/DELETE save drop
│       │       └── click/route.ts  # Track platform clicks
│       └── users/[username]/follow/route.ts  # POST/DELETE follow
├── components/
│   ├── DropCard.tsx                # Drop display with save button
│   └── TrackSearch.tsx             # Spotify track search
├── lib/
│   ├── supabase/                   # Supabase clients
│   └── spotify/                    # Spotify API utilities
└── supabase/
    └── migrations/
        └── 20241027000000_remove_validation_add_curation.sql
```

---

## Development Workflow

### Local Development

```bash
# Start Supabase
supabase start

# Start Next.js dev server (in new terminal)
npm run dev

# Generate TypeScript types after schema changes
npm run db:types
```

### Database Management

```bash
# View Supabase status
supabase status

# Reset database (clean slate)
supabase db reset

# Create new migration
supabase migration new migration_name

# Stop Supabase
supabase stop
```

---

## Deployment

### Production Setup

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Copy project URL and anon key

2. **Link Local to Production**:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Push Migration**:
   ```bash
   supabase db push
   ```

4. **Deploy to Vercel**:
   ```bash
   vercel deploy --prod
   ```

5. **Set Environment Variables on Vercel**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   - `NEXT_PUBLIC_APP_URL`

---

## Key Differences from Validation Model

**What Changed:**

❌ **Removed:**
- Validation/rating system (no 1-5 star ratings)
- Reputation stakes (no points at risk)
- Trust scores (no competitive metrics)
- Drop expiration (drops never expire)
- Leaderboards and rankings
- Gamification elements

✅ **Added:**
- Weekly drop limit (10 drops per week)
- Following system (asymmetric, Twitter-style)
- Private save functionality
- Curation statements
- Discover page for finding curators
- Taste areas (activity per genre)
- Genre-based filtering

**Philosophy:**
- **Before**: "Stake reputation → get validated by community → earn/lose points"
- **After**: "Share your taste → build following through quality → organic discovery"

---

## Business Model

See [docs/PLATFORM_STRATEGY.md](./docs/PLATFORM_STRATEGY.md) for full strategy.

**Revenue Streams:**

1. **Platform Attribution**: Revenue share from "Listen on Spotify" clicks
2. **B2B API Licensing**: License curator network data to streaming platforms
3. **Label/Artist Campaigns**: Curator outreach for new releases (opt-in)
4. **Future Premium Tier**: Advanced analytics, unlimited features

**Current Status**: Free platform, building user base

---

## Contributing

This project is currently in private development.

---

## License

Proprietary - All rights reserved

---

## Support

For issues or questions, please open an issue on GitHub.
