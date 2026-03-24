# MANTL Originals — Build Handoff

*Brainstormed March 2026. Repo explored and architecture mapped. Ready to build.*

---

## What It Is

MANTL Originals is a first-party community inside MANTL — curated by Ali, not tied to any podcast. It uses the exact same community infrastructure (miniseries, badges, tracking, films) but replaces the podcast content layer with short editorial blog posts written by Ali.

**Free tier anchor.** MANTL Originals is the free community. New users get the full tracking/badge loop without a podcast subscription. This solves the cold start problem.

**Monetization funnel.** Users experience the mechanic for free via Originals → podcast communities become the $5/month upsell.

**SEO play.** Blog posts live at public URLs (`mymantl.app/originals/tom-clancy-films`) — searchable content that gives MANTL a front door beyond app stores.

---

## The 5 Launch Miniseries

Launch with all 5 visible from day one. Drip new ones monthly after that.

### 1. Best Year in Film
**Lead-off.** Most accessible, most universal. Ali picks his favorite year in film and makes the case. The miniseries is "watch these films from [year] and see for yourself." Super personal, invites disagreement — "that WAS a great year!" Drives conversation and engagement.

*Status: Needs writing. Ali needs to decide on the year first.*

### 2. Road Movies
**Most personality.** Mad Max 2, Joy Ride, Breakdown, Black Dog — a curated shelf no algorithm would ever surface. Ali has a written piece on "One Battle After Another" as secretly the best road movie since Fury Road (the car action is pivotal to the plot). That becomes the editorial anchor.

*Status: Existing piece on One Battle After Another can be recycled/restructured as the post's hook.*

### 3. Tom Clancy Films
**Franchise deep dive.** The Clancy franchise across four decades and three different Jack Ryans. Why Hollywood kept trying to make Ryan work and what that says about each era. Strong SEO ("Tom Clancy movies ranked"), clear film set, easy badge.

*Status: Hunt for Red October piece exists (see below). Not usable as-is — it's a single-film review. Needs restructuring into a franchise-level post. The Clancy writing style observations, the Rainbow Six/13-year-old Ali backstory, and the source material commentary are all great raw material to cannibalize.*

**Restructure approach:** Open with Ali's history with Clancy (Rainbow Six post-9/11), use Red October as the entry point, zoom out to the full shelf — Patriot Games, Clear and Present Danger, Sum of All Fears, Shadow Recruit, the Amazon series. Thesis: Hollywood kept trying to make Jack Ryan work.

### 4. The Movie Was Better
**Contrarian.** Inverse of "the book was better" which everyone always says. Project Hail Mary as the timely hook (Ali just saw it, thought the movie was much better than the book). Build out the set with other examples. Blog post writes itself: "Everyone says the book was better. Sometimes they're wrong. Here are the receipts."

*Status: Needs writing. Ali has read source material for many of these.*

### 5. The System Is Rigged (Late-Stage Capitalism on Film)
**Most provocative.** Ties to Ali's intellectual interests (RIP Capital Paradox). Films that expose the pitfalls of late-stage capitalism. Ali has read a bunch of the source material for these movies, so the post has genuine depth.

**Film candidates:**
- Sure picks: Wolf of Wall Street, Wall Street, The Big Short, Margin Call, Boiler Room
- Deeper cuts: Sorry to Bother You, Parasite, Nightcrawler, The Florida Project, Network (1976)
- Wildcards: Robocop, They Live, Michael Clayton, Enron: The Smartest Guys in the Room

**Post angle:** Hollywood keeps making these movies, audiences keep loving them, and nothing changes.

*Status: Needs writing. Capital Paradox research is the source material.*

---

## Content Model

Each "release" pairs two things:

1. **A short blog post** — liner notes energy. A few paragraphs of context, Ali's take, why this set of films matters. Not long-form essays.
2. **A miniseries** — the set of films tied to the post.

Users read the post, work through the miniseries, earn the badge. Same loop as podcast communities, just with Ali as curator.

**Cadence:** One new miniseries per month after launch. Bank content ahead.

---

## Architecture — What Exists Today

*(Mapped from repo exploration, March 2026)*

### Community data model
```
community_pages (row per community)
  ├── slug, name, description, tagline
  ├── theme_config (JSON: community_type, accent, hosts, tabs, etc.)
  ├── launched (boolean)
  ├── sort_order
  └── banner_url
  
community_miniseries (shelves within a community)
  ├── community_id (FK → community_pages)
  ├── title, description, tab_key, sort_order
  └── patreon_url (not needed for Originals)

community_items (films within a miniseries)
  ├── miniseries_id (FK → community_miniseries)
  ├── title, year, tmdb_id, sort_order
  └── poster data / cover URLs
```

### Community routing
`CommunityRouter.jsx` reads `theme_config.community_type` and switches:
- `"nowplaying"` → NowPlayingScreen
- `"blankcheck"` → BlankCheckScreen
- `"chapo"` → ChapoScreen
- etc.

Each community has: `[Name]Screen.jsx`, `[Name]Hero.jsx`, `[Name]LogModal.jsx` (thin wrappers over shared primitives).

### Shared primitives (reusable for Originals)
- `CommunityLogModal` — base log modal
- `CommunityFilter` — seen/unseen filter
- `CommunityTapeCard` — VHS tape on Explore screen
- `CommunitySleeveSheet` — VHS box-back discovery sheet
- `CommunityTabSlider` — tab navigation
- `ActivityRings`, `CyclePill`, `HeroBanner` — hero section primitives
- `useCommunityPage` — fetches community + miniseries + items
- `useCommunityProgress` — tracks user progress
- `useCommunityActions` — log/unlog/watchlist

