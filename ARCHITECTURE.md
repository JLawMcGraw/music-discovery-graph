# Signal - Architecture Design Options

## Executive Summary

This document outlines three architectural approaches for building Signal, a trust-based music discovery platform. Each option balances different priorities: speed to market, scalability, cost, and technical complexity.

---

## Core System Requirements

### Functional Requirements
- **User Profile Management**: Authentication, listening history ingestion, taste graph construction
- **Trust Graph**: Reputation scoring, taste compatibility calculations, relationship modeling
- **Music Drops**: Content creation, context storage, engagement tracking
- **Discovery Circles**: Community management (max 150 members), curated feeds, moderation
- **Recommendation Engine**: Taste matching algorithm, personalized discovery feeds
- **Streaming Platform Integration**: OAuth, play tracking, conversion attribution

### Non-Functional Requirements
- **Scale**: 100K users in Year 1, 1M+ by Year 2
- **Performance**: Taste compatibility calculations < 500ms, feed generation < 200ms
- **Availability**: 99.5% uptime for MVP, 99.9% post-launch
- **Data Integrity**: Trust scores must be immutable/auditable, listening history accurate

---

## Architecture Option 1: Monolith-First with GraphDB Core

**Philosophy**: Start simple, optimize the graph operations early

### Stack
- **Backend**: Node.js (Express/Fastify) or Python (FastAPI)
- **Database**:
  - Neo4j (graph operations: trust relationships, taste graphs)
  - PostgreSQL (user data, drops, metadata)
- **Cache**: Redis (feed caching, session management)
- **Search**: Elasticsearch (circle discovery, user search)
- **Queue**: BullMQ/Celery (async taste calculations, listening history processing)
- **Storage**: S3-compatible (user avatars, audio previews if needed)
- **Frontend**: Next.js (React) with TypeScript
- **Hosting**: Single VPS (Hetzner/DigitalOcean) → move to managed services as needed

### Architecture Diagram (Logical)
```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend                      │
│              (SSR + Client-side React)                   │
└─────────────────┬───────────────────────────────────────┘
                  │ REST/GraphQL API
┌─────────────────▼───────────────────────────────────────┐
│              API Gateway / Backend Service               │
│         (Express/FastAPI + Authentication)               │
└─────┬──────────┬──────────┬────────────┬────────────────┘
      │          │          │            │
      ▼          ▼          ▼            ▼
┌─────────┐ ┌────────┐ ┌────────┐ ┌──────────────┐
│ Neo4j   │ │Postgres│ │ Redis  │ │ Elasticsearch│
│ (Trust  │ │(Users, │ │(Cache, │ │  (Search)    │
│  Graph) │ │ Drops) │ │Session)│ │              │
└─────────┘ └────────┘ └────────┘ └──────────────┘
      │
      ▼
┌─────────────────────────────┐
│   Background Job Queue      │
│  (Taste calc, DSP sync)     │
└─────────────────────────────┘
```

### Key Design Decisions

#### 1. Trust Graph Storage (Neo4j)
```cypher
// Node types
(:User {id, username, trust_score, created_at})
(:Genre {name, parent_genre})
(:Drop {id, track_id, context, reputation_stake})
(:Circle {id, name, member_count, focus_area})

// Relationship examples
(user:User)-[:TRUSTS {score: 0.85, since: timestamp}]->(curator:User)
(user:User)-[:EXPERTISE_IN {confidence: 0.92, listening_hours: 450}]->(genre:Genre)
(user:User)-[:MEMBER_OF {joined: timestamp, contribution_score: 78}]->(circle:Circle)
(drop:Drop)-[:RECOMMENDED_BY {stake: 50}]->(user:User)
(drop:Drop)-[:VALIDATED_BY {rating: 4.5}]->(validator:User)
```

**Why Neo4j?**
- Native graph traversal for "find users similar to me who like X genre"
- Built-in algorithms for community detection, centrality (finding top curators)
- Taste compatibility = graph distance + weighted edge traversal

#### 2. Taste Compatibility Algorithm
Hybrid approach combining:
- **Graph Distance**: Shortest path through trust relationships
- **Embedding Similarity**: Vector representation of listening history (using collaborative filtering)
- **Genre Overlap**: Jaccard similarity on genre expertise

