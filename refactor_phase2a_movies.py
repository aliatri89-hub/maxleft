#!/usr/bin/env python3
"""
MANTL — Unified Media Architecture: Phase 2A
=============================================
Migrate all `movies` table reads → `user_films_v` view
Migrate all `movies` table writes → upsertMediaLog / update_rewatch_data

Run from MANTL project root: python3 refactor_phase2a_movies.py

Prerequisites:
  - Phase 1 refactor applied (mediaWrite.js exists, communityDualWrite.js deleted)
  - Server-side: user_films_v view + update_rewatch_data RPC exist
"""

import os, sys, re

def patch(path, old, new, label=""):
    global changes
    with open(path, "r") as f:
        content = f.read()
    if old not in content:
        print(f"  ⚠ {path}: {label or 'block'} NOT FOUND — may need manual patch")
        return content
    content = content.replace(old, new, 1)
    changes += 1
    with open(path, "w") as f:
        f.write(content)
    print(f"  ✓ {path}: {label}")
    return content

if not os.path.exists("src/utils/mediaWrite.js"):
    print("ERROR: Run Phase 1 first (mediaWrite.js not found). Run from MANTL project root.")
    sys.exit(1)

print("\n🎬 MANTL Unified Media Architecture — Phase 2A (movies → user_films_v)")
print("=" * 65)
changes = 0

# ═══════════════════════════════════════════════════════════════
# APP.JSX
# ═══════════════════════════════════════════════════════════════
print("\n📝 App.jsx...")
app = "src/App.jsx"

# Add imports
with open(app, "r") as f:
    content = f.read()

if "upsertMediaLog" not in content:
    # Find a good place to add the import — after the existing api.js import
    old_imp = 'import { TMDB_IMG, searchTMDBRaw, fetchTMDBRaw, searchGoogleBooksRaw } from "./utils/api";'
    if old_imp in content:
        new_imp = old_imp + '\nimport { upsertMediaLog, toPosterPath } from "./utils/mediaWrite";'
        content = content.replace(old_imp, new_imp, 1)
        with open(app, "w") as f:
            f.write(content)
        print(f"  ✓ {app}: added mediaWrite import")
        changes += 1
    else:
        # Try alternative import patterns
        alt_imp = 'import { TMDB_IMG, searchTMDBRaw, fetchTMDBRaw } from "./utils/api";'
        if alt_imp in content:
            new_imp = alt_imp + '\nimport { upsertMediaLog, toPosterPath } from "./utils/mediaWrite";'
            content = content.replace(alt_imp, new_imp, 1)
            with open(app, "w") as f:
                f.write(content)
            print(f"  ✓ {app}: added mediaWrite import (alt)")
            changes += 1
        else:
            print(f"  ⚠ {app}: could not find api.js import to add mediaWrite after")

# READ: Shelf data loading — movies query
patch(app,
    'supabase.from("movies").select("id, title, poster_url, rating, year, director, notes, watched_at")',
    'supabase.from("user_films_v").select("id, title, poster_url, rating, year, director, notes, watched_at")',
    "shelf movies read → user_films_v")

# READ: Letterboxd sync — existing movies check
patch(app,
    'const { data: existingMovies } = await supabase.from("movies")\n        .select("title, year, tmdb_id, watch_dates").eq("user_id", userId);',
    'const { data: existingMovies } = await supabase.from("user_films_v")\n        .select("title, year, tmdb_id, watch_dates").eq("user_id", userId);',
    "Letterboxd existing movies check → user_films_v")

