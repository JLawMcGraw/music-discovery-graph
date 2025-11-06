# DeepCuts Project - Session Initialization

## FOR CLAUDE: READ THESE FILES IMMEDIATELY

Hello Claude, we're continuing work on **DeepCuts** - a music discovery platform for finding trusted curators. This prompt is designed to efficiently initialize the proper context. As soon as you receive this prompt, please read the following files in order:

1. **THIS ENTIRE PROMPT DOCUMENT FIRST**
2. `/home/user/music-discovery-graph/README.md`
3. `/home/user/music-discovery-graph/docs/PROJECT_STATUS.md`
4. `/home/user/music-discovery-graph/claude.md`

---

## Project Overview

**DeepCuts** is a music discovery platform where taste matters. Users find and follow trusted music curators whose recommendations align with their own taste, building a personalized music discovery network.

### Current Status
- **Phase**: Production Ready (November 2025)
- **Branch**: `main` (consolidated from feature branches)
- **Status**: All 4 architecture improvement steps completed

### Tech Stack
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Music Integration**: Spotify Web API (public search, no OAuth)
- **Hosting**: Vercel (frontend) + Supabase (backend)

### Key Directories
- `/home/user/music-discovery-graph/app/` - Next.js pages and API routes
- `/home/user/music-discovery-graph/components/` - React components
- `/home/user/music-discovery-graph/lib/` - Utilities (Supabase, Spotify)
- `/home/user/music-discovery-graph/supabase/migrations/` - Database migrations (12 applied)
- `/home/user/music-discovery-graph/docs/` - Project documentation

---

## Documentation Structure

Documentation is organized in a tiered system for efficient context loading:

### Tier 1: Essential Context (LOAD FIRST)

- `/home/user/music-discovery-graph/README.md` - Comprehensive project overview (580 lines)
- `/home/user/music-discovery-graph/claude.md` - Code review and deployment concerns

### Tier 2: Current Status (LOAD WHEN NEEDED)

- `/home/user/music-discovery-graph/docs/PROJECT_STATUS.md` - Current implementation status
- `/home/user/music-discovery-graph/docs/ACTIVE_TASKS.md` - Active task tracking
- `/home/user/music-discovery-graph/docs/SESSION_HISTORY.md` - Development session history
- `/home/user/music-discovery-graph/docs/DEV_NOTES.md` - Technical decisions and notes

### Tier 3: Architecture & Planning (LOAD ON DEMAND)

- `/home/user/music-discovery-graph/ARCHITECTURE.md` - Technical architecture details
- `/home/user/music-discovery-graph/vision.md` - Complete product vision and user flows
- `/home/user/music-discovery-graph/IMPLEMENTATION_PLAN.md` - 4-step architecture improvement plan
- `/home/user/music-discovery-graph/MVP_ROADMAP.md` - MVP feature roadmap
- `/home/user/music-discovery-graph/docs/PLATFORM_STRATEGY.md` - Business model and revenue strategy
- `/home/user/music-discovery-graph/docs/LISTENING_DATA_STRATEGY.md` - Listening data approach

### Tier 4: Deployment & Testing (LOAD ON DEMAND)

- `/home/user/music-discovery-graph/LOCAL_TESTING_GUIDE.md` - Local testing guide (PowerShell-compatible)
- `/home/user/music-discovery-graph/DEPLOYMENT_CHECKLIST_RESULTS.md` - Production deployment checklist
- `/home/user/music-discovery-graph/TESTING_INSTRUCTIONS.md` - Testing procedures
- `/home/user/music-discovery-graph/ConnectionGuide.txt` - Ports, endpoints, debugging info

---

## START HERE

1. **IMMEDIATELY READ** the essential files:
   - `/home/user/music-discovery-graph/README.md`
   - `/home/user/music-discovery-graph/docs/PROJECT_STATUS.md`
   - `/home/user/music-discovery-graph/claude.md`

2. **BASED ON THE TASK**, selectively load:
   - Active tasks: `/home/user/music-discovery-graph/docs/ACTIVE_TASKS.md`
   - Dev notes: `/home/user/music-discovery-graph/docs/DEV_NOTES.md`
   - Session history: `/home/user/music-discovery-graph/docs/SESSION_HISTORY.md`

3. **ONLY IF NEEDED**, reference:
   - Architecture specifications
   - Implementation plans
   - Business strategy documents
   - Deployment guides

---

## Important Development Guidelines

### Git Workflow

**Current Branch**: `main`

- **ALWAYS** develop on the designated branch for your session
- Branch naming for Claude sessions: Must start with `claude/` and end with matching session ID
- Use descriptive commit messages following conventional commits format
- Push with: `git push -u origin <branch-name>`
- For work on main: Ensure you have explicit permission before pushing

