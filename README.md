# DeepCuts - Dig Deeper with Trusted Curators

> Music recommendations staked on reputation. Go beyond the algorithm.

## What is DeepCuts?

DeepCuts is a music discovery platform where **reputation matters**. Curators stake reputation points on their music recommendations, creating accountability absent from casual sharing. Great recommendations elevate your trust score; poor ones lower it.

### The Problem We're Solving

Current music discovery is either:
- **Algorithmic**: Impersonal, echo-chamber feedback loops
- **Celebrity-driven**: Unattainable scale, detached from authentic passion

There's no middle layer of **trusted, passionate curators** sharing music with context and stakes.

### Core Innovation

**Drops with Reputation Stakes**: When you recommend a track, you:
1. Write context explaining why it matters (50-2000 characters)
2. Stake reputation points (10-100)
3. Community validates your recommendation (1-5 stars)
4. Your trust score changes based on their ratings

This creates accountability and surfaces the best curators naturally.

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Music Integration**: Spotify Web API (public search, no OAuth)
- **Hosting**: Vercel (frontend) + Supabase (backend)

### Key Architecture Decisions

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [docs/PLATFORM_STRATEGY.md](./docs/PLATFORM_STRATEGY.md) for full details.

- **Serverless-first** (Next.js + Supabase) for MVP speed
- **No listening history dependency** - trust built through behavior, not data access
- **Platform-agnostic** - works with Spotify, Apple Music, YouTube, any streaming service
- **Cost-effective**: ~$50/mo at 10K users (vs $160/mo with sync jobs)

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase CLI: `npm install -g supabase`
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
3. Redirect URI: Use `http://127.0.0.1:3000/api/auth/callback` (required by form but unused)
4. APIs: Select **Web API** only
5. Copy **Client ID** and **Client Secret**

> We use Spotify's public search API (Client Credentials flow), not user OAuth. No user authentication with Spotify needed.

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add:

```env
# Spotify (for public track search)
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret

# Supabase (from supabase start)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron job security (any random string)
CRON_SECRET=your-random-string
```

### 4. Start Supabase Locally

```bash
supabase start
```

This will:
- Start local Postgres database on port 54322
- Apply migrations from `supabase/migrations/`
- Start Supabase Studio at `http://localhost:54323`

Copy the `anon key` from the output and add to `.env.local`.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Database Schema

The complete schema is in `supabase/migrations/20241023000001_simplified_schema.sql`.

### Key Tables

**profiles**
- User profiles with trust scores and reputation tracking
- Genre preferences (up to 5)
- Success rate and stats
- Auto-updated via triggers

**drops**
- Music recommendations with context (50-2000 chars required) and stakes
- Platform-agnostic (Spotify, Apple Music, YouTube, SoundCloud)
- Status: `active` → `validated`/`failed` based on community ratings
- Includes genres, mood tags, engagement tracking

**drop_validations**
- Community ratings (1-5 stars) on drops
- One validation per user per drop
- Triggers automatic reputation updates

**reputation_events**
- Immutable ledger of all reputation changes
- Provides auditability and trust score history
- Event types: drop_created, drop_validated, drop_failed

**platform_clicks**
- Attribution tracking for "Listen on Spotify/Apple/etc" clicks
- Powers future platform partnership revenue