### Subscriptions
`user_community_subscriptions` table. ExploreScreen splits communities into followed/unfollowed. Followed communities open directly; unfollowed show sleeve sheet with follow CTA.

### Explore screen
Communities listed as VHS tape cards. `PODCAST_ART` map for artwork. `SLUG_ABBREV` in CommunitySleeveSheet for MPAA-style box.

### Vercel routing
SPA rewrites in `vercel.json`. Currently: `/community/:slug/dashboard`, `/join/:code`, `/:username` all → `index.html`.

---

## What Needs Building

### 1. Schema (Supabase)

**community_pages row:**
```sql
INSERT INTO community_pages (slug, name, description, tagline, theme_config, launched, sort_order)
VALUES (
  'originals',
  'MANTL Originals',
  'Curated film shelves with editorial context. Free for everyone.',
  'MANTL Originals',
  '{
    "community_type": "originals",
    "accent": "#TBD",
    "tabs": []
  }'::jsonb,
  true,
  0  -- sort first, it's the free tier
);
```

**originals_posts table:**
```sql
CREATE TABLE originals_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  body TEXT NOT NULL,  -- markdown
  miniseries_id UUID REFERENCES community_miniseries(id),
  published_at TIMESTAMPTZ,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: public read, admin write
ALTER TABLE originals_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON originals_posts FOR SELECT USING (true);
CREATE POLICY "Admin write" ON originals_posts FOR ALL 
  USING (auth.uid() = '19410e64-d610-4fab-9c26-d24fafc94696');
```

**5 miniseries** under the Originals community_id, with items seeded per shelf.

**5 badges** — one per miniseries, `item_set_completion` type.

### 2. Frontend — Community Screen

**New files:**
```
src/components/community/originals/
  ├── OriginalsScreen.jsx    — community screen
  ├── OriginalsHero.jsx      — MANTL logo as "host," no podcast art
  └── OriginalsPostCard.jsx  — tappable liner notes card above each shelf
```

**OriginalsScreen pattern:**
- Based on ChapoScreen (simplest existing community)
- No audio player, no RSS, no episode matching
- No hosts config, no Patreon URLs
- Each miniseries shelf has a blog post card at the top
- Tap post card → reader sheet (markdown rendered) or inline expand
- Films below in standard poster grid
- Badge progress via existing `useBadges` + `useBadgeOrchestrator`

**OriginalsHero:**
- MANTL play-button logo as the "host" avatar
- Tagline: "MANTL Originals" or similar
- Activity rings showing overall Originals progress

**CommunityRouter update:**
```jsx
case "originals":
  return <OriginalsScreen {...sharedProps} />;
```

**CommunitySleeveSheet update:**
- Add `originals: "MO"` to `SLUG_ABBREV`
- Handle missing hosts/podcast info gracefully (no "starring" billing, no network)

**ExploreScreen update:**
- Originals tape card needs distinct treatment — no podcast art, MANTL branding
- Consider: always show Originals first, even for unfollowed users, with "Free" badge

### 3. Blog Reader View

**In-app:** Markdown rendering in a bottom sheet or inline expand. Keep it simple — `body` field is markdown, render with a lightweight lib (or just parse basic markdown manually since posts are short).

**Public web (SEO):** This is the bigger lift.
- New Vercel rewrite: `{ "source": "/originals/:slug", "destination": "/originals.html" }`
- Options:
  - **Lightweight:** Static HTML template with Vercel edge function that fetches post from Supabase and injects OG meta tags + rendered content. No React needed.
  - **SPA route:** Add `/originals/:slug` route in App.jsx, rewrite to `index.html`. Works but no SSR = bad for SEO.
  - **Recommended:** Edge function for meta tags + basic HTML, with a CTA to open in app for tracking.

**Public page structure:**
```
mymantl.app/originals/tom-clancy-films
  ├── OG meta tags (title, description, image)
  ├── Blog post rendered as clean HTML
  ├── Film list with posters
  ├── CTA: "Track your progress in MANTL" → app store / app deep link
  └── Footer: links to other Originals posts
```

### 4. Monetization Integration

- Originals community: **no subscription required.** Always accessible.
- Skip subscription check for Originals community_id in any gating logic.
- Originals badges always visible/earnable regardless of subscription status.
- Other communities on Explore screen show subscribe prompt as today.

---

## Build Order

1. **Schema** — community_pages row, originals_posts table, 5 miniseries, seed items, seed badges
2. **OriginalsScreen + Hero** — get the community rendering in-app
3. **Blog post card** — inline or sheet reader for the editorial content
4. **CommunityRouter + ExploreScreen** — wire it up, handle free tier display
5. **Write first post** — start with "Best Year in Film" (most accessible)
6. **Public web page** — Vercel edge function for SEO (can follow later)

---

## Open Decisions for Build Time

- Accent color for Originals
- MANTL logo treatment in hero (play button? full wordmark?)
- Blog reader: bottom sheet vs inline expand vs dedicated route
- Originals tape card design on Explore screen — distinct from podcast tapes?
- Public web page priority (ship in-app first, SEO page can follow)

---

## Existing Writing Assets

**Hunt for Red October piece** — full review with Foresight/Hindsight structure. Voice is strong. Usable as raw material for the Clancy shelf post but needs restructuring from single-film review → franchise overview.

**One Battle After Another piece** — road movie analysis. Can be recycled as the hook for the Road Movies shelf post.

**Capital Paradox research** — source material for the capitalism shelf post. Channel is dead but the knowledge base is alive.

---

*When picking this up: clone repo, start with schema (community row + posts table + seed miniseries), build OriginalsScreen, write the first post.*