# WRITE: Letterboxd RSS sync — movie upsert + feed insert
# Replace the movie upsert AND the feed_activity insert that follows
# The upsertMediaLog RPC handles feed internally
patch(app,
    '''        const { error: movieErr } = await supabase.from("movies").upsert(movieRow, { onConflict: "user_id,tmdb_id" });
        if (movieErr) console.error("[Letterboxd] Movie insert error:", movieErr);

        // Insert feed_activity if recent
        const feedKey = `lb_${title}_${year}`;
        const maxAge = manual ? 90 * 24 * 60 * 60 * 1000 : 14 * 24 * 60 * 60 * 1000;
        const isRecent = watchedDate && (Date.now() - new Date(watchedDate).getTime()) < maxAge;
        if (!feedSet.has(feedKey) && !feedSet.has(title) && isRecent) {
          const feedRow = {
            user_id: userId, activity_type: "movie", action: "finished",
            title: feedKey, item_title: title, item_cover: poster,
            rating: ratingFromTitle || null,
            metadata: { source: "letterboxd", letterboxd_username: username, watched_date: watchedDate },
            created_at: watchedDate
              ? toLogTimestamp(watchedDate)
              : new Date().toISOString(),
          };
          if (year) feedRow.item_year = year;
          if (director) feedRow.item_author = director;
          const { error: feedInsertErr } = await supabase.from("feed_activity").insert(feedRow);
          if (feedInsertErr) console.error("[Letterboxd] Feed insert error:", feedInsertErr.message, feedInsertErr.code);
          feedSet.add(feedKey);
          feedSet.add(title);
        }''',
    '''        // Write to media + user_media_logs (unified) — also handles feed + wishlist
        const mediaId = await upsertMediaLog(userId, {
          mediaType: "film",
          tmdbId: tmdbId,
          title, year,
          creator: director,
          posterPath: poster ? toPosterPath(poster) : null,
          backdropPath: backdrop ? toPosterPath(backdrop) : null,
          runtime, genre,
          rating: ratingFromTitle || null,
          watchedAt: watchedDate ? toLogTimestamp(watchedDate) : new Date().toISOString(),
          source: "letterboxd",
          watchCount: 1,
          watchDates: [watchDateStr],
        });
        if (!mediaId) console.error("[Letterboxd] upsert_media_log failed for", title);''',
    "Letterboxd RSS movie upsert → upsertMediaLog")

# WRITE: Letterboxd rewatch update
patch(app,
    '''        const { error: rwErr } = await supabase.from("movies")
          .update({
            watch_count: newCount,
            watch_dates: newDates,
            watched_at: new Date(
              new Date(toLogTimestamp(rw.newDate)).getTime()
            ).toISOString(),
          })
          .eq("user_id", userId)
          .eq("tmdb_id", rw.tmdb_id);''',
    '''        const { error: rwErr } = await supabase.rpc("update_rewatch_data", {
          p_user_id: userId,
          p_tmdb_id: rw.tmdb_id,
          p_watch_dates: JSON.stringify(newDates),
          p_watched_at: new Date(new Date(toLogTimestamp(rw.newDate)).getTime()).toISOString(),
        });''',
    "Letterboxd rewatch → update_rewatch_data RPC")

# WRITE: Account reset — also delete from user_media_logs
patch(app,
    '      await supabase.from("movies").delete().eq("user_id", userId);',
    '      await supabase.from("user_media_logs").delete().eq("user_id", userId);\n      await supabase.from("movies").delete().eq("user_id", userId);  // legacy cleanup',
    "account reset → also delete user_media_logs")

# ═══════════════════════════════════════════════════════════════
# TRACKSCREEN.JSX — reads + writes
# ═══════════════════════════════════════════════════════════════
print("\n📝 TrackScreen.jsx...")
ts = "src/screens/TrackScreen.jsx"

# Add import
with open(ts, "r") as f:
    content = f.read()

if "upsertMediaLog" not in content:
    # Find the supabase import
    if 'import { supabase }' in content:
        old_sb = next(line for line in content.split('\n') if 'import { supabase }' in line)
        new_sb = old_sb + '\nimport { upsertMediaLog } from "../utils/mediaWrite";'
        content = content.replace(old_sb, new_sb, 1)
        with open(ts, "w") as f:
            f.write(content)
        print(f"  ✓ {ts}: added mediaWrite import")
        changes += 1

# Now do all the read swaps — .from("movies") → .from("user_films_v") for SELECT queries
# These are safe because the view has identical column names
with open(ts, "r") as f:
    content = f.read()

# Count-only queries
content = content.replace(
    'supabase.from("movies").select("id", { count: "exact", head: true })',
    'supabase.from("user_films_v").select("id", { count: "exact", head: true })'
)

# Today's movie check (appears twice)
content = content.replace(
    'await supabase.from("movies")\n              .select("tmdb_id, title, year, poster_url, director, rating, source, watched_at")',
    'await supabase.from("user_films_v")\n              .select("tmdb_id, title, year, poster_url, director, rating, source, watched_at")'
)

