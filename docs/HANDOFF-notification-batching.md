# Notification Batching — Handoff

## The Problem

`ingest-rss` runs daily at 22:00 UTC. When it discovers 6 new podcast episodes that each cover a different film in a user's library, `notify-new-coverage` fires 6 separate push notifications. That's spam.

## Current Architecture

```
pg_cron 22:00 UTC
  → ingest-rss (edge function)
    → parses RSS feeds, inserts new podcast_episodes + podcast_episode_films
    → collects allNewMappings: [{ episode_id, tmdb_id, podcast_id }, ...]
    → calls notify-new-coverage with all mappings
      → for EACH mapping × user combo, sends a separate push via send-push
      → logs each to push_notification_log with ref_key "coverage:{episode_id}:{tmdb_id}"
```

**There are TWO notification types now:**

| Type | Trigger | Current behavior |
|------|---------|-----------------|
| `new_coverage` | New podcast episode covers a film user already logged | One push per episode×film (THE SPAM PROBLEM) |
| `watched_coverage` | User logs a film that has existing podcast coverage | One batched push per film listing all covering podcasts (ALREADY BATCHED, NO CHANGE NEEDED) |

## What Needs to Change

Only `notify-new-coverage` needs to change. The fix is to **group all pending notifications per user** before sending, then decide format based on count.

### Proposed Logic

```
notify-new-coverage receives N mappings
  → resolve films, episodes, podcasts (already does this)
  → build per-user notification list (already does this)
  → NEW: group by user_id
  → for each user:
      count = number of distinct films with new coverage
      if count == 1:
        "Blank Check just covered Jaws"  (current format, named)
      if count == 2:
        "2 films got new coverage: Jaws and Heat"
      if count >= 3:
        "5 of your films got new podcast coverage"
      → send ONE push via send-push
      → log ONE entry to push_notification_log
```

### Key Decision: ref_key for dedup

Currently each notification has `ref_key: "coverage:{episode_id}:{tmdb_id}"`. With batching, options:

**A.** Single ref_key per batch: `"coverage_digest:{date}"` — one digest per day per user
**B.** Still log individual ref_keys but only send one push — preserves granular dedup, future inbox

I'd go with **B**: log all individual ref_keys to `push_notification_log` for dedup history, but the actual push is one batched message. That way:
- Subsequent cron runs won't re-notify for the same episode×film combos
- A future in-app notification inbox can show granular items
- The push itself is a single summary

### Data Payload for Batched Push

```json
{
  "type": "new_coverage_digest",
  "film_count": "5",
  "films": "[{\"tmdb_id\":578,\"title\":\"Jaws\"},{\"tmdb_id\":949,\"title\":\"Heat\"}]",
  "route": "/?feed=activity"
}
```

Tap → opens activity feed (where the user can see each film and tap into sleeves).

## Files to Modify

| File | What |
|------|------|
| `supabase/functions/notify-new-coverage/index.ts` | Group by user, batch into single push, keep granular dedup logging |
| `src/utils/pushNotifications.js` | Handle `new_coverage_digest` tap type (already handles `watched_coverage` and `new_coverage`) |

## Files NOT to Modify

- `check-new-film-coverage` — already batched per film, no spam risk
- `sync-letterboxd-cron` — just calls check-new-film-coverage, fine as-is
- `send-push` — generic push sender, no changes needed
- `ingest-rss` — already collects allNewMappings and passes to notify-new-coverage

## User Preferences

The existing `user_notification_preferences` table has:
- `new_coverage` (bool, default true) — master toggle for this notification type
- `favorites_only` (bool, default false) — only notify for favorited podcasts
- `watched_coverage` (bool, default true) — separate toggle for "you watched it" notifications

The batching change respects these — just changes HOW many pushes fire, not WHICH users get them.

## Relevant Tables

- `push_notification_log` — dedup + history (user_id, notif_type, ref_key, title, body, payload, sent_at)
- `user_notification_preferences` — per-user toggles
- `user_podcast_favorites` — direct podcast favorites
- `user_community_subscriptions` — community subscriptions (→ podcasts via community_page_id)
- `device_tokens` — FCM tokens per user
- `podcast_episode_films` — episode×film coverage mappings

## Edge Functions (deployed, Supabase project gfjobhkofftvmluocxyw)

| Function | Status | Notes |
|----------|--------|-------|
| `notify-new-coverage` | deployed v3 via MCP | THE ONE TO MODIFY — repo version may lag deployed |
| `check-new-film-coverage` | deployed v1 | Already batched, leave alone |
| `sync-letterboxd-cron` | deployed v2 | Hourly cron, calls check-new-film-coverage |
| `send-push` | deployed v6 via MCP | Generic sender, no changes |
| `ingest-rss` | deployed | Daily RSS ingest, calls notify-new-coverage |

**Important:** `notify-new-coverage` and `send-push` were deployed via MCP and may differ from repo versions. Pull deployed versions from Supabase dashboard or use `Supabase:get_edge_function` MCP tool before editing.

## Testing

1. Modify `notify-new-coverage` to batch per user
2. Deploy via MCP: `Supabase:deploy_edge_function`
3. Manually invoke ingest-rss or notify-new-coverage with test data
4. Verify: one push per user, granular dedup rows in push_notification_log
