# DeepCuts - Product Vision & Feature Specification

**Last Updated:** 2025-11-03
**Version:** 1.0 - Pure Curation Model

---

## Core Vision

**DeepCuts is a music discovery platform where you find trusted tastemakers, not algorithms.**

In a world where music discovery is dominated by:
- **Algorithmic recommendations** optimized for engagement, not genuine taste
- **Paid social media posts** where labels pay creators to promote tracks
- **Gamified platforms** where metrics corrupt authentic curation

DeepCuts offers a **trust-first, anti-gamification platform** where:
- Anyone can be a curator of music they genuinely love
- Discovery happens through finding curators whose taste aligns with yours
- No ratings, no validation, no competition
- Quality over quantity (10 drops per week limit)
- Context is required - every drop explains WHY it matters

---

## Philosophy & Principles

### What We Believe

1. **Taste is personal, not competitive**
   - There are no "best" curators
   - Everyone's taste is equally valid
   - We help you find YOUR people, not "top" people

2. **Context is everything**
   - A track without context is just noise
   - Curation is about the "why" not just the "what"
   - Every drop requires 50-2000 characters explaining why it matters

3. **Quality over quantity**
   - 10 drops per week forces intentional curation
   - No one can curate 100 tracks per week thoughtfully
   - The limit makes every drop count

4. **Anti-gamification**
   - No ratings or validation system
   - No public save counts or metrics
   - No trust scores or leaderboards
   - No reputation stakes
   - Pure curation without pressure to perform

5. **Platform-agnostic**
   - Works with Spotify, Apple Music, YouTube, SoundCloud
   - No listening history required
   - No OAuth with streaming platforms
   - Respects user privacy

6. **Trust through alignment, not scores**
   - You trust a curator because their taste aligns with yours
   - Not because they have a high "trust score"
   - Organic discovery through following

---

## User Flows

### Flow 1: Sign Up & Onboarding

**Goal:** Develop user's taste profile to enable curator matching

1. User lands on homepage
2. Clicks "Get Started"
3. **Email/Password Sign Up**
   - Email address
   - Password
   - Email verification

4. **Onboarding: Step 1 - Identity**
   - Choose unique username
   - Display name (optional)
   - Profile bio (optional)

5. **Onboarding: Step 2 - Taste Development (NEW - Critical for Discovery)**
   - "Let's understand your music taste"
   - Select 3-10 genres you love (not just "interested in")
   - For each genre, rate experience level:
     - "Just discovering" (new to this genre)
     - "Regular listener" (familiar with mainstream)
     - "Deep diver" (know the obscure stuff)
   - **Optional:** "What are you looking for in music discovery?"
     - Checkboxes: New releases, Deep cuts, Classics, Experimental, Lyrical, Production-focused
   - **Optional:** "Name 3-5 artists you've been obsessed with lately"
     - Free text input
     - Used for taste matching algorithm

6. **Onboarding: Step 3 - Curator or Listener Choice**
   - "How do you want to use DeepCuts?"
   - Option A: "I want to curate music" → Continue to Step 4
   - Option B: "I just want to discover" → Skip to recommended curators

7. **Onboarding: Step 4 - Curation Statement (Only if curator)**
   - "How do you curate music?" (500 char limit)
   - Examples provided:
     - "I dig for rare soul and funk 45s from regional labels"
     - "Contemporary classical that pushes boundaries"
     - "90s hip hop deep cuts and forgotten producers"
   - **Why this matters:** Appears on profile, helps others understand your approach

8. **Onboarding: Step 5 - Initial Curator Recommendations**
   - Based on taste profile from Step 2
   - "Here are some curators who match your taste"
   - Show 6-12 curators with:
     - Curation statement
     - Top 3 genres
     - Sample drop
   - Quick follow buttons
   - "You can always change this later"

9. **Land on Feed**
   - If followed curators: See "Following" tab with their drops
   - If no follows: See "Discover" tab with all recent drops
   - Persistent prompt: "Make your first drop" (if curator)

---

### Flow 2: Creating a Drop (Curator Experience)

**Goal:** Share a track with thoughtful context

1. Click "New Drop" button (visible in nav/feed)
2. **Check Weekly Limit**
   - Display: "X/10 drops this week"
   - Show countdown to Monday reset
   - If 10/10: Show error, display reset time

3. **Track Search**
   - Search bar: "Search for a track..."
   - Powered by Spotify public API
   - Results show:
     - Album art
     - Track name
     - Artist name
     - Album name
   - Click to select

