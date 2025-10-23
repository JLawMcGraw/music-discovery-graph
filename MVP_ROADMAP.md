# Signal MVP - Where to Start

## The Critical Question

Before writing any code, we need to validate: **Will people actually stake reputation on music recommendations?**

Everything else (circles, advanced matching, premium features) is pointless if this core mechanic doesn't work.

---

## Week 1-2: Foundation + Spotify Integration

### Why Start Here?
Signal's authenticity depends on **real listening history**. Without it, it's just another link-sharing site. Spotify integration proves we can build the trust graph from actual data.

### Tasks

#### 1. Project Setup (Day 1)
```bash
# Initialize Next.js 14 with TypeScript
npx create-next-app@latest signal-mvp --typescript --tailwind --app

# Add Supabase
npx supabase init
npx supabase start

# Core dependencies
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install spotify-web-api-node
npm install date-fns zod
```

**Deliverable**: Running Next.js app with Supabase connected

---

#### 2. Spotify OAuth Flow (Days 2-3)

**File: `app/api/auth/spotify/route.ts`**
```typescript
// Initiate Spotify authorization
export async function GET() {
  const scopes = [
    'user-read-recently-played',
    'user-top-read',
    'user-read-email'
  ];

  const authUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    scope: scopes.join(' ')
  })}`;

  return Response.redirect(authUrl);
}
```

**File: `app/api/auth/spotify/callback/route.ts`**
```typescript
// Handle callback and store tokens
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  // Exchange code for access token
  const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code!,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
      client_id: process.env.SPOTIFY_CLIENT_ID!,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET!
    })
  });

  const tokens = await tokenResponse.json();

  // Store in Supabase
  const supabase = createRouteHandlerClient({ cookies });
  await supabase.from('spotify_connections').insert({
    user_id: (await supabase.auth.getUser()).data.user?.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000)
  });

  return Response.redirect('/dashboard');
}
```

**Deliverable**: Users can connect Spotify and we store their tokens

---

#### 3. Listening History Sync (Days 4-5)

**Database Schema**:
```sql
-- migrations/001_initial_schema.sql

-- Users table (Supabase Auth handles this)

-- Spotify connections
CREATE TABLE spotify_connections (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  last_synced TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Listening history (partitioned by month)
CREATE TABLE listening_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  track_id VARCHAR(255) NOT NULL,
  track_name VARCHAR(500),
  artist_name VARCHAR(500),
  played_at TIMESTAMP NOT NULL,
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_listening_user_date ON listening_history(user_id, played_at DESC);
CREATE INDEX idx_listening_track ON listening_history(track_id);

-- Enable Row Level Security
ALTER TABLE spotify_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own spotify connection" ON spotify_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own listening history" ON listening_history
  FOR SELECT USING (auth.uid() = user_id);
```

**File: `lib/spotify-sync.ts`**
```typescript
import SpotifyWebApi from 'spotify-web-api-node';

export async function syncRecentlyPlayed(userId: string) {
  const supabase = createClient();

  // Get user's tokens
  const { data: connection } = await supabase
    .from('spotify_connections')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!connection) throw new Error('No Spotify connection');

  // Initialize Spotify API
  const spotify = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    accessToken: connection.access_token
  });

  // Fetch recently played (last 50 tracks)
  const recentTracks = await spotify.getMyRecentlyPlayedTracks({ limit: 50 });

  // Insert into database
  const historyRecords = recentTracks.body.items.map(item => ({
    user_id: userId,
    track_id: item.track.id,
    track_name: item.track.name,
    artist_name: item.track.artists[0].name,
    played_at: item.played_at,
    duration_ms: item.track.duration_ms
  }));

  await supabase.from('listening_history').upsert(historyRecords, {
    onConflict: 'user_id,track_id,played_at',
    ignoreDuplicates: true
  });

  // Update last_synced
  await supabase
    .from('spotify_connections')
    .update({ last_synced: new Date() })
    .eq('user_id', userId);

  return historyRecords.length;
}
```

**Deliverable**: Background job that syncs Spotify listening history every hour

---

## Week 3: The Core Mechanic - Drops with Reputation Stakes

### Why This Next?
This is the innovation. If this doesn't resonate, nothing else matters.

### Tasks

#### 4. User Profiles & Reputation System (Days 6-7)

**Database Schema**:
```sql
-- User profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  trust_score INTEGER DEFAULT 100,
  reputation_available INTEGER DEFAULT 100, -- Points they can stake
  total_drops INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reputation ledger (immutable event log)