```python
def calculate_compatibility(user_a, user_b):
    # Component 1: Trust path strength (Neo4j)
    trust_path_score = neo4j.run_shortest_path_weighted(user_a, user_b)

    # Component 2: Taste vector similarity (pre-computed embeddings)
    embedding_similarity = cosine_similarity(
        user_a.taste_embedding,
        user_b.taste_embedding
    )

    # Component 3: Genre expertise overlap
    genre_overlap = jaccard_index(
        user_a.genre_expertise,
        user_b.genre_expertise
    )

    # Weighted combination
    return (0.4 * trust_path_score +
            0.4 * embedding_similarity +
            0.2 * genre_overlap)
```

#### 3. Reputation System
Stakes-based with decay:
```javascript
// When user makes a drop
const drop = {
  track_id: "spotify:track:xyz",
  context: "This changed how I hear drums...",
  reputation_stake: 50, // User risks 50 points
  decay_start: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
}

// When others validate
// Positive: user gets stake back + bonus
// Negative: loses stake, trust score drops
// No engagement: stake slowly decays over 30 days
```

### Pros
- ✅ Fast initial development (monolith = fewer moving parts)
- ✅ Graph database optimized for core use case
- ✅ Can run on single beefy server initially ($50-100/month)
- ✅ Easy to reason about data flow and debug

### Cons
- ❌ Neo4j learning curve for team
- ❌ Dual database management (Neo4j + Postgres)
- ❌ Vertical scaling limits (need to plan migration path)
- ❌ Complex backup/disaster recovery with multiple DBs

### Cost Estimate (Monthly, Year 1)
- Hosting: $80 (VPS with 16GB RAM, 4 CPU)
- Neo4j Aura (managed): $150 (or self-hosted: $0)
- Postgres (managed): $50
- Redis: $20
- Elasticsearch: $50 (or use Algolia: $100)
- CDN/Storage: $30
- **Total: $230-380/month**

---

## Architecture Option 2: Serverless-First with Postgres + pgvector

**Philosophy**: Minimize ops, maximize flexibility, use SQL for everything

### Stack
- **Backend**: Next.js API routes (serverless) or Supabase backend
- **Database**: PostgreSQL with extensions:
  - `pgvector` for taste embeddings
  - `pg_graph` or recursive CTEs for graph queries
  - Native JSON columns for flexible schemas
- **Auth**: Supabase Auth or NextAuth
- **Realtime**: Supabase Realtime or Pusher
- **Storage**: Supabase Storage or Cloudflare R2
- **Search**: Postgres full-text search + `pgvector` similarity
- **Queue**: Inngest or QStash for background jobs
- **Frontend**: Next.js 14+ (App Router)
- **Hosting**: Vercel (frontend) + Supabase (backend)

### Architecture Diagram
```
┌──────────────────────────────────────────────────┐
│         Next.js 14 (Vercel Edge)                 │
│    API Routes + Server Components + RSC          │
└────────────┬─────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────┐
│           Supabase Platform                     │
│  ┌─────────────────────────────────────┐      │
│  │  PostgreSQL 15+ with Extensions      │      │
│  │  - pgvector (embeddings)             │      │
│  │  - pg_partman (listening history)    │      │
│  │  - pg_cron (reputation decay)        │      │
│  └─────────────────────────────────────┘      │
│                                                 │
│  ┌─────────────┐  ┌──────────────┐            │
│  │ Supabase    │  │  Supabase    │            │
│  │   Auth      │  │  Storage     │            │
│  └─────────────┘  └──────────────┘            │
└────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────┐
│   Inngest (Background Jobs)    │
│   - Taste recalculation        │
│   - Spotify sync               │
└────────────────────────────────┘
```

### Key Design Decisions

