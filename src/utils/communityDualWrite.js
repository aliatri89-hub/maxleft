import { supabase } from "../supabase";

/**
 * communityDualWrite.js
 * Utility functions for dual-writing community progress to the main shelf tables.
 * Called by useCommunityActions on first log (not updates).
 *
 * Now uses server-side Postgres functions for atomic transactions (P2-3).
 * Film: dual_write_film() — upsert + feed + wishlist in one transaction
 * Book: dual_write_book() — fuzzy match + upsert + feed + wishlist in one transaction
 * Show: dual_write_show() — upsert + feed + wishlist in one transaction
 */

// ─── Film: single RPC call handles movies + feed_activity + wishlist cleanup ──
export async function dualWriteFilm(userId, item, coverUrl, { rating, completed_at } = {}) {
  if (!userId || !item?.tmdb_id) return;

  const { error } = await supabase.rpc("dual_write_film", {
    p_user_id: userId,
    p_tmdb_id: item.tmdb_id,
    p_title: item.title,
    p_year: item.year || null,
    p_director: item.creator || null,
    p_cover_url: coverUrl || null,
    p_rating: rating ? Math.round(rating) : null,
    p_notes: null,
    p_watched_at: completed_at || null,
  });

  if (error) {
    console.warn("[Community] Film dual-write RPC error:", error.message);
  } else {
    console.log(`[Community] Dual-write: "${item.title}" → movies shelf + feed + wishlist cleanup`);
  }
}

// ─── Show: single RPC call handles shows + feed_activity + wishlist cleanup ───
export async function dualWriteShow(userId, item, coverUrl, { rating, completed_at } = {}) {
  if (!userId || !item?.tmdb_id) return;

  const { error } = await supabase.rpc("dual_write_show", {
    p_user_id: userId,
    p_tmdb_id: item.tmdb_id,
    p_title: item.title,
    p_year: item.year || null,
    p_creator: item.creator || null,
    p_cover_url: coverUrl || null,
    p_rating: rating ? Math.round(rating) : null,
    p_notes: null,
    p_watched_at: completed_at || null,
  });

  if (error) {
    console.warn("[Community] Show dual-write RPC error:", error.message);
  } else {
    console.log(`[Community] Dual-write: "${item.title}" → shows shelf + feed + wishlist cleanup`);
  }
}

// ─── Book: single RPC call handles fuzzy match + books + feed + wishlist ──────
export async function dualWriteBook(userId, item, coverUrl, { rating, completed_at } = {}) {
  if (!userId || !item) return;

  const { error } = await supabase.rpc("dual_write_book", {
    p_user_id: userId,
    p_title: item.title,
    p_creator: item.creator || null,
    p_cover_url: coverUrl || null,
    p_rating: rating ? Math.round(rating) : null,
    p_notes: null,
    p_completed_at: completed_at || null,
  });

  if (error) {
    console.warn("[Community] Book dual-write RPC error:", error.message);
  } else {
    console.log(`[Community] Dual-write: "${item.title}" → books shelf + feed + wishlist cleanup`);
  }
}