**circles** (Phase 2)
- Discovery communities (max 150 members, Dunbar's number)
- Genre-focused, curated feeds

### Reputation System

```
User stakes 50 points on a drop
  ↓
Community rates it (1-5 stars)
  ↓
After 7 days or 3+ ratings, cron job resolves:
  - Average ≥ 3.5/5 (70%): Return stake + 50% bonus
  - Average 2-3.5/5 (40-70%): Return stake only
  - Average < 2/5 (<40%): Lose stake
  ↓
Trust score updates automatically via triggers
```

---

## Project Structure

```
music-discovery-graph/
├── app/                      # Next.js 14 App Router
│   ├── page.tsx             # Landing page
│   ├── layout.tsx           # Root layout
│   ├── globals.css          # Global styles
│   ├── api/                 # API routes
│   │   ├── search/tracks/  # Spotify public track search
│   │   ├── drops/          # Drop CRUD + validation
│   │   ├── cron/           # Reputation resolution (daily)
│   │   └── auth/           # Sign out endpoint
│   ├── auth/               # Authentication pages (sign up/in)
│   ├── onboarding/         # Profile creation flow (3 steps)
│   ├── feed/               # Main feed page
│   ├── profile/[username]/ # Public user profiles
│   └── drop/create/        # Drop creation form
├── components/              # React components
│   ├── DropCard.tsx        # Drop display with inline validation
│   ├── TrackSearch.tsx     # Real-time Spotify search
│   └── ...
├── lib/                     # Utilities
│   ├── supabase/           # Supabase clients (client, server, middleware)
│   └── spotify/            # Spotify API helpers
├── supabase/
│   ├── migrations/         # Database migrations
│   └── config.toml         # Supabase configuration
├── docs/                   # Strategy documents
│   ├── PLATFORM_STRATEGY.md
│   └── LISTENING_DATA_STRATEGY.md
├── ARCHITECTURE.md          # Architecture analysis
├── MVP_ROADMAP.md          # 4-week implementation plan
└── README.md               # This file
```

---

## Development Status

### ✅ MVP Complete (Week 1-4)
- ✅ Authentication & onboarding (3-step flow)
- ✅ Spotify track search (public API)
- ✅ Drop creation with stakes (10-100 points)
- ✅ Validation system (1-5 star ratings)
- ✅ Reputation resolution (automated daily cron)
- ✅ Profile pages (stats, history, performance)
- ✅ Feed generation (active drops)
- ✅ Conversion tracking (platform clicks)

### Next: Growth Features
- Discovery Circles (150-member communities)
- Leaderboards (top curators by trust score)
- Search & filters (by genre, trust score)
- Notifications (validation alerts)
- Premium tier UI ($8/month)
- Analytics dashboard
- Platform partnerships (revenue attribution)

---

## Key Commands

```bash
# Development
npm run dev              # Start Next.js dev server
supabase start          # Start local Supabase
supabase stop           # Stop local Supabase

# Database
supabase db reset       # Reset DB to latest migration
supabase db diff        # Generate migration from schema changes
npm run db:types        # Generate TypeScript types from schema

# Deployment
npm run build           # Build for production
vercel deploy           # Deploy to Vercel
supabase link           # Link to production Supabase project
supabase db push        # Push migrations to production
```

---

## Environment Variables

### Local Development
- `NEXT_PUBLIC_SUPABASE_URL`: http://localhost:54321
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: From `supabase start`
- `SPOTIFY_CLIENT_ID`: From Spotify Dashboard
- `SPOTIFY_CLIENT_SECRET`: From Spotify Dashboard
- `NEXT_PUBLIC_APP_URL`: http://localhost:3000
- `CRON_SECRET`: Random string for cron job authentication

### Production (Vercel)
- Update Supabase URL to production project
- Update app URL to your Vercel domain
- Add all env vars in Vercel dashboard
- Vercel automatically configures cron from `vercel.json`

---

## Business Model

See [docs/PLATFORM_STRATEGY.md](./docs/PLATFORM_STRATEGY.md) for full analysis.

### Revenue Streams

1. **B2C Freemium** ($8/mo premium)
   - Unlimited drops, circles, analytics
   - Target: 5% conversion at 10K users = $4K MRR

2. **Platform Attribution** ($0.001-0.0015 per stream)
   - Revenue share on attributed streams from "Listen on Spotify" clicks
   - Target: $100K-150K/mo at 100M monthly streams

3. **API Licensing** ($25K-100K/mo per platform)
   - Curator network data access for Spotify, Apple Music, Tidal
   - Target: Editorial content partnerships

4. **Label Campaigns** ($500-2K per campaign)
   - Curator outreach for new releases (opt-in)
   - Target: $10K/mo with 10 campaigns

**Year 1 Target: $50K MRR ($600K ARR)**

---

## Why DeepCuts Works

### Competitive Moats

1. **Cold start problem** - Takes 6-12 months to build trusted curator network
2. **Neutral territory** - Not owned by streaming platform
3. **Cross-platform** - Works with all streaming services
4. **Community over algorithms** - Network effects compound

### Cost Advantages Over Alternatives

- No listening history sync: **$50/mo vs $160/mo at 10K users**
- No OAuth complexity (public API only)
- Platform-agnostic by default (not locked to Spotify)
- Simpler infrastructure = faster iteration

---

## Contributing

This project is currently in MVP/beta. We're focused on validating product-market fit before accepting external contributions.

---

## License

MIT (to be confirmed)

---

**Built with ♫ by trusted curators**