4. **Add Context (Required)**
   - Text area: "Why does this track matter?" (50-2000 chars)
   - Character counter
   - Placeholder examples:
     - "The bassline at 2:15 completely changed how I think about..."
     - "This obscure B-side from 1973 inspired an entire generation of..."
   - **Cannot submit without 50+ characters**

5. **Add Listening Notes (Optional)**
   - "What should people pay attention to?" (max 1000 chars)
   - Examples:
     - "Listen for the reversed guitar at 1:45"
     - "The way the vocals layer in the second chorus"

6. **Add Tags**
   - Genre tags (up to 5, autocomplete from existing)
   - Mood tags (optional, up to 5)

7. **Platform Selection**
   - Default: Spotify (where track was found)
   - Option to add additional platform URLs:
     - Apple Music URL
     - YouTube URL
     - SoundCloud URL
   - **Why:** Platform-agnostic approach

8. **Preview & Submit**
   - Show preview of how drop will appear
   - "Post Drop" button
   - Success: "Drop posted! X/10 this week"
   - Redirect to feed showing the new drop

---

### Flow 3: Discovering Curators

**Goal:** Find tastemakers whose curation aligns with your taste

1. Click "Discover" in nav
2. **Curator Discovery Page**
   - Header: "Discover Curators"
   - Filters:
     - Genre dropdown (populated from user_genre_stats)
     - Sort by: Followers | Most Active | Newest
   - Grid of curator cards (2 columns on desktop)

3. **Curator Card Shows:**
   - Avatar (or initial if none)
   - Display name + @username
   - Curation statement (truncated, 2 lines max)
   - Top 3 genres (badges)
   - Stats: X drops, Y followers
   - "Follow" button (or "Following" if already following)

4. **Click Curator Card → Profile Page**
   - See full curation statement
   - Taste areas (genres with activity level)
   - All drops from this curator
   - Follow button (if not following)

5. **Follow Action**
   - Click "Follow" → Immediately updates to "Following"
   - No confirmation needed
   - Curator's drops now appear in "Following" feed
   - No notification sent to curator (future feature)

---

### Flow 4: The Feed Experience

**Goal:** Consume curated music from people you trust

1. **Feed Page (Default landing for logged-in users)**
   - Two tabs: "Following" | "Discover"

2. **Following Tab**
   - Shows drops from curators you follow
   - Sorted by: Most recent (chronological)
   - **Pagination:** Instagram-style infinite scroll
     - Load 20 drops initially
     - Load 20 more when user scrolls near bottom
     - Smooth loading state
   - If empty: "You're not following anyone yet. Discover curators →"

3. **Discover Tab**
   - Shows ALL drops from everyone
   - Sorted by: Most recent
   - Same pagination as Following tab
   - **Purpose:** See what's happening across the platform

4. **Drop Card Display**
   - Album art (large, square)
   - Track name + Artist
   - Curator info:
     - Avatar
     - Display name (@username)
     - "Follow" button (if not following, not on own drops)
   - Context (full text, expandable if truncated)
   - Listening notes (if provided)
   - Genre/mood tags
   - "Listen on [Platform]" buttons
     - Spotify (always available)
     - Apple Music, YouTube, etc. (if URLs provided)
   - "Save" button (bookmark icon)
     - Saved drops are private
     - Toggle on/off
   - NO public metrics (no save count, no like count)

5. **Interactions:**
   - Click album art/track → No action (future: open modal with more details)
   - Click curator name → Go to profile
   - Click "Listen on Spotify" → Track click, open Spotify link in new tab
   - Click "Save" → Toggle save state, add to private collection
   - Click "Follow" → Follow curator, button updates to "Following"

---

### Flow 5: Saved Drops (Private Collection)

**Goal:** Build personal library of drops you love

1. Click "Saved" in nav
2. **Saved Drops Page**
   - Header: "Your Saved Drops"
   - Same drop card layout as feed
   - Sorted by: Most recently saved
   - **Pagination:** Same infinite scroll as feed
   - "Unsave" button on each drop
   - If empty: "You haven't saved any drops yet. Explore the feed →"

3. **Privacy:**
   - Only you can see your saved drops
   - No one else knows you saved their drop
   - No notifications sent when someone saves your drop
   - Save counts exist in database but are NEVER shown publicly

---

### Flow 6: Curator Profile Page

**Goal:** Understand a curator's taste before following

1. Navigate to `/profile/[username]`
2. **Profile Header**
   - Avatar (large)
   - Display name
   - @username
   - Stats: X drops | Y followers | Z following
   - "Follow" button (if not own profile, not already following)
   - "Edit Profile" button (if own profile)

3. **Curation Statement**
   - Large, prominent text
   - Up to 500 characters
   - **This is the key differentiator** - explains HOW they curate