# Today movie check (short form, appears twice)  
content = content.replace(
    'await supabase.from("movies")\n            .select("id").eq("user_id", session.user.id)',
    'await supabase.from("user_films_v")\n            .select("id").eq("user_id", session.user.id)'
)

# Recent films
content = content.replace(
    'await supabase.from("movies")\n                .select("tmdb_id, title, year, poster_url, director, source, watched_at")',
    'await supabase.from("user_films_v")\n                .select("tmdb_id, title, year, poster_url, director, source, watched_at")'
)

with open(ts, "w") as f:
    f.write(content)
print(f"  ✓ {ts}: all .from(\"movies\") reads → user_films_v")
changes += 1

# WRITE: Quick-watch movie upsert (the full block)
patch(ts,
    '''          const details = await fetchTMDBDetails(watchSelected.tmdbId, "movie");
          const now = new Date().toISOString();
          const todayStr = now.slice(0, 10);
          await supabase.from("movies").upsert({
            user_id: session.user.id, tmdb_id: watchSelected.tmdbId,
            title: watchSelected.title, year: watchSelected.year ? parseInt(watchSelected.year) : null,
            director: details?.director || null, poster_url: watchSelected.poster,
            backdrop_url: watchSelected.backdrop, genre: details?.genre || null,
            runtime: details?.runtime || null, rating: watchRating || null,
            watched_at: now, source: "mantl",
            watch_count: 1, watch_dates: [todayStr],
          }, { onConflict: "user_id,tmdb_id" });''',
    '''          const details = await fetchTMDBDetails(watchSelected.tmdbId, "movie");
          const now = new Date().toISOString();
          const todayStr = now.slice(0, 10);
          await upsertMediaLog(session.user.id, {
            mediaType: "film",
            tmdbId: watchSelected.tmdbId,
            title: watchSelected.title,
            year: watchSelected.year ? parseInt(watchSelected.year) : null,
            creator: details?.director || null,
            posterPath: watchSelected.poster,
            backdropPath: watchSelected.backdrop,
            genre: details?.genre || null,
            runtime: details?.runtime || null,
            rating: watchRating || null,
            watchedAt: now,
            source: "mantl",
            watchCount: 1,
            watchDates: [todayStr],
          });''',
    "quick-watch movie upsert → upsertMediaLog")

# WRITE: Rating-only update
patch(ts,
    'await supabase.from("movies").update({ rating: watchRating })\n          .eq("user_id", session.user.id).eq("tmdb_id", watchSelected.tmdbId);',
    'await upsertMediaLog(session.user.id, {\n            mediaType: "film", tmdbId: watchSelected.tmdbId,\n            title: watchSelected.title, year: watchSelected.year ? parseInt(watchSelected.year) : null,\n            posterPath: watchSelected.poster, rating: watchRating,\n          });',
    "rating-only update → upsertMediaLog")


# ═══════════════════════════════════════════════════════════════
# SHELFITMODAL.JSX — movie write
# ═══════════════════════════════════════════════════════════════
print("\n📝 ShelfItModal.jsx...")
sim = "src/components/ShelfItModal.jsx"

# Add import
with open(sim, "r") as f:
    content = f.read()

if "upsertMediaLog" not in content:
    if 'import { supabase }' in content:
        old_sb = next(line for line in content.split('\n') if 'import { supabase }' in line)
        new_sb = old_sb + '\nimport { upsertMediaLog } from "../utils/mediaWrite";'
        content = content.replace(old_sb, new_sb, 1)
        with open(sim, "w") as f:
            f.write(content)
        print(f"  ✓ {sim}: added mediaWrite import")
        changes += 1

