# Notification Center — Handoff

## The Vision

An in-app notification inbox accessible via a bell icon — works for ALL users whether or not they have push notifications enabled. Follows the NYTimes model: lightweight overlay, not a full tab. Each of the three pillars (Feed, Communities, Games) can surface notifications here over time.

## Why Not Just Reuse `push_notification_log`

`push_notification_log` only has rows for users with device tokens and push enabled. A notification center needs to work for everyone — including web-only users who never enable push. The push log should stay as-is for push dedup, and a new `user_notifications` table becomes the canonical inbox.

## New Table: `user_notifications`

```sql
create table user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notif_type text not null,           -- 'new_coverage', 'new_coverage_digest', 'watched_coverage', 'badge_earned', 'episode_drop', 'game_streak', etc.
  title text not null,
  body text not null,
  image_url text,                     -- podcast artwork, badge image, etc.
  payload jsonb not null default '{}', -- route, tmdb_id, badge_id, etc. (same shape as push data payloads)
  ref_key text,                        -- for dedup (same pattern as push_notification_log)
  seen_at timestamptz,                 -- null = unread, set on inbox open
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_user_notifications_user_unseen on user_notifications (user_id, seen_at) where seen_at is null;
create index idx_user_notifications_user_created on user_notifications (user_id, created_at desc);
create unique index idx_user_notifications_dedup on user_notifications (user_id, ref_key) where ref_key is not null;
```

Key decisions:
- **`ref_key` unique per user** — same dedup pattern as push, prevents duplicate inbox entries on re-runs
- **`seen_at` nullable** — null means unread, timestamp means seen. One bulk update on inbox open, no per-item read tracking needed (keeps it simple)
- **`payload` as jsonb** — flexible routing data, same shape as push payloads so the tap handler can be shared
- **No `read_at` vs `seen_at` distinction** — opening the inbox marks everything as seen. No need for per-item tracking right now

## Retention Policy

30-day rolling window. Cron or Postgres function:

```sql
-- Add to existing pg_cron schedule or create new one
select cron.schedule('clean-old-notifications', '0 3 * * *',
  $$delete from user_notifications where created_at < now() - interval '30 days'$$
);
```

## Who Writes to `user_notifications`

Every notification source writes here **in addition to** (not instead of) push. Push remains a delivery channel; the inbox is the record of truth.

| Source | notif_type | When | What to write |
|--------|-----------|------|---------------|
| `notify-new-coverage` | `new_coverage` | After batching per user | One row per episode×film combo (granular, like push dedup rows). NOT the batched summary — individual items so the inbox can show each film. |
| `check-new-film-coverage` | `watched_coverage` | After user logs a film with existing coverage | One row per film (already batched) |
| Badge system | `badge_earned` | On badge award | One row per badge earned |
| Episode publish pipeline | `episode_drop` | `publish_due_episodes()` cron | One row per subscribed community's new episode |
| Games (future) | `game_streak` | Daily game completion | Milestone notifications (7-day streak, etc.) |

### Modification to `notify-new-coverage`

Currently the function builds `allLogRows` for `push_notification_log`. Add a parallel insert into `user_notifications` — but with individual items (not the batched summary), so the inbox can render each film separately:

```typescript
// After the existing allLogRows loop, add:
const inboxRows = [];
for (const [userId, items] of userPending) {
  for (const item of items) {
    inboxRows.push({
      user_id: userId,
      notif_type: "new_coverage",
      title: "New coverage available",
      body: `${item.podcast_name} just covered ${item.film_title}`,
      image_url: item.podcast_artwork,
      payload: {
        type: "new_coverage",
        tmdb_id: String(item.tmdb_id),
        episode_id: item.episode_id,
        route: `/?openFilm=${item.tmdb_id}`,
      },
      ref_key: item.ref_key,
    });
  }
}
if (inboxRows.length > 0) {
  await sb.from("user_notifications").upsert(inboxRows, { onConflict: "user_id,ref_key", ignoreDuplicates: true });
}
```

**Important:** This writes for ALL users who have the film logged — not just users with device tokens. That's the whole point: the inbox works without push.

### Modification to `check-new-film-coverage`

Same pattern — after existing push logic, insert to `user_notifications`:

```typescript
inboxRows.push({
  user_id: userId,
  notif_type: "watched_coverage",
  title: "Your film has coverage",
  body: `${podcastNames} covered ${filmTitle}`,
  image_url: artworkUrl,
  payload: { type: "watched_coverage", tmdb_id: String(tmdbId), route: `/?openFilm=${tmdbId}` },
  ref_key: `watched:${tmdbId}`,
});
```