#### 1. Graph Modeling in Postgres
```sql
-- Trust relationships as adjacency list
CREATE TABLE trust_relationships (
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  trust_score DECIMAL(3,2) CHECK (trust_score BETWEEN 0 AND 1),
  created_at TIMESTAMP DEFAULT NOW(),
  last_validated TIMESTAMP,
  PRIMARY KEY (from_user_id, to_user_id)
);

CREATE INDEX idx_trust_from ON trust_relationships(from_user_id);
CREATE INDEX idx_trust_to ON trust_relationships(to_user_id);

-- Recursive CTE for graph traversal (find similar users)
WITH RECURSIVE trust_network AS (
  -- Base case: direct trust connections
  SELECT to_user_id, trust_score, 1 as depth
  FROM trust_relationships
  WHERE from_user_id = $1

  UNION

  -- Recursive case: friends of friends (max 3 hops)
  SELECT tr.to_user_id, tr.trust_score * tn.trust_score, tn.depth + 1
  FROM trust_relationships tr
  JOIN trust_network tn ON tr.from_user_id = tn.to_user_id
  WHERE tn.depth < 3
)
SELECT to_user_id, MAX(trust_score) as max_trust_path
FROM trust_network
GROUP BY to_user_id
ORDER BY max_trust_path DESC
LIMIT 50;
```

#### 2. Taste Embeddings with pgvector
```sql
CREATE EXTENSION vector;

CREATE TABLE user_taste_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  taste_vector vector(384), -- Embedding dimension
  genres_expertise JSONB, -- {genre: confidence_score}
  last_calculated TIMESTAMP,
  listening_hours INTEGER
);

CREATE INDEX ON user_taste_profiles
USING ivfflat (taste_vector vector_cosine_ops)
WITH (lists = 100);

-- Find similar taste profiles
SELECT user_id,
       1 - (taste_vector <=> $1) as similarity
FROM user_taste_profiles
WHERE user_id != $2
ORDER BY taste_vector <=> $1
LIMIT 20;
```

#### 3. Listening History Partitioning
```sql
-- Partition by month for efficient queries and archival
CREATE TABLE listening_history (
  id BIGSERIAL,
  user_id UUID NOT NULL,
  track_id VARCHAR(255) NOT NULL,
  played_at TIMESTAMP NOT NULL,
  duration_ms INTEGER,
  context JSONB, -- playlist, album, or discovery source
  PRIMARY KEY (id, played_at)
) PARTITION BY RANGE (played_at);

-- Auto-create monthly partitions
CREATE TABLE listening_history_2024_10
PARTITION OF listening_history
FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
```

#### 4. Discovery Circles Schema
```sql
CREATE TABLE circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  focus_genres JSONB, -- Tags for discovery
  member_count INTEGER DEFAULT 0 CHECK (member_count <= 150),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE circle_memberships (
  circle_id UUID REFERENCES circles(id),
  user_id UUID REFERENCES users(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  contribution_score INTEGER DEFAULT 0,
  role VARCHAR(20) DEFAULT 'member', -- member, moderator, creator
  PRIMARY KEY (circle_id, user_id)
);

-- Prevent joining when circle is full
CREATE OR REPLACE FUNCTION check_circle_capacity()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT member_count FROM circles WHERE id = NEW.circle_id) >= 150 THEN
    RAISE EXCEPTION 'Circle is at maximum capacity (150 members)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_circle_limit
BEFORE INSERT ON circle_memberships
FOR EACH ROW EXECUTE FUNCTION check_circle_capacity();
```

### Pros
- ✅ Zero ops for database (Supabase manages everything)
- ✅ Automatic scaling (serverless functions + connection pooling)
- ✅ Unified database (simpler backups, ACID guarantees)
- ✅ Fast development with Supabase SDK + generated types
- ✅ Row-level security for multi-tenant data
- ✅ Lower initial costs (pay-per-use)

### Cons
- ❌ Postgres graph queries less elegant than Neo4j
- ❌ Vector search not as mature as specialized solutions
- ❌ Cold starts on serverless functions
- ❌ Vendor lock-in to Vercel/Supabase ecosystem
- ❌ Complex graph queries may hit performance limits at scale

### Cost Estimate (Monthly, Year 1)
- Vercel Pro: $20
- Supabase Pro: $25 (includes 8GB DB, 100GB bandwidth)
- Inngest: $30 (background jobs)
- CDN: $10
- **Total: $85/month** (scales automatically with usage)

---

## Architecture Option 3: Hybrid Microservices with Specialized Databases

**Philosophy**: Build for scale from day one, separate concerns, best tool for each job

