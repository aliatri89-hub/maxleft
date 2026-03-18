"""
Phase 2B: Books + Shows client swap to unified media architecture.

Run from project root:
    python refactor_phase2b_books_shows.py

What it does:
  1. mediaWrite.js   - Adds status param to upsertMediaLog + logBook/logShow
  2. App.jsx         - Shelf reads -> user_books_v / user_shows_v
                     - Goodreads sync -> upsertMediaLog
                     - Adds missing mediaWrite import
  3. ShelfItModal    - Book + show writes -> upsertMediaLog
  4. ItemDetailModal - Book/show finish -> user_media_logs update
  5. importUtils.js  - Book dedup -> user_books_v, insert -> upsertMediaLog
"""

import re, sys, os

def replace_once(content, old, new, label=""):
    if old not in content:
        print(f"  SKIP (not found): {label}")
        return content
    count = content.count(old)
    if count > 1:
        print(f"  WARNING: {count} matches for: {label} -- replacing first only")
        return content.replace(old, new, 1)
    print(f"  OK: {label}")
    return content.replace(old, new)


def patch_media_write():
    path = "src/utils/mediaWrite.js"
    print(f"\n=== {path} ===")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Add status param to upsertMediaLog
    content = replace_once(content,
        '  watchCount = 1,\n  watchDates = [],\n} = {}) {\n  if (!userId || !title) return null;\n\n  const { data, error } = await supabase.rpc("upsert_media_log", {',
        '  watchCount = 1,\n  watchDates = [],\n  status = "finished",\n} = {}) {\n  if (!userId || !title) return null;\n\n  const { data, error } = await supabase.rpc("upsert_media_log", {',
        "add status param to destructuring")

    # 2. Add p_status to RPC call
    content = replace_once(content,
        '    p_watch_dates: JSON.stringify(watchDates),\n  });',
        '    p_watch_dates: JSON.stringify(watchDates),\n    p_status: status,\n  });',
        "add p_status to RPC params")

    # 3. Update logShow wrapper
    content = replace_once(content,
        'export async function logShow(userId, item, coverUrl, { rating, completed_at } = {}) {\n  if (!userId || !item?.tmdb_id) return null;\n  return upsertMediaLog(userId, {\n    mediaType: "show",\n    tmdbId: item.tmdb_id,\n    title: item.title,\n    year: item.year || null,\n    creator: item.creator || null,\n    posterPath: coverUrl || item.poster_path || null,\n    rating,\n    watchedAt: completed_at || null,\n  });\n}',
        'export async function logShow(userId, item, coverUrl, { rating, completed_at, status = "finished" } = {}) {\n  if (!userId || !item?.tmdb_id) return null;\n  return upsertMediaLog(userId, {\n    mediaType: "show",\n    tmdbId: item.tmdb_id,\n    title: item.title,\n    year: item.year || null,\n    creator: item.creator || null,\n    posterPath: coverUrl || item.poster_path || null,\n    rating,\n    watchedAt: completed_at || null,\n    status,\n  });\n}',
        "logShow: add status param")

    # 4. Update logBook wrapper
    content = replace_once(content,
        'export async function logBook(userId, item, coverUrl, { rating, completed_at } = {}) {\n  if (!userId || !item) return null;\n  return upsertMediaLog(userId, {\n    mediaType: "book",\n    isbn: item.isbn || null,\n    title: item.title,\n    creator: item.creator || null,\n    posterPath: coverUrl || null,\n    rating,\n    watchedAt: completed_at || null,\n  });\n}',
        'export async function logBook(userId, item, coverUrl, { rating, completed_at, status = "finished" } = {}) {\n  if (!userId || !item) return null;\n  return upsertMediaLog(userId, {\n    mediaType: "book",\n    isbn: item.isbn || null,\n    title: item.title,\n    creator: item.creator || item.author || null,\n    posterPath: coverUrl || null,\n    rating,\n    watchedAt: completed_at || null,\n    status,\n  });\n}',
        "logBook: add status param + author fallback")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def patch_app_jsx():
    path = "src/App.jsx"
    print(f"\n=== {path} ===")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Add mediaWrite import
    content = replace_once(content,
        'import { toLogTimestamp } from "./utils/helpers";',
        'import { toLogTimestamp } from "./utils/helpers";\nimport { upsertMediaLog, toPosterPath } from "./utils/mediaWrite";',
        "add mediaWrite import")

    # 2. Swap books shelf reads to user_books_v
    content = replace_once(content,
        'supabase.from("books").select("id, title, author, cover_url, rating, total_pages, notes, finished_at, source, current_page")\n        .eq("user_id", userId).eq("is_active", false).neq("habit_id", 7).order("finished_at", { ascending: false, nullsFirst: false }),\n      supabase.from("books").select("id, title, author, cover_url, current_page, total_pages, notes, source")\n        .eq("user_id", userId).eq("is_active", true).neq("habit_id", 7),',
        'supabase.from("user_books_v").select("id, title, author, cover_url, rating, notes, finished_at, source")\n        .eq("user_id", userId).eq("status", "finished").order("finished_at", { ascending: false, nullsFirst: false }),\n      supabase.from("user_books_v").select("id, title, author, cover_url, notes, source")\n        .eq("user_id", userId).eq("status", "watching"),',
        "books shelf reads -> user_books_v")

    # 3. Swap shows shelf read to user_shows_v
    content = replace_once(content,
        'supabase.from("shows").select("id, title, poster_url, tmdb_id, status, current_season, current_episode, episodes_watched, total_episodes, total_seasons, rating, notes, created_at")\n        .eq("user_id", userId).order("created_at", { ascending: false }),',
        'supabase.from("user_shows_v").select("id, title, poster_url, tmdb_id, show_status, rating, notes, created_at")\n        .eq("user_id", userId).order("created_at", { ascending: false }),',
        "shows shelf read -> user_shows_v")

    # 4. Update books data mapping (drop dead fields)
    content = replace_once(content,
        '''    const books = (allBooks || []).map((b) => ({
      id: b.id, title: b.title, author: b.author, cover: b.cover_url,
      rating: b.rating, pages: b.total_pages, notes: b.notes,
      finishedAt: b.finished_at, source: b.source || "fiveseven",
    }));

    const currentBooks = (activeBooks || []).map((b) => ({
      id: b.id, title: b.title, author: b.author, cover: b.cover_url,
      currentPage: b.current_page, totalPages: b.total_pages, notes: b.notes,
      isReading: true, source: b.source || "fiveseven",
    }));''',
        '''    const books = (allBooks || []).map((b) => ({
      id: b.id, title: b.title, author: b.author, cover: b.cover_url,
      rating: b.rating, notes: b.notes,
      finishedAt: b.finished_at, source: b.source || "mantl",
    }));

    const currentBooks = (activeBooks || []).map((b) => ({
      id: b.id, title: b.title, author: b.author, cover: b.cover_url,
      notes: b.notes, isReading: true, source: b.source || "mantl",
    }));''',
        "books mapping: drop dead fields")

    # 5. Update shows data mapping (use show_status, drop episode fields)
    content = replace_once(content,
        '''    const shows = (allShows || [])
      .sort((a, b) => (a.status === "watching" ? -1 : 1) - (b.status === "watching" ? -1 : 1))
      .map((s) => ({
        id: s.id, title: s.title, cover: s.poster_url, tmdbId: s.tmdb_id,
        status: s.status, isWatching: s.status === "watching",
        currentSeason: s.current_season, currentEpisode: s.current_episode,
        episodesWatched: s.episodes_watched, totalEpisodes: s.total_episodes,
        totalSeasons: s.total_seasons, rating: s.rating, notes: s.notes,
      }));''',
        '''    const shows = (allShows || [])
      .sort((a, b) => (a.show_status === "watching" ? -1 : 1) - (b.show_status === "watching" ? -1 : 1))
      .map((s) => ({
        id: s.id, title: s.title, cover: s.poster_url, tmdbId: s.tmdb_id,
        status: s.show_status, isWatching: s.show_status === "watching",
        rating: s.rating, notes: s.notes,
      }));''',
        "shows mapping: use show_status, drop episode fields")

    # 6. Goodreads dedup: swap from books to user_books_v, drop goodreads_id
    content = replace_once(content,
        '''      // Get existing books to avoid duplicates (by goodreads_id and title+author)
      const { data: existingBooks } = await supabase.from("books")
        .select("title, author, goodreads_id").eq("user_id", userId);
      const existingGrIds = new Set((existingBooks || []).map(b => b.goodreads_id).filter(Boolean));
      const existingTitleSet = new Set((existingBooks || []).map(b => `${b.title}::${b.author}`));

      // Get existing feed entries for dedup
      const { data: existingFeed } = await supabase.from("feed_activity")
        .select("title, item_title").eq("user_id", userId).eq("activity_type", "book");
      const feedSet = new Set((existingFeed || []).flatMap(f => [f.title, f.item_title].filter(Boolean)));''',
        '''      // Get existing books to avoid duplicates (by title+author)
      const { data: existingBooks } = await supabase.from("user_books_v")
        .select("title, author").eq("user_id", userId);
      const existingTitleSet = new Set((existingBooks || []).map(b => `${b.title}::${b.author}`));''',
        "Goodreads dedup: user_books_v, drop feedSet")

    # 7. Goodreads skip logic: remove goodreads_id check
    content = replace_once(content,
        '''        // Skip if already exists (by goodreads_id or title+author)
        if (bookId && existingGrIds.has(bookId)) {
          if (manual) console.log(`[Goodreads] Skipping (exists by ID): ${title}`);
          continue;
        }
        const dedupKey = `${title}::${authorName}`;
        if (existingTitleSet.has(dedupKey)) {
          if (manual) console.log(`[Goodreads] Skipping (exists by title+author): ${title}`);
          continue;
        }

        existingGrIds.add(bookId);
        existingTitleSet.add(dedupKey);''',
        '''        // Skip if already exists (by title+author)
        const dedupKey = `${title}::${authorName}`;
        if (existingTitleSet.has(dedupKey)) {
          if (manual) console.log(`[Goodreads] Skipping (exists by title+author): ${title}`);
          continue;
        }

        existingTitleSet.add(dedupKey);''',
        "Goodreads skip: drop goodreads_id check")

    # 8. Goodreads processBook: replace with upsertMediaLog
    # Find the old processBook body
    old_process = '''      const processBook = async ({ title, author, bookId, rating, totalPages, userReadAt, coverUrl, isbn }) => {
        // Parse finished date
        let finishedAt = null;
        if (userReadAt) {
          try { finishedAt = new Date(userReadAt).toISOString(); } catch (e) { /* */ }
        }

        const bookRow = {
          user_id: userId,
          title,
          author,
          cover_url: coverUrl && !coverUrl.includes("nophoto") ? coverUrl : null,
          rating,
          total_pages: totalPages,
          finished_at: finishedAt || new Date().toISOString(),
          is_active: false,
          habit_id: 0,
          source: "goodreads",
          goodreads_id: bookId || null,
        };

        const { error: bookErr } = bookId
          ? await supabase.from("books").upsert(bookRow, { onConflict: "user_id,goodreads_id" })
          : await supabase.from("books").insert(bookRow);
        if (bookErr) {
          console.error("[Goodreads] Book insert error:", bookErr.message, bookErr.code);
          return null;
        }

        // Insert feed_activity if recent (14 days for auto, 90 for manual)
        const feedKey = `gr_${title}_${author}`;
        const maxAge = manual ? 90 * 24 * 60 * 60 * 1000 : 14 * 24 * 60 * 60 * 1000;
        const readDate = finishedAt ? new Date(finishedAt) : null;
        const isRecent = readDate && (Date.now() - readDate.getTime()) < maxAge;
        if (!feedSet.has(feedKey) && !feedSet.has(title) && isRecent) {
          const feedRow = {
            user_id: userId, activity_type: "book", action: "finished",
            title: feedKey, item_title: title, item_cover: coverUrl,
            rating,
            metadata: { source: "goodreads", goodreads_user_id: grUserId, read_at: userReadAt },
            created_at: finishedAt || new Date().toISOString(),
          };
          if (author) feedRow.item_author = author;
          const { error: feedInsertErr } = await supabase.from("feed_activity").insert(feedRow);
          if (feedInsertErr) console.error("[Goodreads] Feed insert error:", feedInsertErr.message, feedInsertErr.code);
          feedSet.add(feedKey);
          feedSet.add(title);
        }

        return title;
      };'''

    new_process = '''      const processBook = async ({ title, author, bookId, rating, totalPages, userReadAt, coverUrl, isbn }) => {
        // Parse finished date
        let finishedAt = null;
        if (userReadAt) {
          try { finishedAt = new Date(userReadAt).toISOString(); } catch (e) { /* */ }
        }

        const cleanCover = coverUrl && !coverUrl.includes("nophoto") ? coverUrl : null;

        // Write to media + user_media_logs (unified) -- also handles feed + wishlist
        const mediaId = await upsertMediaLog(userId, {
          mediaType: "book",
          isbn: isbn || null,
          title,
          creator: author,
          posterPath: cleanCover,
          rating: rating || null,
          watchedAt: finishedAt || new Date().toISOString(),
          source: "goodreads",
          status: "finished",
        });

        if (!mediaId) {
          console.error("[Goodreads] upsert_media_log failed for", title);
          return null;
        }

        return title;
      };'''

    content = replace_once(content, old_process, new_process, "Goodreads processBook -> upsertMediaLog")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def patch_shelf_it_modal():
    path = "src/components/ShelfItModal.jsx"
    print(f"\n=== {path} ===")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Replace show write
    old_show = '''      } else if (selected.type === "tv") {
        const isWatching = showStatus === "watching";
        const { error } = await supabase.from("shows").upsert({
          user_id: session.user.id,
          tmdb_id: selected.tmdbId,
          title: selected.title,
          year: selected.year ? parseInt(selected.year) : null,
          poster_url: selected.poster,
          backdrop_url: selected.backdrop,
          genre: details?.genre || null,
          total_episodes: details?.totalEpisodes || null,
          total_seasons: details?.totalSeasons || null,
          status: isWatching ? "watching" : "finished",
          rating: isWatching ? null : (rating || null),
          source: "mantl",
        }, { onConflict: "user_id,tmdb_id" });

        if (error) throw error;'''

    new_show = '''      } else if (selected.type === "tv") {
        const isWatching = showStatus === "watching";
        const mediaId = await upsertMediaLog(session.user.id, {
          mediaType: "show",
          tmdbId: selected.tmdbId,
          title: selected.title,
          year: selected.year ? parseInt(selected.year) : null,
          creator: details?.creator || null,
          posterPath: selected.poster,
          backdropPath: selected.backdrop,
          genre: details?.genre || null,
          rating: isWatching ? null : (rating || null),
          watchedAt: isWatching ? null : new Date().toISOString(),
          source: "mantl",
          status: isWatching ? "watching" : "finished",
        });

        if (!mediaId) throw new Error("upsert_media_log failed");'''

    content = replace_once(content, old_show, new_show, "show write -> upsertMediaLog")

    # Replace book write
    old_book = '''      } else if (selected.type === "book") {
        const isReading = bookStatus === "reading";
        const { error } = await supabase.from("books").insert({
          user_id: session.user.id,
          habit_id: 0,
          title: selected.title,
          author: selected.author || null,
          cover_url: selected.cover || null,
          is_active: isReading,
          started_at: new Date().toISOString(),
          finished_at: isReading ? null : (bookFinishDate === "today" ? new Date().toISOString() : new Date(bookFinishDate + "T12:00:00").toISOString()),
          rating: isReading ? null : (rating || null),
          source: "mantl",
        });

        if (error) throw error;
      } else if (selected.type === "game") {'''

    new_book = '''      } else if (selected.type === "book") {
        const isReading = bookStatus === "reading";
        const finishedAt = isReading ? null : (bookFinishDate === "today" ? new Date().toISOString() : new Date(bookFinishDate + "T12:00:00").toISOString());
        const mediaId = await upsertMediaLog(session.user.id, {
          mediaType: "book",
          title: selected.title,
          creator: selected.author || null,
          posterPath: selected.cover || null,
          rating: isReading ? null : (rating || null),
          watchedAt: finishedAt,
          source: "mantl",
          status: isReading ? "watching" : "finished",
        });

        if (!mediaId) throw new Error("upsert_media_log failed");
      } else if (selected.type === "game") {'''

    content = replace_once(content, old_book, new_book, "book write -> upsertMediaLog")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def patch_item_detail_modal():
    path = "src/components/modals/ItemDetailModal.jsx"
    print(f"\n=== {path} ===")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Book finish
    content = replace_once(content,
        '''      await supabase.from("books").update({
        is_active: false,
        rating: finishRating || null,
        finished_at: new Date().toISOString(),
      }).eq("id", item.id);''',
        '''      await supabase.from("user_media_logs").update({
        status: "finished",
        rating: finishRating || null,
        watched_at: new Date().toISOString(),
      }).eq("id", item.id);''',
        "book finish -> user_media_logs")

    # Show finish
    content = replace_once(content,
        '''      await supabase.from("shows").update({
        status: "finished",
        rating: finishRating || null,
      }).eq("id", item.id);''',
        '''      await supabase.from("user_media_logs").update({
        status: "finished",
        rating: finishRating || null,
        watched_at: new Date().toISOString(),
      }).eq("id", item.id);''',
        "show finish -> user_media_logs")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def patch_import_utils():
    path = "src/utils/importUtils.js"
    print(f"\n=== {path} ===")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Book dedup read
    content = replace_once(content,
        'const { data } = await supabase.from("books").select("title, author").eq("user_id", userId);',
        'const { data } = await supabase.from("user_books_v").select("title, author").eq("user_id", userId);',
        "book dedup -> user_books_v")

    # Book import: replace batch insert with individual upsertMediaLog calls
    old_import = '''  for (let i = 0; i < items.length; i += 10) {
    const chunk = items.slice(i, i + 10);

    // Fetch covers sequentially to avoid 429
    const covers = [];
    for (const b of chunk) {
      const cover = await fetchCover(b.title, b.author);
      covers.push(cover);
      await new Promise(r => setTimeout(r, 350));
    }

    const batch = chunk.map((b, j) => ({
      user_id: userId,
      habit_id: 0,
      title: b.title,
      author: b.author,
      total_pages: b.pages,
      current_page: b.isReading ? 0 : (b.pages || 0),
      cover_url: covers[j] || null,
      is_active: b.isReading,
      started_at: safeDate(b.dateAdded, new Date().toISOString()),
      finished_at: b.isReading ? null : safeDate(b.dateRead),
      rating: (b.rating && b.rating > 0) ? b.rating : null,
      source: b.source,
    }));

    const { error } = await supabase.from("books").insert(batch);
    if (error) { console.error("[Import] Book batch error:", error); errs += batch.length; }
    else count += batch.length;

    if (onProgress) onProgress(Math.min(i + 10, items.length), items.length);

    // Rate limit pause
    if ((i + 1) % 8 === 0) await new Promise(r => setTimeout(r, 1000));
  }'''

    new_import = '''  for (let i = 0; i < items.length; i += 10) {
    const chunk = items.slice(i, i + 10);

    // Fetch covers sequentially to avoid 429
    const covers = [];
    for (const b of chunk) {
      const cover = await fetchCover(b.title, b.author);
      covers.push(cover);
      await new Promise(r => setTimeout(r, 350));
    }

    // Write each book via unified media log
    for (let j = 0; j < chunk.length; j++) {
      const b = chunk[j];
      const isReading = !!b.isReading;
      const mediaId = await upsertMediaLog(userId, {
        mediaType: "book",
        title: b.title,
        creator: b.author || null,
        posterPath: covers[j] || null,
        rating: (b.rating && b.rating > 0) ? b.rating : null,
        watchedAt: isReading ? null : safeDate(b.dateRead),
        source: b.source || "import",
        status: isReading ? "watching" : "finished",
      });
      if (!mediaId) { console.error("[Import] upsert_media_log failed for", b.title); errs++; }
      else count++;
    }

    if (onProgress) onProgress(Math.min(i + 10, items.length), items.length);

    // Rate limit pause
    if ((i + 1) % 8 === 0) await new Promise(r => setTimeout(r, 1000));
  }'''

    content = replace_once(content, old_import, new_import, "book import -> upsertMediaLog")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


if __name__ == "__main__":
    # Check we're in project root
    if not os.path.exists("src/App.jsx"):
        print("ERROR: Run from project root (where src/App.jsx lives)")
        sys.exit(1)

    print("Phase 2B: Books + Shows client swap")
    print("=" * 50)

    patch_media_write()
    patch_app_jsx()
    patch_shelf_it_modal()
    patch_item_detail_modal()
    patch_import_utils()

    print("\n" + "=" * 50)
    print("Done! Verify with: npm run dev")
    print("\nRemaining old table refs are in dead files:")
    print("  - useCommunity.js (zero imports)")
    print("  - TrackScreen.jsx (dead features)")
    print("  - ChallengeScreen.jsx (dead features)")
    print("  - GroupViewScreen.jsx (dead features)")
    print("  - App.jsx account reset (harmless legacy cleanup)")