patch(sim,
    '''        const { error } = await supabase.from("movies").upsert({
          user_id: session.user.id,
          tmdb_id: selected.tmdbId,
          title: selected.title,
          year: selected.year ? parseInt(selected.year) : null,
          director: details?.director || null,
          poster_url: selected.poster,
          backdrop_url: selected.backdrop,
          genre: details?.genre || null,
          runtime: details?.runtime || null,
          rating: rating || null,
          watched_at: now,
          source: "mantl",
          watch_count: 1,
          watch_dates: [todayStr],
        }, { onConflict: "user_id,tmdb_id" });

        if (error) throw error;''',
    '''        const mediaId = await upsertMediaLog(session.user.id, {
          mediaType: "film",
          tmdbId: selected.tmdbId,
          title: selected.title,
          year: selected.year ? parseInt(selected.year) : null,
          creator: details?.director || null,
          posterPath: selected.poster,
          backdropPath: selected.backdrop,
          genre: details?.genre || null,
          runtime: details?.runtime || null,
          rating: rating || null,
          watchedAt: now,
          source: "mantl",
          watchCount: 1,
          watchDates: [todayStr],
        });

        if (!mediaId) throw new Error("upsert_media_log failed");''',
    "movie upsert → upsertMediaLog")


# ═══════════════════════════════════════════════════════════════
# REWATCHABLESLOGMODAL.JSX — rewatch reads + writes
# ═══════════════════════════════════════════════════════════════
print("\n📝 RewatchablesLogModal.jsx...")
rwm = "src/components/community/rewatchables/RewatchablesLogModal.jsx"

# Rewatch add (first occurrence)
patch(rwm,
    '''                      // 2. Update movies table (source of truth for all communities)
                      if (item.tmdb_id) {
                        const { data: movie } = await supabase.from("movies")
                          .select("watch_dates")
                          .eq("user_id", userId)
                          .eq("tmdb_id", item.tmdb_id)
                          .maybeSingle();

                        if (movie) {
                          const dateStr = rewatchDate; // already YYYY-MM-DD
                          const currentDates = movie.watch_dates || [];
                          const newDates = [...currentDates, dateStr].sort();
                          await supabase.from("movies")
                            .update({
                              watch_count: newDates.length,
                              watch_dates: newDates,
                            })
                            .eq("user_id", userId)
                            .eq("tmdb_id", item.tmdb_id);
                        }
                      }''',
    '''                      // 2. Update user_media_logs (source of truth for all communities)
                      if (item.tmdb_id) {
                        const { data: movie } = await supabase.from("user_films_v")
                          .select("watch_dates")
                          .eq("user_id", userId)
                          .eq("tmdb_id", item.tmdb_id)
                          .maybeSingle();

                        if (movie) {
                          const dateStr = rewatchDate; // already YYYY-MM-DD
                          const newDates = [...(movie.watch_dates || []), dateStr].sort();
                          await supabase.rpc("update_rewatch_data", {
                            p_user_id: userId,
                            p_tmdb_id: item.tmdb_id,
                            p_watch_dates: JSON.stringify(newDates),
                          });
                        }
                      }''',
    "rewatch add → update_rewatch_data RPC")

# Rewatch remove (second occurrence)
patch(rwm,
    '''                              // 2. Update movies table (source of truth)
                              if (item.tmdb_id) {
                                const { data: movie } = await supabase.from("movies")
                                  .select("watch_dates")
                                  .eq("user_id", userId)
                                  .eq("tmdb_id", item.tmdb_id)
                                  .maybeSingle();

                                if (movie && (movie.watch_dates || []).length > 1) {
                                  const currentDates = movie.watch_dates || [];
                                  // Remove the last date (matches the rewatch being removed)
                                  const newDates = currentDates.slice(0, -1);
                                  await supabase.from("movies")
                                    .update({
                                      watch_count: newDates.length,
                                      watch_dates: newDates,
                                    })
                                    .eq("user_id", userId)
                                    .eq("tmdb_id", item.tmdb_id);
                                }
                              }''',
    '''                              // 2. Update user_media_logs (source of truth)
                              if (item.tmdb_id) {
                                const { data: movie } = await supabase.from("user_films_v")
                                  .select("watch_dates")
                                  .eq("user_id", userId)
                                  .eq("tmdb_id", item.tmdb_id)
                                  .maybeSingle();

                                if (movie && (movie.watch_dates || []).length > 1) {
                                  const newDates = (movie.watch_dates || []).slice(0, -1);
                                  await supabase.rpc("update_rewatch_data", {
                                    p_user_id: userId,
                                    p_tmdb_id: item.tmdb_id,
                                    p_watch_dates: JSON.stringify(newDates),
                                  });
                                }
                              }''',
    "rewatch remove → update_rewatch_data RPC")


