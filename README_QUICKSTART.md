# DeepCuts - Quick Start Guide

This guide will get you up and running with DeepCuts locally in ~10 minutes.

## Prerequisites

- **Node.js 18+** ([download](https://nodejs.org/))
- **Spotify Developer Account** (free - for track search API)

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Get Spotify Credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in or create account
3. Click "Create App"
4. Fill in:
   - **App Name**: DeepCuts Local
   - **App Description**: Music curation platform
   - **Website**: http://localhost:3000
   - **Redirect URI**: http://localhost:3000 (not used but required)
5. Click "Save"
6. Click "Settings" → copy **Client ID** and **Client Secret**

### 3. Configure Environment

Create `.env.local` in project root:

```env
# Spotify API (for track search)
SPOTIFY_CLIENT_ID=paste-your-client-id-here
SPOTIFY_CLIENT_SECRET=paste-your-client-secret-here

# Supabase (will be filled after next step)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=will-be-filled-next

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Start Supabase

```bash
supabase start
```

**First time?** This will download Docker images (~5 minutes).

**Expected output:**
```
Started supabase local development setup.

         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**→ Copy the `anon key` to your `.env.local` file as `NEXT_PUBLIC_SUPABASE_ANON_KEY`**

**→ Keep this terminal window open!** Supabase needs to stay running.

### 5. Run Database Migration

Open a **new terminal window** in the project directory:

```bash
supabase db push
```

This creates all database tables:
- User profiles with curation statements
- Drops (music recommendations)
- Following relationships
- Private saves
- Genre activity stats

### 6. Generate TypeScript Types

```bash
npm run db:types
```

### 7. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser!

---

## First-Time User Flow

### 1. Sign Up

1. Go to http://localhost:3000
2. Click "Sign In" → "Sign Up"
3. Enter email and password
4. Sign up

### 2. Complete Onboarding (4 Steps)

**Step 1: Username**
- Choose a unique username (e.g., `jazzlover42`)
- Add optional display name

**Step 2: Bio**
- Write a short bio about your music taste (optional)

**Step 3: Genres**
- Select up to 5 genres you're passionate about
- This helps others discover you

**Step 4: Curation Statement**
- Explain how you curate music (optional but recommended)
- Examples:
  - "I dig for rare soul and funk 45s from regional labels"
  - "Contemporary classical that pushes boundaries"
  - "90s hip hop deep cuts and forgotten producers"

Click "Complete Setup" → You'll land on the feed page!

### 3. Create Your First Drop

1. Click "Create Drop" button
2. **Search for a track** (try "Blue Train John Coltrane")
3. **Write context** (minimum 50 characters):
   ```
   This is Coltrane's breakthrough moment where he found his signature sound.
   The title track showcases the modal exploration that defined his later work.
   ```
4. **Optional**: Add listening notes, genres, moods
5. Click "Share Drop"

**Note:** You can post up to 10 drops per week (resets every Monday).

### 4. Follow Other Curators

1. Click "Discover" in navigation
2. **To see other curators:** You'll need to create a second user account
   - Open an **incognito/private browser window**
   - Go to http://localhost:3000
   - Sign up as a different user
   - Complete onboarding with different curation statement
   - Create a few drops
3. **Back to your first user:**
   - Refresh `/discover` page
   - You should see the second user
   - Click "Follow" button
4. Go to "Feed" → "Following" tab
   - See drops only from people you follow

### 5. Save Drops You Love

1. On any drop (that's not yours), click "Save" button
2. Click "Saved" in navigation
3. See all your saved drops (private - only you can see)

---

## Testing the Weekly Limit

**Default: 10 drops per week (resets Monday 00:00 UTC)**

1. Create 10 drops
2. Try to create an 11th drop
3. **Expected:** See "Weekly Limit Reached" message
4. **To reset manually** (for testing):
   ```bash
   # Reset Supabase database (clears all data)
   supabase db reset

   # Then migrate again
   supabase db push
   ```

---

## Explore Features

### Feed Page (`/feed`)
- **Discover tab**: All drops from all users
- **Following tab**: Drops only from people you follow
- Toggle between tabs

### Discover Page (`/discover`)
- Browse curators by genre
- Filter dropdown (select genre)
- Sort by: Followers / Most Active / Newest
- One-click follow buttons

### Profile Page (`/profile/username`)
- View curation statement
- See taste areas (genres they're active in)
- Stats: drops, followers, following
- Follow/Unfollow button (if not your profile)
- View all their drops

### Saved Page (`/saved`)
- Your private collection of saved drops
- Accessible only to you

### Drop Creation (`/drop/create`)
- Weekly counter (X/10)
- Reset timer shown
- Track search
- Context writing (required, 50-2000 chars)

---

## Supabase Studio (Database UI)

Open http://localhost:54323 to explore your database:

1. **Table Editor** → View/edit data:
   - `profiles` - user accounts
   - `drops` - all music drops
   - `follows` - who follows whom
   - `drop_saves` - saved drops
   - `user_genre_stats` - activity per genre

2. **SQL Editor** → Run custom queries:
   ```sql
   -- See all drops
   SELECT * FROM drops ORDER BY created_at DESC;

   -- Check weekly drop count
   SELECT get_weekly_drop_count('your-user-id-here');

   -- See follows
   SELECT * FROM follows;
   ```

---

## Troubleshooting

### "supabase: command not found"

**Install Supabase CLI:**
```bash
npm install -g supabase
```

Or on Windows with Scoop:
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### "Migration failed"

**Reset and try again:**
```bash
supabase db reset
supabase db push
```

### "Network error" when creating drops

- Check Spotify credentials in `.env.local`
- Verify Supabase is running: `supabase status`
- Check browser console for error details

### TypeScript errors in editor

```bash
npm run db:types
```
Then restart your IDE.

### Port already in use

**Kill existing processes:**
```bash
# Stop Supabase
supabase stop

# Then start again
supabase start
```

---

## Quick Command Reference

```bash
# Start Supabase (required)
supabase start

# Start development server (in new terminal)
npm run dev

# View Supabase status
supabase status

# Stop Supabase
supabase stop

# Reset database (clean slate)
supabase db reset

# Apply migrations
supabase db push

# Generate TypeScript types
npm run db:types

# Open Supabase Studio
# → http://localhost:54323
```

---

## What's Different from Validation Model?

This version removes all gamification:

**Removed:**
- ❌ Validation/rating system (no 1-5 star votes)
- ❌ Reputation stakes (no points at risk)
- ❌ Trust scores (no competitive metrics)
- ❌ Drop expiration (drops live forever)
- ❌ Leaderboards

**Added:**
- ✅ Weekly drop limit (10 per week)
- ✅ Following system (Twitter-style)
- ✅ Private saves (no public metrics)
- ✅ Curation statements
- ✅ Discover page with filters
- ✅ Taste areas per genre

**Philosophy:**
- **Old**: "Stake reputation → get validated → earn/lose points"
- **New**: "Share your taste → build following → organic discovery"

---

## Next Steps

1. **Create multiple test users** to test following
2. **Test weekly limit** (create 10 drops, verify block at 11)
3. **Try all features** (follow, save, discover)
4. **Deploy to production** (see main README)

**Ready to deploy?** See [README.md](./README.md) for production deployment instructions.

---

## Need Help?

- Check [README.md](./README.md) for full documentation
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Open an issue on GitHub for bugs/questions