## Unread Count Query

For the bell badge (real-time via Supabase subscription or polled on app focus):

```sql
select count(*) from user_notifications
where user_id = $1 and seen_at is null;
```

## Mark All Seen

On inbox open:

```sql
update user_notifications
set seen_at = now()
where user_id = $1 and seen_at is null;
```

## Client-Side Architecture

### Bell Icon Placement

Top-right of the feed tab header bar (next to the existing filter/mode controls). Unread dot when count > 0, shows count number if > 9 as "9+".

### NotificationCenter Component

Bottom sheet or overlay (not a new screen — keeps it lightweight). Scrollable list grouped by day ("Today", "Yesterday", "March 22"). Each item is a tappable card:

```
┌─────────────────────────────────────────┐
│ [artwork]  Blank Check just covered     │
│            Jaws                          │
│            2h ago                        │
├─────────────────────────────────────────┤
│ [badge]    You earned "Raging Boll"     │
│            Yesterday                     │
├─────────────────────────────────────────┤
│ [artwork]  Now Playing covered          │
│            Alien                         │
│            2 days ago                    │
└─────────────────────────────────────────┘
```

### Tap Handling

Reuse the existing `handlePushNav` logic from App.jsx — the `payload` field in `user_notifications` has the same shape as push data payloads. On tap:

1. Read the `payload` from the notification row
2. Pass to `handlePushNav(payload)` — same routing: `new_coverage` opens sleeve, `watched_coverage` opens sleeve, `badge_earned` navigates to community badges tab, etc.

### Data Fetching

```javascript
// Hook: useNotifications.js
const { data: notifications } = await supabase
  .from("user_notifications")
  .select("*")
  .eq("user_id", userId)
  .order("created_at", { ascending: false })
  .limit(50);

// Unread count (for bell badge)
const { count } = await supabase
  .from("user_notifications")
  .select("*", { count: "exact", head: true })
  .eq("user_id", userId)
  .is("seen_at", null);
```

## RLS Policies

```sql
alter table user_notifications enable row level security;

create policy "Users can read own notifications"
  on user_notifications for select using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on user_notifications for update using (auth.uid() = user_id);

-- Insert is service_role only (edge functions)
-- Delete handled by cron cleanup
```

## Files to Create

| File | What |
|------|------|
| `src/hooks/useNotifications.js` | Fetch notifications, unread count, mark seen |
| `src/components/NotificationCenter.jsx` | Bottom sheet overlay with notification list |
| `src/components/NotificationBell.jsx` | Bell icon with unread dot, triggers sheet open |

## Files to Modify

| File | What |
|------|------|
| `supabase/functions/notify-new-coverage/index.ts` | Add `user_notifications` insert (all users, not just push-enabled) |
| `supabase/functions/check-new-film-coverage/index.ts` | Add `user_notifications` insert |
| `src/App.jsx` | Add NotificationBell to header, share handlePushNav with NotificationCenter |
| `src/screens/FeedScreen.jsx` | Add bell icon to header bar |

## Files NOT to Modify

- `send-push` — push delivery layer, unchanged
- `ingest-rss` — just calls notify-new-coverage, unchanged
- `pushNotifications.js` — native push listeners, separate concern
- `push_notification_log` — keep as-is for push dedup

## Monetization Consideration

The notification center itself should be free tier — it's a retention hook. Users see "Blank Check just covered Jaws" → tap → hit the sleeve → want to listen → that's the engagement loop. Gating it behind paid would break the funnel. The paid gate is further downstream (full community access, badge systems, celebration videos).

## Future Extensions (Not Now)

- **Real-time updates** via Supabase Realtime subscription on `user_notifications` (INSERT events)
- **Notification preferences per type** — granular toggles in settings (currently only `new_coverage` and `watched_coverage` toggles exist)
- **Badge earned notifications** — write to `user_notifications` when `useBadges.js` awards a badge
- **Episode drop notifications** — write from `publish_due_episodes()` for subscribed communities
- **Game streak milestones** — write from game completion handlers
- **Swipe to dismiss** — soft delete individual notifications
- **In-app toast → inbox link** — foreground push toast gets "View all" that opens inbox

## Implementation Order

1. Migration: create `user_notifications` table + indexes + RLS
2. Modify `notify-new-coverage` to dual-write (push log + inbox)
3. Modify `check-new-film-coverage` to dual-write
4. Build `useNotifications.js` hook
5. Build `NotificationBell.jsx` + wire into feed header
6. Build `NotificationCenter.jsx` bottom sheet
7. Add retention cron
8. Test: verify inbox populates for users without push, verify seen_at marking, verify tap routing