CREATE TABLE reputation_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  event_type VARCHAR(50) NOT NULL, -- 'drop_created', 'drop_validated', 'drop_failed'
  points_change INTEGER NOT NULL, -- Positive or negative
  related_drop_id UUID, -- References drops table
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reputation_user ON reputation_events(user_id, created_at DESC);

-- Function to update trust score
CREATE OR REPLACE FUNCTION update_trust_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET
    trust_score = trust_score + NEW.points_change,
    reputation_available = CASE
      WHEN NEW.event_type = 'drop_created' THEN reputation_available - (NEW.metadata->>'stake')::INTEGER
      WHEN NEW.event_type = 'drop_validated' THEN reputation_available + (NEW.metadata->>'stake')::INTEGER
      ELSE reputation_available
    END
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reputation_update_trigger
AFTER INSERT ON reputation_events
FOR EACH ROW EXECUTE FUNCTION update_trust_score();
```

---

#### 5. The Drop Mechanism (Days 8-10)

**Database Schema**:
```sql
CREATE TABLE drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  track_id VARCHAR(255) NOT NULL,
  track_name VARCHAR(500) NOT NULL,
  artist_name VARCHAR(500) NOT NULL,

  -- The core innovation
  context TEXT NOT NULL, -- Why this track matters
  listening_notes TEXT, -- What to listen for
  reputation_stake INTEGER NOT NULL CHECK (reputation_stake >= 10 AND reputation_stake <= 100),

  -- Validation tracking
  validation_score DECIMAL(3,2) DEFAULT 0, -- 0.0 to 1.0
  validation_count INTEGER DEFAULT 0,

  -- Lifecycle
  status VARCHAR(20) DEFAULT 'active', -- active, validated, failed
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_drops_user ON drops(user_id, created_at DESC);
CREATE INDEX idx_drops_active ON drops(status, created_at DESC) WHERE status = 'active';

-- Drop validations (others rating the drop)
CREATE TABLE drop_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id UUID REFERENCES drops(id),
  validator_id UUID REFERENCES auth.users(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5), -- 1 = bad rec, 5 = amazing
  listened BOOLEAN DEFAULT false, -- Did they actually listen?
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(drop_id, validator_id)
);