### Stack
- **API Gateway**: Kong or AWS API Gateway
- **Services**:
  - **User Service**: Node.js/Go + PostgreSQL (profiles, auth)
  - **Trust Graph Service**: Python + Neo4j (relationships, scoring)
  - **Music Service**: Node.js + MongoDB (drops, metadata, comments)
  - **Discovery Service**: Python + Elasticsearch (circle search, recommendations)
  - **Ingestion Service**: Python + Kafka (streaming platform events)
- **Message Broker**: Kafka or RabbitMQ
- **Cache**: Redis (distributed caching)
- **Search**: Elasticsearch
- **ML Pipeline**: Python (scikit-learn/TensorFlow) for taste embeddings
- **Frontend**: Next.js
- **Orchestration**: Kubernetes or Docker Swarm
- **Hosting**: AWS/GCP/Hetzner Cloud

### Architecture Diagram
```
                    ┌─────────────────┐
                    │  Next.js Client │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  API Gateway    │
                    │  (Kong/NGINX)   │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼─────┐      ┌─────▼──────┐     ┌─────▼────────┐
    │  User    │      │   Trust    │     │   Music      │
    │ Service  │      │   Graph    │     │  Service     │
    │          │      │  Service   │     │              │
    │(Node.js) │      │ (Python)   │     │  (Node.js)   │
    └────┬─────┘      └─────┬──────┘     └─────┬────────┘
         │                  │                   │
    ┌────▼─────┐      ┌─────▼──────┐     ┌─────▼────────┐
    │PostgreSQL│      │   Neo4j    │     │  MongoDB     │
    └──────────┘      └────────────┘     └──────────────┘
         │                                      │
         └──────────────┬───────────────────────┘
                        │
                  ┌─────▼──────┐
                  │   Kafka    │
                  │  (Events)  │
                  └─────┬──────┘
                        │
              ┌─────────┴──────────┐
              │                    │
        ┌─────▼────────┐    ┌─────▼────────┐
        │  Discovery   │    │  Ingestion   │
        │   Service    │    │   Service    │
        │              │    │              │
        │(Python + ES) │    │  (Python)    │
        └──────────────┘    └──────────────┘
```

### Key Design Decisions

#### 1. Service Boundaries
- **User Service**: Authentication, profile CRUD, reputation ledger
- **Trust Graph Service**: All graph operations, compatibility scoring
- **Music Service**: Drops, comments, circle feeds, content moderation
- **Discovery Service**: Recommendation generation, personalized feeds, search
- **Ingestion Service**: Spotify/Apple Music webhooks, listening history processing

#### 2. Event-Driven Communication
```javascript
// Example: User makes a drop
// Music Service publishes event
kafka.publish('music.drop.created', {
  user_id: 'uuid',
  drop_id: 'uuid',
  track_id: 'spotify:track:xyz',
  reputation_stake: 50,
  timestamp: Date.now()
});

// Consumers:
// - Trust Graph Service: Updates user's contribution score
// - Discovery Service: Adds to relevant circle feeds
// - Ingestion Service: Enriches with track metadata from Spotify
```

#### 3. Data Consistency Strategy
- **User reputation**: Event sourcing (immutable ledger of all reputation changes)
- **Circle membership**: Strong consistency (Postgres transactions)
- **Feed generation**: Eventual consistency (acceptable to have 1-2s delay)
- **Taste profiles**: Recalculated nightly (batch job)

### Pros
- ✅ Each service can scale independently
- ✅ Best database for each use case
- ✅ Team can work on services independently
- ✅ Failure isolation (one service down ≠ whole system down)
- ✅ Technology flexibility per service

### Cons
- ❌ High operational complexity (multiple databases, services, message broker)
- ❌ Distributed system challenges (network latency, partial failures)
- ❌ Slower initial development (more boilerplate)
- ❌ Requires DevOps expertise from day one
- ❌ Higher baseline costs

### Cost Estimate (Monthly, Year 1)
- Kubernetes cluster (3 nodes): $150
- Managed PostgreSQL: $50
- Neo4j Aura: $150
- MongoDB Atlas: $60
- Kafka (Confluent Cloud): $100
- Elasticsearch: $80
- Redis: $30
- Load balancer/Gateway: $20
- Monitoring (Datadog/Grafana): $50
- **Total: $690/month**

