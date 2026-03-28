# HANDOFF: Badge Seeding

Full workflow for creating and seeding new badges in MANTL's Blank Check community. Covers both **miniseries completion** badges (director filmographies) and **item set completion** badges (cross-community actor/theme sets).

---

## Badge Types

### `miniseries_completion`
Awarded when a user completes every film in a single BC miniseries shelf (e.g. a director's run). Links directly via `miniseries_id` — no `badge_items` needed.

### `item_set_completion`
Awarded when a user watches a curated set of films that cuts across multiple miniseries (e.g. every Tom Hanks film BC has covered). Requires individual `badge_items` rows linking `badge_id → community_items.id`.

---

## Key IDs

- **BC community_id:** `cb2f3b1a-eca8-4e0f-b296-1e1dcabdcca7`
- **Ali's user_id (for test seeding):** `19410e64-d610-4fab-9c26-d24fafc94696`
- **TMDB API key:** `ec6edb453a82a8a1081d13e597ea95ce`

---

## Step 1 — Find Films (for item_set badges)

Use `actor-check.js` in the repo root to cross-reference all BC films against any actor's TMDB cast credits:

```bash
node actor-check.js
```

To check a different actor:
1. Find their TMDB person ID in the URL on their TMDB page (e.g. `themoviedb.org/person/31-tom-hanks` → ID is `31`)
2. Update `ACTOR_ID` and `ACTOR_NAME` at the top of the script

The script checks both **main feed** (`filmography`) and **patreon** tabs, deduplicates, and outputs results split by feed with TMDB IDs ready to copy.

---

## Step 2 — Prepare Badge Assets

- **Badge image:** Upload to Supabase storage bucket `badges/`. Circular crop works best, ~500px. Reference URL: `https://api.mymantl.app/storage/v1/object/public/badges/your_file.png`
- **Celebration video:** MP4, ideally 2–5MB. Compress with ffmpeg if needed:
  ```bash
  ffmpeg -i input.mp4 -vcodec libx264 -crf 28 -preset fast -acodec aac -b:a 128k output.mp4
  ```
  Upload to the same `badges/` bucket.

---

## Step 3 — Insert the Badge

### For `miniseries_completion`:

```sql
INSERT INTO badges (
  community_id, name, plaque_name, description,
  image_url, audio_url,
  badge_type, miniseries_id,
  accent_color, tagline, progress_tagline,
  celebration_theme, is_active, sort_order
) VALUES (
  'cb2f3b1a-eca8-4e0f-b296-1e1dcabdcca7',
  'Badge Name',          -- shown on celebration screen
  'Short',               -- shown in trophy case (1 word)
  'Completed every X film in the Blank Check catalog.',
  'https://api.mymantl.app/storage/v1/object/public/badges/badge.png',
  'https://api.mymantl.app/storage/v1/object/public/badges/celebrate.mp4',
  'miniseries_completion',
  'YOUR-MINISERIES-UUID',
  '#hexcolor',
  'Final tagline — movie quote twisted for badges.',
  'Progress tagline — shown while in progress.',
  'flicker',
  true,
  7  -- increment from last badge's sort_order
) RETURNING id;
```

Find the right `miniseries_id`:
```sql
SELECT id, title FROM community_miniseries
WHERE community_id = 'cb2f3b1a-eca8-4e0f-b296-1e1dcabdcca7'
AND tab_key = 'filmography'
ORDER BY sort_order;
```

### For `item_set_completion`:

Same INSERT but with `badge_type = 'item_set_completion'` and `miniseries_id = NULL`. Then seed `badge_items` — see Step 4.

---

## Step 4 — Seed badge_items (item_set only)

First get the `community_items` UUIDs for your tmdb_ids (main feed only unless you want patreon too):

```sql
SELECT ci.id, ci.title, ci.year, ci.tmdb_id
FROM community_items ci
JOIN community_miniseries cm ON cm.id = ci.miniseries_id
WHERE cm.community_id = 'cb2f3b1a-eca8-4e0f-b296-1e1dcabdcca7'
  AND cm.tab_key = 'filmography'
  AND ci.tmdb_id IN (/* your tmdb ids */)
ORDER BY ci.year;
```

Then insert:
```sql
INSERT INTO badge_items (badge_id, item_id) VALUES
  ('YOUR-BADGE-UUID', 'community_item_uuid_1'),
  ('YOUR-BADGE-UUID', 'community_item_uuid_2'),
  -- ...
```

> **Note:** `badge_items.item_id` references `community_items.id`, NOT `media.id`. Easy to get wrong.

---

## Step 5 — Test the Badge

Seed your user_badges row to preview without earning it:

```sql
INSERT INTO user_badges (user_id, badge_id, earned_at)
VALUES ('19410e64-d610-4fab-9c26-d24fafc94696', 'YOUR-BADGE-UUID', now())
ON CONFLICT DO NOTHING;
```

Hard refresh the app and tap the badge. Check:
- Celebration video plays and is not too dim (if dim, accent_color is probably too dark — lighten it)
- Badge image shows clearly (not blurred/invisible)
- Journey list populates in BadgeDetailScreen
- Taglines look right

When done testing, clean up:
```sql
DELETE FROM user_badges
WHERE user_id = '19410e64-d610-4fab-9c26-d24fafc94696'
AND badge_id = 'YOUR-BADGE-UUID';
```

---

## Badge Design Conventions

| Field | Convention |
|---|---|
| `name` | Short cryptic clue — image is blurred until earned. 1–3 words. |
| `plaque_name` | Single word for trophy case. |
| `tagline` | Famous movie quote twisted to reference badges. |
| `progress_tagline` | Shown while in progress. Punchy, encouraging. |
| `accent_color` | Must be light enough to be visible on dark bg. Avoid anything darker than `#5a5a5a`. |
| `celebration_theme` | Always `flicker` for now. |
| `sort_order` | Increment from last badge. Current BC badges: Choose Life(1), Last Podcaster(2), It's Showtime(3), Jupiter Jones(4), Geographical Oddity(5), Sully(6), Going Clear(7). |

---

## Existing BC Badges Reference

| name | plaque_name | type | subject | sort |
|---|---|---|---|---|
| Choose Life | Choose Life | miniseries_completion | Danny Boyle | 1 |
| The Last Podcaster | Last Pod | miniseries_completion | M. Night Shyamalan | 2 |
| It's Showtime | Showtime | miniseries_completion | Tim Burton | 3 |
| Jupiter Jones | Jupiter | miniseries_completion | Wachowskis | 4 |
| Geographical Oddity | Element | miniseries_completion | Coen Brothers | 5 |
| Sully | Sully | item_set_completion | Tom Hanks (15 films) | 6 |
| Going Clear | Clear | item_set_completion | Tom Cruise (18 films) | 7 |

---

## Celebration Video Tips

- Pull clips from the BC podcast RSS feed: `https://feeds.megaphone.fm/blank-check`
- Clip with ffmpeg: `ffmpeg -ss 00:05 -to 00:27 -i "MP3_URL" -c copy clip.mp3`
- For video celebrations, superimpose audio over a relevant film scene
- Aim for 20–40 seconds, compress to under 5MB
- Subtitles in the source video? Crop the bottom: `ffmpeg -i input.mp4 -vf "crop=in_w:in_h-80:0:0" output.mp4`
- If the celebration looks dim, the accent_color is too dark — update it directly in the DB