### Database Operations

```bash
# Start Supabase locally
supabase start

# Apply migrations
supabase db push

# Generate TypeScript types after schema changes
npm run db:types

# Reset database (clean slate)
supabase db reset

Development Server

# Start Next.js dev server
npm run dev

# Build for production
npm run build

# Open at http://localhost:3000

Environment Setup

Required .env.local variables:

    SPOTIFY_CLIENT_ID - Spotify API credentials
    SPOTIFY_CLIENT_SECRET - Spotify API credentials
    NEXT_PUBLIC_SUPABASE_URL - Supabase project URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anon key
    NEXT_PUBLIC_APP_URL - Application URL

Critical Rules & Best Practices
Code Quality

    ✅ Always use TypeScript with proper type definitions
    ✅ Use absolute paths for file references
    ✅ Include error handling in all async operations
    ✅ Add loading states for user-facing operations
    ✅ Follow existing code style and patterns
    ⚠️ Never skip RLS (Row Level Security) policies in database

Testing Requirements

Before deploying changes:

    Test locally with supabase start + npm run dev
    Verify database migrations run cleanly
    Test all user flows affected by changes
    Check mobile responsive design
    Verify RLS policies work correctly

Git Operations

    NEVER use --force push to main/master
    NEVER skip hooks (--no-verify) unless explicitly requested
    NEVER update git config
    ALWAYS check authorship before amending commits
    Retry network failures up to 4 times with exponential backoff

Common Pitfalls (from claude.md review)

⚠️ Watch out for:

    Missing RLS policies on new tables (error 42501)
    Type mismatches in database functions (genre comparisons)
    Default values in migrations (e.g., is_curator should default to FALSE)
    Corrupted .next cache causing infinite loading (solution: delete .next directory)
    Missing indexes for performance (GIN indexes for arrays, indexes on foreign keys)

Database Schema Overview
Core Tables (12 migrations applied)

profiles

    User identity, curation statement, genre preferences
    is_curator flag, discovery preferences, favorite artists
    Follower/following counts

drops

    Track metadata (platform-agnostic)
    Context (50-2000 chars required), listening notes
    Genre/mood tags, save count

follows

    Asymmetric following (Twitter-style)

drop_saves

    Private user saves

user_genre_stats

    Activity tracking per genre per user
    Auto-populated via triggers

taste_profile

    Genre experience levels (discovering/regular/deep_diver)
    Auto-upgraded based on drop activity

Key Database Functions

    get_user_top_genres(user_id) - Returns top 5 genres by activity
    recommend_curators_for_user(user_id, limit) - Weighted recommendation algorithm

Required Actions After Reading This Prompt

After reading this entire prompt and the required files, Claude should:

    ✅ Confirm you've read the essential files (README, PROJECT_STATUS, claude.md)
    🎯 Summarize current project status and any outstanding concerns
    ❓ Ask what specific task or feature we'll be working on
    📋 Load relevant additional documentation based on the task
    ⏸️ Wait for task specification before proceeding with any changes

Metrics Collection

⚠️ IMPORTANT: RECORD SESSION METRICS - DO NOT FORGET THIS STEP ⚠️

After loading initial context, create or update the metrics file:

File: /home/user/music-discovery-graph/docs/metrics/session-metrics.md

Format (add new entry at the top of Detailed Records section):

## YYYY-MM-DD - Session Start

- **Task**: Brief description of the session's focus
- **Context Loading Time**: Time to load and understand context
- **Files Loaded**: Number of files read during initialization
- **Issues Found**: Any discrepancies or concerns identified
- **Ready to Proceed**: ✅ Yes / ❌ No (explain blockers)
- **Notes**: Observations or suggestions for improvement

IMPORTANT: Always ADD a new entry - NEVER edit existing entries (historical record).

Update the Summary Statistics table to reflect averaged metrics across all sessions.
Quick Reference Commands
Supabase

supabase start          # Start local instance
supabase status         # Check status
supabase db push        # Apply migrations
supabase db reset       # Reset database
supabase stop           # Stop local instance

Development

npm install             # Install dependencies
npm run dev             # Start dev server
npm run build           # Build for production
npm run db:types        # Generate TypeScript types

Git

git status                          # Check status
git add .                           # Stage changes
git commit -m "type: description"  # Commit
git push -u origin main            # Push to main (with permission)

Troubleshooting

# Corrupted Next.js cache
rm -rf .next && npm run dev

# Database migration issues
supabase db reset && npm run db:types

# Check Supabase logs
supabase logs

Session Initialization Complete - Ready to receive task specification.