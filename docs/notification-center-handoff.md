# Notification Center — Handoff (Post-Implementation)

## What Was Built

A universal in-app notification inbox accessible via a bell icon in the header. Works for ALL users whether or not they have push notifications enabled. Slide-in panel from the right, grouped by day.

## Architecture

### Two Independent Channels

```
Event (new coverage, badge earned, etc.)
  ├─ push_notification_log + send-push  → native push (device token holders only)
  └─ user_notifications                 → in-app inbox (ALL users)
```

Push and inbox are fully decoupled. Edge functions dual-write to both. Badge notifications write to inbox only (client-side, through RLS).

### Table: `user_notifications`

```sql
id              uuid PK
user_id         uuid FK → auth.users
notif_type      text        -- 'new_coverage', 'watched_coverage', 'badge_earned', 'badge_progress'
title           text
body            text
image_url       text        -- podcast artwork, badge image
payload         jsonb       -- routing data (same shape as push payloads)
ref_key         text        -- dedup key (unique per user where not null)
seen_at         timestamptz -- null = unread
created_at      timestamptz
```

**Indexes:** unseen partial (user_id + seen_at where null), created_at desc, dedup unique (user_id + ref_key where not null).

**RLS:** SELECT + UPDATE + INSERT for own rows. No DELETE (handled by cron).

**Retention:** 30-day rolling cleanup via pg_cron daily at 03:00 UTC.

### Notification Types

| Type | Source | Trigger | Dedup Key |
|------|--------|---------|-----------|
| `new_coverage` | `notify-new-coverage` edge fn | Podcast covers a film the user logged | `coverage:{episode_id}:{tmdb_id}` |
| `watched_coverage` | `check-new-film-coverage` edge fn | User logs a film that already has coverage | `watched:{tmdb_id}` |
| `badge_earned` | `useBadges.js` (client) | Badge completion | `badge_earned:{badge_id}` |
| `badge_progress` | `useBadges.js` (client) | Film log ticks a badge forward | `badge_progress:{badge_id}` (upserts — latest state only) |

### Dedup Strategy

- **Edge functions:** Explicit dedup sets (`sentSet`, `inboxSentSet`) checked before building rows, plus unique index with `ignoreDuplicates: true` as safety net on upsert.
- **Badge progress:** Upserts on `badge_progress:{badge_id}` — logging 3 films in one session that all tick the same badge produces one row showing the latest count, not 3 rows.
- **Badge earned:** `ignoreDuplicates: true` — can't earn the same badge twice.

## Files Created

| File | Purpose |
|------|---------|
| `src/hooks/useNotifications.js` | Fetch notifications, unread count, mark seen, auto-refresh on app focus |
| `src/components/NotificationBell.jsx` | Bell icon with unread badge (uses `.notif-bell` CSS) |
| `src/components/NotificationCenter.jsx` | Right slide panel — day-grouped list, tap routing, backdrop overlay |
| `supabase/migrations/20260325_user_notifications.sql` | Table, indexes, RLS, cron |

## Files Modified

| File | What Changed |
|------|-------------|
| `src/App.jsx` | Imports + hook + state. Swapped profile/bell positions (avatar left, bell right). Absolutely centered MANTL logo. Extracted `handlePushNav` to `useCallback` (shared by push listeners + notification panel). Bell replaced with `NotificationBell` component. `NotificationCenter` renders as overlay. |
| `supabase/functions/notify-new-coverage/index.ts` | Preferences + pending items built for ALL users (was: only token holders). Push gated behind `usersWithTokens.has()`. Inbox rows written for all users via upsert. |
| `supabase/functions/check-new-film-coverage/index.ts` | Removed early exit on no device tokens. `hasTokens` boolean gates push only. Inbox always writes. Added `artwork_url` to podcast join. |
| `src/hooks/community/useBadges.js` | `evaluateBadge`: upserts progress + inserts earned to inbox. `tryAward`: inserts earned only (bulk sync, skip progress noise). All fire-and-forget (`.then()`). |

## Files NOT Modified

- `send-push` — push delivery layer, unchanged
- `ingest-rss` — just calls notify-new-coverage, unchanged
- `pushNotifications.js` — native push listeners, separate concern
- `push_notification_log` — unchanged, still used for push dedup
- `useBadgeOrchestrator.js` — toast system unchanged, runs independently of inbox
- `BadgeProgressToast.jsx` — still fires as before (inbox supplements, doesn't replace)

## Tap Routing

Notification taps use the same `handlePushNav` as push notifications:

| payload.type | Action |
|-------------|--------|
| `new_coverage` | Opens activity feed → auto-opens sleeve for the film |
| `watched_coverage` | Opens activity feed → auto-opens sleeve for the film |
| `new_coverage_digest` | Lands on activity feed |
| `badge_earned` | Falls through to feed (deep community routing not wired yet) |
| `badge_progress` | Falls through to feed (deep community routing not wired yet) |

## What's Next: Wire Badge Notifications to Push

Currently badge notifications only write to the inbox (client-side via RLS). They don't trigger push. To add push:

### Option A: Client calls `send-push` after badge write
- After `evaluateBadge` awards a badge, also call `send-push` from the client
- Problem: requires service_role key on the client, or a thin edge function wrapper
- Problem: badge progress push could be noisy

### Option B: Edge function for badge push (recommended)
- New edge function `notify-badge` that accepts `{ user_id, badge_id, badge_name, image_url, type: "earned" | "progress", current, total }`
- Client calls it after badge evaluation
- Edge function handles push send + push_notification_log dedup
- Only sends push for `badge_earned`, not progress (progress stays inbox-only to avoid spam)
- Inherits the existing `send-push` call pattern from the coverage functions

### What needs to happen:
1. Create `supabase/functions/notify-badge/index.ts`
2. Call it from `useBadges.js` after badge earn (alongside the existing inbox write)
3. Add `badge_earned` routing to `handlePushNav` in App.jsx (deep link to community badges tab)
4. Decision: should `badge_progress` also push? Recommendation: no — keep it inbox-only.

## Design Decisions Worth Remembering

- **Inbox is the record of truth, push is a delivery channel.** Inbox works without push. Push can fail/be disabled and the inbox still has everything.
- **Individual items in inbox, batched summaries in push.** `notify-new-coverage` sends one push ("3 films got coverage") but writes 3 inbox rows so each film is tappable.
- **Badge progress upserts, not inserts.** Prevents inbox clutter from bulk operations.
- **Badge progress is inbox-only.** Push would be too noisy — you could get 10 progress pushes from a Letterboxd sync.
- **`seen_at` not `read_at`.** Opening the panel marks everything seen. No per-item tracking needed.
- **30-day retention.** Keeps the table small. Old notifications aren't useful.
- **Fire-and-forget inbox writes in useBadges.** Uses `.then()` instead of `await` so inbox writes never slow down badge evaluation UI.
