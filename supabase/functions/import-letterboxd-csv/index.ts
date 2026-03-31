// supabase/functions/import-letterboxd-csv/index.ts
//
// SERVER-SIDE Letterboxd CSV import.
// Accepts pre-parsed items from the client, processes TMDB lookups + DB writes
// + community progress backfill + badge checks entirely server-side.
//
// Streams progress back as NDJSON (newline-delimited JSON) so the client can
// show a live progress bar even if the user backgrounds the app.
//
// Deploy: supabase functions deploy import-letterboxd-csv

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TMDB_BASE = "https://api.themoviedb.org/3";
const CONCURRENCY = 6;
const TMDB_DELAY_MS = 150;
const DB_BATCH = 100;

// ── TMDB helpers ─────────────────────────────────────────────

function toPosterPath(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return url;
  const match = url.match(/\/t\/p\/[^/]+(\/.*)/);
  return match ? match[1] : url;
}

async function searchTMDB(apiKey: string, title: string, year: number | null): Promise<any | null> {
  const yearParam = year ? `&year=${year}` : "";
  const url = `${TMDB_BASE}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(title)}&page=1${yearParam}&include_adult=false`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.results?.[0] || null;
  } catch {
    return null;
  }
}

// ── Process a single film ─────────────────────────────────────

interface ParsedItem {
  title: string;
  year: number | null;
  rating: number | null;
  ratingHalf: number | null;
  watchedDate: string | null;
  watchDates: string[];
  watchCount: number;
  rewatch: boolean;
  source: string;
}

async function processItem(
  item: ParsedItem,
  userId: string,
  tmdbKey: string,
  supabase: any
): Promise<{ tmdbId: number; rating: number | null; watchedAt: string } | null> {
  const match = await searchTMDB(tmdbKey, item.title, item.year);
  if (!match) return null;

  const watchDates = (item.watchDates || [])
    .filter(Boolean)
    .map((d: string) => {
      try { return new Date(d).toISOString().slice(0, 10); }
      catch { return null; }
    })
    .filter(Boolean)
    .sort() as string[];

  if (watchDates.length === 0) {
    watchDates.push(new Date().toISOString().slice(0, 10));
  }

  const watchedAt = item.watchedDate
    ? new Date(item.watchedDate + "T12:00:00Z").toISOString()
    : new Date().toISOString();

  const { error } = await supabase.rpc("upsert_media_log", {
    p_user_id: userId,
    p_media_type: "film",
    p_tmdb_id: match.id,
    p_title: item.title,
    p_year: item.year || (match.release_date ? parseInt(match.release_date) : null),
    p_creator: null,
    p_poster_path: toPosterPath(match.poster_path),
    p_backdrop_path: toPosterPath(match.backdrop_path),
    p_runtime: null,
    p_genre: null,
    p_rating: item.ratingHalf || item.rating || null,
    p_watched_at: watchedAt,
    p_watched_date: item.watchedDate || null,
    p_source: "letterboxd",
    p_watch_count: watchDates.length,
    p_watch_dates: watchDates,
    p_status: "finished",
    p_extra_data: {},
  });

  if (error) {
    console.error(`[import-letterboxd-csv] upsert_media_log error for "${item.title}":`, error.message);
    return null;
  }

  return { tmdbId: match.id, rating: item.ratingHalf || item.rating || null, watchedAt };
}

// ── Community progress backfill ───────────────────────────────