---

## Recommendation Matrix

| Criterion | Option 1: Monolith+Neo4j | Option 2: Serverless+Postgres | Option 3: Microservices |
|-----------|-------------------------|------------------------------|------------------------|
| Time to MVP | 6-8 weeks | 4-6 weeks | 12-16 weeks |
| Team Size Required | 2-3 engineers | 1-2 engineers | 4-6 engineers |
| Monthly Cost (Year 1) | $230-380 | $85+ (usage-based) | $690+ |
| Scaling Ceiling | ~500K users | ~1M users (with tuning) | 10M+ users |
| Graph Query Performance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Operational Complexity | Medium | Low | High |
| Best For | Startup proving concept, graph-first product | Solo/small team, rapid iteration | Well-funded startup, growth-stage |

---

## Recommended Path: **Option 2 (Serverless+Postgres) for MVP → Option 1 for Growth**

### Phase 1: MVP (Months 0-6)
Use **Option 2** (Serverless+Postgres):
- Ship fastest with Supabase + Next.js
- Validate product-market fit
- Postgres can handle graph operations for first 50K users
- Keep costs low during customer discovery

### Phase 2: Growth (Months 6-18)
Migrate critical paths to **Option 1**:
- Introduce Neo4j for trust graph (keep Postgres for transactional data)
- Move to dedicated servers for predictable costs
- Optimize taste compatibility algorithm with graph database

### Phase 3: Scale (Months 18+)
Evolve toward **Option 3** if needed:
- Extract high-load services (recommendation engine, ingestion)
- Keep monolith for stable features
- Adopt event-driven architecture incrementally

---

## Critical Technical Decisions Regardless of Architecture

### 1. Streaming Platform Integration Strategy
**Challenge**: Each platform (Spotify, Apple Music, Tidal) has different APIs and auth flows.

**Recommendation**: Adapter pattern with unified internal schema
```javascript
// Abstract interface
interface MusicPlatformAdapter {
  authenticate(userId: string): Promise<AuthToken>;
  getListeningHistory(userId: string, since: Date): Promise<Track[]>;
  getTrackMetadata(trackId: string): Promise<TrackMetadata>;
}

// Implementations
class SpotifyAdapter implements MusicPlatformAdapter { ... }
class AppleMusicAdapter implements MusicPlatformAdapter { ... }
```

### 2. Reputation & Trust Score Algorithm
**Proposal**: Combine multiple signals with decay

```python
def calculate_trust_score(user):
    # Base score from account age and activity
    base_score = min(100, (days_active / 30) * 10)

    # Positive: successful drops (validated by community)
    successful_drops_bonus = sum(
        drop.reputation_stake * drop.validation_score
        for drop in user.drops
    )

    # Negative: bad recommendations
    penalty = sum(
        drop.reputation_stake
        for drop in user.drops
        if drop.validation_score < 0.3
    )

    # Decay for inactivity
    inactivity_decay = 0.95 ** (days_since_last_drop / 7)

    return max(0, (base_score + successful_drops_bonus - penalty) * inactivity_decay)
```

### 3. Privacy & Data Handling
- **Listening History**: Users opt-in, control granularity (public, circles-only, private)
- **Trust Graph**: Anonymous by default (can see "trusted by 47 people" not who)
- **GDPR Compliance**: Export, delete, and anonymize on request
- **Data Retention**: Aggregate listening data after 90 days, purge raw data

### 4. Anti-Gaming Mechanisms
- **Sybil Resistance**: Phone verification, paid accounts have higher initial trust
- **Collusion Detection**: Detect circular trust patterns, abnormal validation rates
- **Content Authenticity**: Rate limiting on drops (5/day), stake minimum increases with failed drops

---

## Next Steps

1. **Choose architecture** based on team size, timeline, and funding
2. **Set up development environment** (repo structure, CI/CD)
3. **Design database schema** in detail (ERD for chosen option)
4. **Build proof-of-concept** for taste compatibility algorithm
5. **Create API specification** (OpenAPI/GraphQL schema)
6. **Develop authentication flow** with Spotify OAuth
7. **Build minimal UI** for profile, drop creation, and circle browsing

Would you like me to proceed with detailed implementation for any specific architecture option?