4. **Taste Areas**
   - Grid of genre cards
   - Each shows:
     - Genre name
     - Activity level: Exploring (<5 drops) | Occasional (5-19) | Active (20-49) | Prolific (50+)
     - Total drops in genre
     - Total saves received (internal metric, not shown publicly yet)

5. **All Drops**
   - Chronological list of all drops by this curator
   - Same drop card layout as feed
   - Pagination: Infinite scroll

---

## Every Feature (Current & Planned)

### ✅ MVP Features (Currently Implemented)

**Authentication:**
- Email/password sign up
- Email verification
- Sign in/sign out
- Protected routes

**Onboarding:**
- Username + display name
- Bio (optional)
- Genre preferences (up to 5)
- Curation statement (500 chars)
- ⚠️ **MISSING:** Robust taste development (Step 2 above)

**Drop Creation:**
- Spotify track search
- Context (50-2000 chars required)
- Listening notes (optional, max 1000 chars)
- Genre/mood tags
- Weekly limit enforcement (10 per week)
- Platform-agnostic metadata storage
- ⚠️ **MISSING:** Multi-platform URL support

**Feed:**
- Following tab (drops from curators you follow)
- Discover tab (all drops)
- ⚠️ **MISSING:** Infinite scroll pagination (currently loads all)

**Following System:**
- Asymmetric following (Twitter-style)
- Follow/unfollow curators
- Follower/following counts
- No mutual approval needed

**Private Saves:**
- Save drops to private collection
- View saved drops at `/saved`
- Unsave anytime
- RLS enforces privacy
- ⚠️ **MISSING:** Pagination on saved page

**Curator Discovery:**
- `/discover` page
- Filter by genre
- Sort by: followers | most active | newest
- ⚠️ **ISSUE:** Genre filtering is client-side (needs DB-level filtering)

**User Profiles:**
- Public profile pages
- Curation statement display
- Taste areas (genre activity)
- All user's drops
- Follow button
- Stats: drops, followers, following

**Database & Infrastructure:**
- PostgreSQL via Supabase
- Row-Level Security
- Weekly drop limit functions
- Follower count triggers
- Save count triggers
- Genre stats table (manual population currently)

---

### 🚧 Phase 2 Features (Planned)

**Enhanced Onboarding:**
- [ ] Robust taste development questionnaire
- [ ] Curator vs. Listener choice
- [ ] Initial curator recommendations based on taste

**Feed Improvements:**
- [ ] Infinite scroll pagination
- [ ] "Load more" fallback
- [ ] Optimistic UI updates
- [ ] Real-time drop updates (optional)

**Discovery Enhancements:**
- [ ] Database-level genre filtering with proper indexing
- [ ] Taste matching algorithm
- [ ] "Recommended for you" curators
- [ ] Search curators by keyword in curation statement

**Drop Enhancements:**
- [ ] Multi-platform URL support (Apple Music, YouTube, SoundCloud)
- [ ] Edit drops after posting
- [ ] Delete drops
- [ ] Share drop (copy link)

**Analytics Dashboard (for Curators):**
- [ ] Which drops get most saves
- [ ] Follower growth over time
- [ ] Genre breakdown of followers
- [ ] Click-through rates to platforms

**Notifications:**
- [ ] Email: New follower
- [ ] Email: Weekly recap
- [ ] In-app notification center
- [ ] Push notifications (future mobile app)

**Search:**
- [ ] Search drops by track name, artist, curator
- [ ] Search curators by username, curation statement
- [ ] Advanced filters (date range, multiple genres)

**Discovery Circles (Phase 2):**
- [ ] Create circles around genres/themes
- [ ] Max 150 members per circle
- [ ] Circle-specific feeds
- [ ] Circle moderation tools
- [ ] Public vs. private circles

**Profile Enhancements:**
- [ ] Edit profile page
- [ ] Upload custom avatar
- [ ] Add social links (Instagram, Twitter, website)
- [ ] Featured drops (pin your best)

---

## Data Model Overview

### Core Tables

**profiles**
- User identity (username, display name, bio)
- Curation statement (how they curate)
- Genre preferences (up to 5 genres)
- Follower/following counts (cached via triggers)
- Total drops count (cached via triggers)
- Onboarded flag

**drops**
- Track metadata (track_id, track_name, artist_name, album_name, album_art_url)
- Platform (spotify, apple_music, youtube, soundcloud)
- Platform URLs (external_url, preview_url) ⚠️ **RECENTLY ADDED**
- Context (50-2000 chars, required)
- Listening notes (optional, max 1000 chars)
- Genres array, moods array
- Save count (internal only, never shown publicly)
- Created timestamp (for chronological sorting)