async function backfillCommunityProgress(
  importedFilms: Array<{ tmdbId: number; rating: number | null; watchedAt: string }>,
  userId: string,
  supabase: any
) {
  if (importedFilms.length === 0) return;

  const allTmdbIds = importedFilms.map(f => f.tmdbId);
  const ratingMap = new Map(importedFilms.map(f => [f.tmdbId, f]));

  const allMatchedItems: any[] = [];
  for (let i = 0; i < allTmdbIds.length; i += DB_BATCH) {
    const { data } = await supabase
      .from("community_items")
      .select("id, tmdb_id")
      .in("tmdb_id", allTmdbIds.slice(i, i + DB_BATCH));
    if (data) allMatchedItems.push(...data);
  }

  if (allMatchedItems.length === 0) return;

  const matchedItemIds = allMatchedItems.map((i: any) => i.id);
  const allExisting: any[] = [];
  for (let i = 0; i < matchedItemIds.length; i += DB_BATCH) {
    const { data } = await supabase
      .from("community_user_progress")
      .select("item_id")
      .eq("user_id", userId)
      .in("item_id", matchedItemIds.slice(i, i + DB_BATCH));
    if (data) allExisting.push(...data);
  }

  const existingSet = new Set(allExisting.map((p: any) => p.item_id));
  const newRows = allMatchedItems
    .filter((item: any) => !existingSet.has(item.id))
    .map((item: any) => {
      const filmData = ratingMap.get(item.tmdb_id);
      return {
        user_id: userId,
        item_id: item.id,
        status: "completed",
        rating: filmData?.rating ? Math.round(filmData.rating) : null,
        completed_at: filmData?.watchedAt || new Date().toISOString(),
        listened_with_commentary: false,
        brown_arrow: false,
        updated_at: new Date().toISOString(),
      };
    });

  for (let i = 0; i < newRows.length; i += DB_BATCH) {
    const { error } = await supabase
      .from("community_user_progress")
      .upsert(newRows.slice(i, i + DB_BATCH), { onConflict: "user_id,item_id" });
    if (error) console.error("[import-letterboxd-csv] backfill upsert error:", error.message);
  }
}

// ── Badge check ───────────────────────────────────────────────

