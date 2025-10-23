# Signal - The Trust Graph for Music Discovery

> Discover music through trusted humans, not algorithms.

## What is Signal?

Signal is a music discovery platform where **reputation matters**. Users stake reputation points on their music recommendations, creating accountability absent from casual sharing. Great recommendations elevate your trust score; poor ones lower it.

### The Problem We're Solving

Current music discovery is either:
- **Algorithmic**: Impersonal, echo-chamber feedback loops
- **Celebrity-driven**: Unattainable scale, detached from authentic passion

There's no middle layer of **trusted, passionate humans** sharing music with context and stakes.

### Core Innovation

**Drops with Reputation Stakes**: When you recommend a track, you:
1. Write context explaining why it matters
2. Stake reputation points (10-100)
3. Community validates your recommendation
4. Your trust score changes based on their ratings

This creates accountability and surfaces the best curators naturally.

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Music Integration**: Spotify Web API
- **Hosting**: Vercel (frontend) + Supabase (backend)

### Architecture Decisions

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architectural analysis. We chose:

- **Serverless-first** (Next.js + Supabase) for MVP speed
- **PostgreSQL** with Row Level Security for data
- **Future migration path** to Neo4j for trust graph at scale

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase CLI: `npm install -g supabase`
- Spotify Developer Account

### 1. Clone and Install

```bash
git clone <repo-url>
cd music-discovery-graph
npm install
```

### 2. Set Up Spotify OAuth

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URI: `http://localhost:3000/api/auth/spotify/callback`
4. Copy Client ID and Client Secret

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your Spotify credentials:

```env
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
```

### 4. Start Supabase Locally

```bash
supabase start
```

This will:
- Start local Postgres database
- Apply migrations from `supabase/migrations/`
- Start Supabase Studio at `http://localhost:54323`

Copy the `anon key` and `service_role key` to your `.env`:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Database Schema

The complete schema is in `supabase/migrations/20241023000000_initial_schema.sql`.

### Key Tables

**profiles**
- User profiles with trust scores and reputation tracking
- Auto-updated via triggers from reputation events

**drops**
- Music recommendations with context and stakes
- Status: `active` → `validated`/`failed` based on community ratings

**drop_validations**
- Community ratings (1-5 stars) on drops
- Triggers reputation resolution

**reputation_events**
- Immutable ledger of all reputation changes
- Provides auditability and history

**spotify_connections**
- OAuth tokens for Spotify integration
- Auto-refresh mechanism

**listening_history**
- Synced from Spotify every hour
- Partitioned by month for performance
- Powers taste compatibility algorithms

### Reputation System

```
User stakes 50 points on a drop
  ↓
Community rates it (1-5 stars)
  ↓
After 7 days or 3+ ratings:
  - Average ≥ 3.5/5: Return stake + 25% bonus
  - Average 2-3.5/5: Return stake
  - Average < 2/5: Lose stake
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
│   │   ├── auth/spotify/   # Spotify OAuth flow
│   │   └── drops/          # Drop CRUD operations
│   ├── feed/               # Main feed page
│   ├── profile/            # User profiles
│   └── drop/[id]/          # Drop detail pages
├── components/              # React components
│   ├── DropCard.tsx
│   ├── ProfileBadge.tsx
│   └── ...
├── lib/                     # Utilities
│   ├── supabase/           # Supabase clients
│   ├── spotify/            # Spotify API helpers
│   └── utils/              # General utilities
├── supabase/
│   ├── migrations/         # Database migrations
│   └── config.toml         # Supabase configuration
├── ARCHITECTURE.md          # Architecture analysis
├── MVP_ROADMAP.md          # 4-week implementation plan
└── README.md               # This file
```

---

## Development Roadmap

See [MVP_ROADMAP.md](./MVP_ROADMAP.md) for detailed 4-week plan.

### Week 1-2: Foundation
- ✅ Project setup
- ✅ Database schema
- 🔄 Spotify OAuth integration
- 🔄 Listening history sync

### Week 3: Core Mechanic
- Drop creation with stakes
- Validation system
- Reputation resolution
- Feed generation

### Week 4: Polish & Testing
- UI/UX refinement
- Onboarding flow
- User testing with 20 beta users
- Analytics & monitoring

### Post-MVP
- Discovery Circles (150-member communities)
- Advanced taste matching algorithm
- Trust graph visualization
- Premium features ($8/month)

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
- `SUPABASE_SERVICE_ROLE_KEY`: From `supabase start`
- `SPOTIFY_CLIENT_ID`: From Spotify Dashboard
- `SPOTIFY_CLIENT_SECRET`: From Spotify Dashboard
- `SPOTIFY_REDIRECT_URI`: http://localhost:3000/api/auth/spotify/callback

### Production
- Update Supabase URLs to production project
- Update Spotify redirect URI to production domain
- Add to Vercel environment variables

---

## Contributing

This is currently in MVP development. We're focused on validating the core mechanic (drops with stakes) before accepting external contributions.

If you want to help test, DM [@username] on Twitter.

---

## License

MIT (to be confirmed)

---

## Contact

- Twitter: [@signal_music](https://twitter.com/signal_music)
- Email: hello@signal.music
- Discord: [Join our community](https://discord.gg/signal)

---

**Built with ♫ and trust**