**follows**
- Asymmetric following relationships
- follower_id → following_id
- Created timestamp
- Triggers update follower_count/following_count on profiles

**drop_saves**
- Private saves (user_id + drop_id)
- Created timestamp (for "recently saved" sorting)
- RLS enforces privacy (users only see their own)
- Triggers update save_count on drops

**user_genre_stats**
- Per-user, per-genre activity tracking
- Total drops in genre
- Total saves received in genre
- Activity level (exploring/occasional/active/prolific)
- Last drop timestamp
- ⚠️ **ISSUE:** Currently manually populated, needs automation

**platform_clicks**
- Track clicks to streaming platforms
- Drop ID, user ID (nullable for anonymous)
- Platform name
- Clicked timestamp
- Used for future attribution/revenue share

---

## Technical Constraints

**Weekly Drop Limit:**
- 10 drops per week for ALL users (no premium tier yet)
- Resets every Monday 00:00 UTC
- Enforced by PostgreSQL function `get_weekly_drop_count()`
- API returns 429 when limit reached

**Context Length:**
- Minimum 50 characters (enforced at DB and API level)
- Maximum 2000 characters
- **Why:** Forces thoughtful curation, not just "great track!"

**Genre Preferences:**
- Up to 5 genres per user
- Used for discovery filtering and taste matching

**Private Saves:**
- Enforced via Row-Level Security
- Cannot be bypassed at API level
- Save counts stored but never exposed publicly

**Platform-Agnostic:**
- No Spotify OAuth required
- Uses Spotify public API for search only
- Metadata stored in DeepCuts database (not re-fetched)

---

## Key Architectural Decisions

**Why No Validation/Rating System?**
- Gamification corrupts authentic curation
- People curate for approval instead of genuine taste
- Ratings create competitive dynamics
- We want trust through alignment, not scores

**Why Weekly Limit?**
- Forces quality over quantity
- Prevents spam and low-effort posts
- Makes every drop meaningful
- Industry research: Even professional curators can't thoughtfully curate 100 tracks/week

**Why Private Saves?**
- No pressure to publicly perform taste
- Removes "social proof" bias
- Genuine saves for personal collection
- Used internally for taste matching algorithm

**Why Platform-Agnostic?**
- Not everyone uses Spotify
- Respects user privacy (no OAuth)
- Future-proof for new platforms
- Lower costs (~$50/mo vs ~$160/mo with OAuth)

**Why No Listening History Sync?**
- Privacy concerns
- Not needed for core value prop
- Listening history ≠ curation
- Just because you listen to something doesn't mean you'd recommend it

**Why Asymmetric Following?**
- Twitter-style discovery, not Facebook mutual friends
- No approval needed to follow
- Organic network growth
- Avoids "follow for follow" dynamics

---

## Success Metrics

### North Star Metric
**% of users who find at least 3 curators whose taste they trust within first 7 days**

This measures if we're solving the core problem: finding trusted tastemakers.

### Engagement Metrics
- Daily/weekly active users
- Average drops per active curator per week (target: 5-8)
- Retention: D1, D7, D30
- % of users who save at least 1 drop per week

### Content Quality Metrics
- Average context length per drop
- % of drops with listening notes
- Distribution of drops across genres (diversity indicator)

### Network Health Metrics
- Average curators followed per user (target: 5-10)
- % of users following at least 1 curator
- Follower growth rate for curators

### Platform Attribution (Future Revenue)
- Click-through rate to streaming platforms
- Conversion: drop view → platform click

---

## What We Do NOT Do

**We do not:**
- ❌ Rate or validate drops
- ❌ Show public save counts
- ❌ Create leaderboards or rankings
- ❌ Assign trust scores or reputation points
- ❌ Gamify curation
- ❌ Sync listening history from Spotify
- ❌ Require OAuth with streaming platforms
- ❌ Expire drops (they live forever)
- ❌ Allow unlimited drops (always 10/week limit)
- ❌ Show who saved your drops (private)
- ❌ Create "trending" or "popular" sections (anti-algorithmic)

---

## When to Reference This Document

**Use this document when:**
- Adding new features (does it align with philosophy?)
- Making UX decisions (what's the user flow?)
- Debugging user confusion (are we following the intended flow?)
- Onboarding new developers or AI assistants
- Deciding between implementation approaches (check principles)

**This is the source of truth for:**
- Product vision and philosophy
- Complete feature list (current and planned)
- All user flows
- What we explicitly do NOT do
- Why we made key decisions

---

**Last Updated:** 2025-11-03 by Claude Code
**Next Review:** After Phase 2 feature completion