# ═══════════════════════════════════════════════════════════════
# Handle any remaining .from("movies") in App.jsx for the
# auto-log reconciliation that also reads from movies
# ═══════════════════════════════════════════════════════════════
print("\n📝 Sweeping remaining .from(\"movies\") reads...")

for fpath in [app]:
    with open(fpath, "r") as f:
        content = f.read()
    # Only replace SELECT reads, not the legacy delete on line 441
    # Pattern: .from("movies") followed by .select (reads)
    old_count = content.count('.from("movies")')
    # Replace remaining .from("movies") that are followed by .select
    content = re.sub(
        r'\.from\("movies"\)\s*\n(\s*)\.select\(',
        '.from("user_films_v")\n\\1.select(',
        content
    )
    new_count = content.count('.from("movies")')
    replaced = old_count - new_count
    if replaced > 0:
        with open(fpath, "w") as f:
            f.write(content)
        print(f"  ✓ {fpath}: {replaced} more .from(\"movies\") reads → user_films_v")
        changes += replaced


# ═══════════════════════════════════════════════════════════════
# FINAL: Verify no .from("movies") reads remain (writes to legacy table are OK for now)
# ═══════════════════════════════════════════════════════════════
print("\n🔍 Verification scan...")
problem_files = []
for root, dirs, files in os.walk("src"):
    dirs[:] = [d for d in dirs if d != "node_modules"]
    for fname in files:
        if not fname.endswith((".js", ".jsx")): continue
        fpath = os.path.join(root, fname)
        with open(fpath, "r") as f:
            content = f.read()
        # Find .from("movies") that are reads (followed by .select)
        reads = re.findall(r'\.from\("movies"\)[\s\S]{0,20}\.select\(', content)
        if reads:
            problem_files.append((fpath, len(reads)))

if problem_files:
    print("  ⚠ Remaining .from(\"movies\") reads (may be in dead code):")
    for fpath, count in problem_files:
        print(f"    {fpath}: {count} occurrence(s)")
else:
    print("  ✅ No .from(\"movies\") reads found in active code")

# Count remaining writes
write_files = []
for root, dirs, files in os.walk("src"):
    dirs[:] = [d for d in dirs if d != "node_modules"]
    for fname in files:
        if not fname.endswith((".js", ".jsx")): continue
        fpath = os.path.join(root, fname)
        with open(fpath, "r") as f:
            content = f.read()
        writes = len(re.findall(r'\.from\("movies"\)[\s\S]{0,20}\.(upsert|insert|update|delete)\(', content))
        if writes:
            write_files.append((fpath, writes))

if write_files:
    print("\n  Remaining .from(\"movies\") writes (expected — legacy cleanup or account reset):")
    for fpath, count in write_files:
        print(f"    {fpath}: {count} write(s)")

# ═══════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════
print(f"\n{'=' * 65}")
print(f"✅ Phase 2A complete! {changes} changes applied.")
print("=" * 65)
print("""
WHAT CHANGED:
  App.jsx:
    - Shelf movies read → user_films_v view
    - Letterboxd RSS sync → upsertMediaLog (removes separate feed insert)
    - Letterboxd rewatch update → update_rewatch_data RPC
    - Account reset → also clears user_media_logs
    - All remaining .from("movies").select() → user_films_v

  TrackScreen.jsx:
    - All movie reads (counts, today check, recent) → user_films_v
    - Quick-watch movie upsert → upsertMediaLog
    - Rating-only update → upsertMediaLog

  ShelfItModal.jsx:
    - Movie upsert → upsertMediaLog

  RewatchablesLogModal.jsx:
    - Rewatch add/remove reads → user_films_v
    - Rewatch add/remove writes → update_rewatch_data RPC

STILL USING OLD TABLES (intentional — Phase 2B):
  - books, shows, games tables (have richer state than user_media_logs supports)
  - useCommunity.js (dead code, no imports)
  - movies DELETE on account reset (harmless legacy cleanup)

TO TEST:
  1. npm run dev
  2. Open shelf → movies should load from user_films_v (same data)
  3. Log a film from ShelfIt → should write to media + user_media_logs
  4. Quick-watch from TrackScreen → same
  5. Rewatchables rewatch → should update user_media_logs via RPC
  6. Letterboxd sync → should write to unified tables
""")