async function checkAndAwardBadges(
  userId: string,
  communityIds: string[],
  supabase: any
): Promise<number> {
  if (communityIds.length === 0) return 0;
  let awarded = 0;

  const { data: allBadges } = await supabase
    .from("badges")
    .select("id, name, image_url, accent_color, community_id, badge_type, miniseries_id, media_type_filter")
    .in("community_id", communityIds)
    .eq("is_active", true);

  if (!allBadges?.length) return 0;

  const { data: earnedRows } = await supabase
    .from("user_badges")
    .select("badge_id")
    .eq("user_id", userId)
    .in("badge_id", allBadges.map((b: any) => b.id));

  const earnedSet = new Set((earnedRows || []).map((r: any) => r.badge_id));
  const unearnedBadges = allBadges.filter((b: any) => !earnedSet.has(b.id));

  // ── miniseries_completion badges ──
  const miniseriesBadges = unearnedBadges.filter((b: any) => b.badge_type === "miniseries_completion" && b.miniseries_id);
  if (miniseriesBadges.length > 0) {
    const msIds = [...new Set(miniseriesBadges.map((b: any) => b.miniseries_id))];
    const allItems: any[] = [];
    for (let i = 0; i < msIds.length; i += DB_BATCH) {
      const { data } = await supabase.from("community_items")
        .select("id, tmdb_id, miniseries_id, media_type")
        .in("miniseries_id", msIds.slice(i, i + DB_BATCH));
      if (data) allItems.push(...data);
    }

    const allTmdbIds = [...new Set(allItems.map((i: any) => i.tmdb_id).filter(Boolean))];
    const completedTmdbSet = new Set<number>();
    for (let i = 0; i < allTmdbIds.length; i += DB_BATCH) {
      const { data } = await supabase
        .from("community_user_progress")
        .select("community_items!inner(tmdb_id)")
        .eq("user_id", userId).eq("status", "completed")
        .in("community_items.tmdb_id", allTmdbIds.slice(i, i + DB_BATCH));
      (data || []).forEach((r: any) => { if (r.community_items?.tmdb_id) completedTmdbSet.add(r.community_items.tmdb_id); });
    }

    for (const badge of miniseriesBadges) {
      const items = allItems.filter((i: any) => i.miniseries_id === badge.miniseries_id && (!badge.media_type_filter || i.media_type === badge.media_type_filter));
      const required = [...new Set(items.map((i: any) => i.tmdb_id).filter(Boolean))];
      if (required.length > 0 && required.every((id: number) => completedTmdbSet.has(id))) {
        const { error } = await supabase.from("user_badges").insert({ user_id: userId, badge_id: badge.id });
        if (!error || error.message.includes("duplicate")) {
          awarded++;
          await supabase.from("user_notifications").upsert({
            user_id: userId, notif_type: "badge_earned", title: "Badge unlocked",
            body: `You earned "${badge.name}"`, image_url: badge.image_url || null,
            payload: { type: "badge_earned", badge_id: badge.id, community_id: badge.community_id },
            ref_key: `badge_earned:${badge.id}`,
          }, { onConflict: "user_id,ref_key", ignoreDuplicates: true });
        }
      }
    }
  }

  // ── item_set_completion badges ──
  const itemSetBadges = unearnedBadges.filter((b: any) => b.badge_type === "item_set_completion");
  if (itemSetBadges.length > 0) {
    const badgeIds = itemSetBadges.map((b: any) => b.id);
    const allBadgeItems: any[] = [];
    for (let i = 0; i < badgeIds.length; i += DB_BATCH) {
      const { data } = await supabase.from("badge_items")
        .select("badge_id, community_items!inner(tmdb_id)")
        .in("badge_id", badgeIds.slice(i, i + DB_BATCH));
      if (data) allBadgeItems.push(...data);
    }

    const badgeItemsMap: Record<string, number[]> = {};
    allBadgeItems.forEach((r: any) => {
      if (!badgeItemsMap[r.badge_id]) badgeItemsMap[r.badge_id] = [];
      if (r.community_items?.tmdb_id) badgeItemsMap[r.badge_id].push(r.community_items.tmdb_id);
    });

    const allSetTmdbIds = [...new Set(Object.values(badgeItemsMap).flat())];
    const completedSetTmdb = new Set<number>();
    for (let i = 0; i < allSetTmdbIds.length; i += DB_BATCH) {
      const { data } = await supabase
        .from("community_user_progress")
        .select("community_items!inner(tmdb_id)")
        .eq("user_id", userId).eq("status", "completed")
        .in("community_items.tmdb_id", allSetTmdbIds.slice(i, i + DB_BATCH));
      (data || []).forEach((r: any) => { if (r.community_items?.tmdb_id) completedSetTmdb.add(r.community_items.tmdb_id); });
    }

    for (const badge of itemSetBadges) {
      const required = [...new Set((badgeItemsMap[badge.id] || []).filter(Boolean))];
      if (required.length > 0 && required.every((id: number) => completedSetTmdb.has(id))) {
        const { error } = await supabase.from("user_badges").insert({ user_id: userId, badge_id: badge.id });
        if (!error || error.message.includes("duplicate")) {
          awarded++;
          await supabase.from("user_notifications").upsert({
            user_id: userId, notif_type: "badge_earned", title: "Badge unlocked",
            body: `You earned "${badge.name}"`, image_url: badge.image_url || null,
            payload: { type: "badge_earned", badge_id: badge.id, community_id: badge.community_id },
            ref_key: `badge_earned:${badge.id}`,
          }, { onConflict: "user_id,ref_key", ignoreDuplicates: true });
        }
      }
    }
  }

  // ── Badge digest ──
  try {
    const { data: freshEarned } = await supabase
      .from("user_badges").select("badge_id").eq("user_id", userId)
      .in("badge_id", unearnedBadges.map((b: any) => b.id));
    const freshEarnedSet = new Set((freshEarned || []).map((r: any) => r.badge_id));
    const stillUnearned = unearnedBadges.filter((b: any) => !freshEarnedSet.has(b.id));

    const progressEntries: Array<{ badge: any; current: number; total: number }> = [];
    for (const badge of stillUnearned) {
      if (badge.badge_type !== "miniseries_completion" || !badge.miniseries_id) continue;
      const { data: items } = await supabase.from("community_items")
        .select("tmdb_id").eq("miniseries_id", badge.miniseries_id);
      const required = [...new Set((items || []).map((i: any) => i.tmdb_id).filter(Boolean))];
      if (!required.length) continue;
      const { data: done } = await supabase.from("community_user_progress")
        .select("community_items!inner(tmdb_id)")
        .eq("user_id", userId).eq("status", "completed")
        .in("community_items.tmdb_id", required);
      const current = new Set((done || []).map((r: any) => r.community_items?.tmdb_id).filter(Boolean)).size;
      if (current > 0 && current < required.length) {
        progressEntries.push({ badge, current, total: required.length });
      }
    }

    if (progressEntries.length > 0) {
      progressEntries.sort((a, b) => (b.current / b.total) - (a.current / a.total));
      const count = progressEntries.length + awarded;
      const topPct = Math.round((progressEntries[0].current / progressEntries[0].total) * 100);
      const body = topPct >= 50
        ? `Your synced films already count toward ${count} badge${count > 1 ? "s" : ""} — you're over halfway to one. Tap to explore.`
        : `Your synced films already count toward ${count} badge${count > 1 ? "s" : ""}. Tap to see how close you are.`;
      await supabase.from("user_notifications").upsert({
        user_id: userId, notif_type: "badge_digest",
        title: "Your library has a head start!", body,
        image_url: progressEntries[0]?.badge?.image_url || null,
        payload: { type: "badge_digest", badge_count: count, top_pct: topPct },
        ref_key: "badge_digest:sync",
        created_at: new Date().toISOString(),
      }, { onConflict: "user_id,ref_key", ignoreDuplicates: true });
    }
  } catch (e: any) {
    console.warn("[import-letterboxd-csv] Badge digest failed:", e.message);
  }

  return awarded;
}