CREATE INDEX idx_validations_drop ON drop_validations(drop_id);
```

**File: `app/api/drops/create/route.ts`**
```typescript
export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  const { track_id, context, listening_notes, reputation_stake } = await request.json();

  // Validate user has enough reputation
  const { data: profile } = await supabase
    .from('profiles')
    .select('reputation_available')
    .eq('id', user!.id)
    .single();

  if (profile.reputation_available < reputation_stake) {
    return Response.json({ error: 'Insufficient reputation' }, { status: 400 });
  }

  // Get track metadata from Spotify
  const trackMeta = await fetchSpotifyTrack(track_id);

  // Create drop
  const { data: drop } = await supabase
    .from('drops')
    .insert({
      user_id: user!.id,
      track_id,
      track_name: trackMeta.name,
      artist_name: trackMeta.artists[0].name,
      context,
      listening_notes,
      reputation_stake
    })
    .select()
    .single();

  // Record reputation event
  await supabase.from('reputation_events').insert({
    user_id: user!.id,
    event_type: 'drop_created',
    points_change: 0, // No change yet, just staking
    related_drop_id: drop.id,
    metadata: { stake: reputation_stake }
  });

  return Response.json({ drop });
}
```

**Deliverable**: Users can stake reputation on track recommendations

---

#### 6. Validation Feed & Resolution (Days 11-12)

**File: `app/feed/page.tsx`**
```typescript
export default async function FeedPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: drops } = await supabase
    .from('drops')
    .select(`
      *,
      profiles:user_id (username, avatar_url, trust_score),
      drop_validations (rating, validator_id)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div>
      {drops.map(drop => (
        <DropCard key={drop.id} drop={drop} />
      ))}
    </div>
  );
}
```

**File: `components/DropCard.tsx`**
```typescript
'use client';

export function DropCard({ drop }) {
  const [rating, setRating] = useState(0);

  async function submitValidation() {
    await fetch('/api/drops/validate', {
      method: 'POST',
      body: JSON.stringify({
        drop_id: drop.id,
        rating,
        listened: true
      })
    });
  }

  return (
    <div className="border rounded-lg p-6">
      {/* Track info */}
      <div className="flex gap-4">
        <img src={drop.album_art} className="w-20 h-20" />
        <div>
          <h3>{drop.track_name}</h3>
          <p>{drop.artist_name}</p>
        </div>
      </div>

      {/* The context - the innovation */}
      <div className="mt-4">
        <h4>Why this matters:</h4>
        <p>{drop.context}</p>

        {drop.listening_notes && (
          <>
            <h4>What to listen for:</h4>
            <p>{drop.listening_notes}</p>
          </>
        )}
      </div>

      {/* Stakes */}
      <div className="mt-4 flex items-center gap-2">
        <span className="text-sm text-gray-500">
          {drop.profiles.username} staked {drop.reputation_stake} points
        </span>
        <span className="text-xs">
          Trust: {drop.profiles.trust_score}
        </span>
      </div>

      {/* Validation */}
      <div className="mt-4">
        <p>Rate this recommendation:</p>
        <StarRating value={rating} onChange={setRating} />
        <button onClick={submitValidation}>Submit</button>
      </div>
    </div>
  );
}
```

**File: `lib/cron/resolve-drops.ts`**
```typescript
// Run daily to resolve expired drops
export async function resolveExpiredDrops() {
  const supabase = createClient();

  const { data: expiredDrops } = await supabase
    .from('drops')
    .select(`
      id,
      user_id,
      reputation_stake,
      drop_validations (rating)
    `)
    .eq('status', 'active')
    .lt('expires_at', new Date())
    .gte('validation_count', 3); // Min 3 validations required

  for (const drop of expiredDrops) {
    // Calculate average rating
    const avgRating = drop.drop_validations.reduce((sum, v) => sum + v.rating, 0) / drop.drop_validations.length;
    const validationScore = avgRating / 5; // Normalize to 0-1

    // Determine outcome
    let pointsChange = 0;
    let status = 'validated';

    if (validationScore >= 0.7) {
      // Great recommendation - return stake + bonus
      pointsChange = drop.reputation_stake + Math.floor(drop.reputation_stake * 0.5);
      status = 'validated';
    } else if (validationScore >= 0.4) {
      // Okay recommendation - return stake
      pointsChange = drop.reputation_stake;
      status = 'validated';
    } else {
      // Bad recommendation - lose stake
      pointsChange = -drop.reputation_stake;
      status = 'failed';
    }

    // Update drop
    await supabase
      .from('drops')
      .update({ status, validation_score: validationScore })
      .eq('id', drop.id);

    // Record reputation event
    await supabase.from('reputation_events').insert({
      user_id: drop.user_id,
      event_type: status === 'failed' ? 'drop_failed' : 'drop_validated',
      points_change: pointsChange,
      related_drop_id: drop.id,
      metadata: {
        stake: drop.reputation_stake,
        validation_score: validationScore,
        validator_count: drop.drop_validations.length
      }
    });
  }
}
```

**Deliverable**: Complete feedback loop - drops get validated, reputation changes based on community response

---

## Week 4: Polish & User Testing

#### 7. Basic UI/UX (Days 13-14)
- Onboarding flow: "Connect Spotify → See your top genres → Make your first drop"
- Profile pages showing trust score history
- Simple feed with filtering (by genre, by trust score)

#### 8. Deploy & Test (Day 15)
- Deploy to Vercel
- Invite 20 music-obsessed friends
- Watch behavior: Are they staking real reputation? Are validations honest?

---

## Success Metrics for MVP

After 2 weeks with 20 users:

**Primary**:
- **Drop Rate**: Do users make at least 2 drops/week?
- **Stake Meaningfulness**: Are users risking 30+ points (shows they care)?
- **Validation Honesty**: Do validation scores vary (or is everyone giving 5 stars)?

**Secondary**:
- Time spent reading context vs just clicking through
- Trust score distribution (are high-trust users emerging?)
- Return rate (do they come back after first drop?)

---

## What We're NOT Building in MVP

❌ Discovery Circles (comes after we prove drops work)
❌ Advanced taste matching (start with simple genre tags)
❌ Premium features (free for everyone in testing)
❌ Multiple streaming platforms (Spotify only)
❌ Mobile app (responsive web only)
❌ Social features (follows, DMs, etc.)

---

## Why This Order?

1. **Spotify integration first** = Proves we can access the data that makes this authentic
2. **Drops + stakes second** = Validates the core mechanic
3. **Validation + resolution third** = Completes the feedback loop
4. **No circles yet** = Don't build community features until we know people care about drops

If drops don't create engagement, circles won't save it. If they do, we've validated the foundation and can build circles, taste matching, and premium features on solid ground.

---

## My Recommendation: Start NOW

Would you like me to:
1. **Initialize the Next.js + Supabase project structure**
2. **Implement Spotify OAuth flow**
3. **Design the complete database schema**
4. **Something else?**

The fastest path to validation is getting Spotify connected and drops live. Let's build.