// ── Main handler ──────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── Auth ──
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const tmdbKey = Deno.env.get("TMDB_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Verify JWT to get user_id
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: corsHeaders });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const userId = user.id;
  const supabase = createClient(supabaseUrl, serviceKey);

  // ── Parse body ──
  let items: ParsedItem[] = [];
  let communityIds: string[] = [];
  try {
    const body = await req.json();
    items = body.items || [];
    communityIds = body.communityIds || [];
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: corsHeaders });
  }

  if (items.length === 0) {
    return new Response(JSON.stringify({ count: 0, errs: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // If no communityIds provided, load from DB
  if (communityIds.length === 0) {
    const { data: subs } = await supabase
      .from("user_community_subscriptions")
      .select("community_id")
      .eq("user_id", userId);
    communityIds = (subs || []).map((s: any) => s.community_id);
  }

  // ── Stream NDJSON progress ──
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const write = (obj: object) => writer.write(encoder.encode(JSON.stringify(obj) + "\n"));

  (async () => {
    let count = 0;
    let errs = 0;
    const importedFilms: Array<{ tmdbId: number; rating: number | null; watchedAt: string }> = [];

    await write({ type: "start", total: items.length });

    // Process in concurrent batches
    for (let i = 0; i < items.length; i += CONCURRENCY) {
      const batch = items.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map(item => processItem(item, userId, tmdbKey, supabase))
      );

      for (const result of results) {
        if (result) { count++; importedFilms.push(result); }
        else errs++;
      }

      const progress = Math.min(i + CONCURRENCY, items.length);
      await write({ type: "progress", progress, total: items.length, count, errs });
      await new Promise(r => setTimeout(r, TMDB_DELAY_MS));
    }

    // Backfill community progress
    await write({ type: "status", message: "Syncing community progress…" });
    await backfillCommunityProgress(importedFilms, userId, supabase);

    // Award badges
    await write({ type: "status", message: "Checking badges…" });
    await checkAndAwardBadges(userId, communityIds, supabase);

    await write({ type: "done", count, errs });
    await writer.close();
  })();

  return new Response(readable, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
    },
  });
});
