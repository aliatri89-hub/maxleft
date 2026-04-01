import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "../../supabase";
import { apiProxy } from "../../utils/api";

/**
 * useMovieNight
 *
 * Phases:  setup → genre → share → swiping → waiting_partner → reveal
 *          setup → join  →       → swiping → waiting_partner → reveal
 */

const STACK_SIZE = 20;
const POLL_MS = 3000;

// Confusable-free code chars
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateCode() {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function useMovieNight(userId) {
  const [phase, setPhase] = useState("setup");
  const [role, setRole] = useState(null);          // "creator" | "joiner"
  const [session, setSession] = useState(null);     // DB session row
  const [stack, setStack] = useState([]);            // array of film objects
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState(null);      // array of tmdb_ids on reveal
  const pollRef = useRef(null);
  const abortRef = useRef(false);

  // ── Cleanup polling on unmount ──
  useEffect(() => () => { clearInterval(pollRef.current); abortRef.current = true; }, []);

  // ── Fetch logged tmdb_ids for a user ──
  const getLoggedIds = useCallback(async (uid) => {
    if (!uid) return new Set();
    const { data } = await supabase
      .from("user_media_logs")
      .select("tmdb_id")
      .eq("user_id", uid)
      .eq("media_type", "film")
      .not("tmdb_id", "is", null);
    return new Set((data || []).map(r => r.tmdb_id));
  }, []);

  // ── Generate stack from TMDB Discover ──
  const generateStack = useCallback(async (genreId, excludeIds) => {
    const pages = [1, 2, 3];
    const allFilms = [];

    for (const page of pages) {
      const params = { page: String(page), vote_count_gte: "100" };
      if (genreId) params.with_genres = String(genreId);
      const data = await apiProxy("tmdb_discover", params);
      if (data?.results) {
        for (const f of data.results) {
          if (!excludeIds.has(f.id) && f.poster_path) {
            allFilms.push({
              tmdb_id: f.id,
              title: f.title,
              year: (f.release_date || "").slice(0, 4),
              poster_path: f.poster_path,
              overview: f.overview || "",
            });
          }
        }
      }
    }

    // Deduplicate and randomly pick STACK_SIZE
    const unique = [...new Map(allFilms.map(f => [f.tmdb_id, f])).values()];
    return shuffle(unique).slice(0, STACK_SIZE);
  }, []);

  // ── CREATE SESSION ──
  const createSession = useCallback(async (genreId, genreName) => {
    if (!userId) return;
    abortRef.current = false;
    setLoading(true);
    setError(null);

    try {
      // 1. Get creator's logged films to exclude
      const loggedIds = await getLoggedIds(userId);

      // 2. Generate stack
      const films = await generateStack(genreId || null, loggedIds);
      if (abortRef.current) return;

      if (films.length < 5) {
        setError("Not enough films found. Try a different genre.");
        setLoading(false);
        return;
      }

      // 3. Insert session with unique code (retry on collision)
      let inserted = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateCode();
        const { data, error: insertErr } = await supabase
          .from("movie_night_sessions")
          .insert({
            code,
            creator_id: userId,
            genre_id: genreId || null,
            genre_name: genreName || null,
            stack: films,
          })
          .select()
          .single();

        if (!insertErr && data) {
          inserted = data;
          break;
        }
        // unique violation → retry with new code
        if (insertErr?.code === "23505") continue;
        throw insertErr;
      }

      if (!inserted) throw new Error("Could not generate unique code");

      setSession(inserted);
      setStack(inserted.stack);
      setRole("creator");
      setPhase("share");
    } catch (err) {
      console.error("[MovieNight] create error:", err);
      setError("Couldn't create session. Try again.");
    }
    setLoading(false);
  }, [userId, getLoggedIds, generateStack]);

  // ── JOIN SESSION ──
  const joinSession = useCallback(async (code) => {
    if (!userId || !code) return;
    abortRef.current = false;
    setLoading(true);
    setError(null);

    try {
      const cleanCode = code.trim().toUpperCase();

      // 1. Look up session by code
      const { data: sess, error: fetchErr } = await supabase
        .from("movie_night_sessions")
        .select("*")
        .eq("code", cleanCode)
        .single();

      if (fetchErr || !sess) {
        setError("Session not found. Check the code.");
        setLoading(false);
        return;
      }

      if (sess.creator_id === userId) {
        setError("You can't join your own session!");
        setLoading(false);
        return;
      }

      if (sess.partner_id && sess.partner_id !== userId) {
        setError("This session already has two players.");
        setLoading(false);
        return;
      }

      // 2. Set partner_id if not already set
      if (!sess.partner_id) {
        const { error: updateErr } = await supabase
          .from("movie_night_sessions")
          .update({ partner_id: userId })
          .eq("id", sess.id);

        if (updateErr) throw updateErr;
        sess.partner_id = userId;
      }

      setSession(sess);
      setStack(sess.stack);
      setRole("joiner");
      setCurrentIndex(0);
      setPhase("swiping");
    } catch (err) {
      console.error("[MovieNight] join error:", err);
      setError("Couldn't join session. Try again.");
    }
    setLoading(false);
  }, [userId]);

  // ── START SWIPING (creator, after sharing code) ──
  const startSwiping = useCallback(() => {
    setCurrentIndex(0);
    setPhase("swiping");
  }, []);

  // ── SWIPE ──
  const swipe = useCallback(async (choice) => {
    if (phase !== "swiping" || currentIndex >= stack.length || !session) return;

    const film = stack[currentIndex];

    // Write swipe to DB (fire-and-forget for speed, errors are non-critical)
    supabase.from("movie_night_swipes").insert({
      session_id: session.id,
      user_id: userId,
      tmdb_id: film.tmdb_id,
      choice,
    }).then(({ error }) => {
      if (error) console.warn("[MovieNight] swipe write error:", error.message);
    });

    const nextIdx = currentIndex + 1;
    const isLast = nextIdx >= stack.length;

    if (isLast) {
      // Mark self as done
      const doneField = role === "creator" ? "creator_done" : "partner_done";
      await supabase
        .from("movie_night_sessions")
        .update({ [doneField]: true })
        .eq("id", session.id);

      // Check if partner is also done
      const { data: freshSession } = await supabase
        .from("movie_night_sessions")
        .select("*")
        .eq("id", session.id)
        .single();

      if (freshSession?.creator_done && freshSession?.partner_done) {
        // Both done → get matches
        const { data: matchData } = await supabase.rpc("movie_night_matches", {
          p_session_id: session.id,
        });
        if (matchData?.ready) {
          const matchedIds = new Set(matchData.matches || []);
          setMatches(stack.filter(f => matchedIds.has(f.tmdb_id)));
        } else {
          setMatches([]);
        }
        setPhase("reveal");
      } else {
        // Start polling for partner
        setPhase("waiting_partner");
        pollRef.current = setInterval(async () => {
          const { data: polled } = await supabase
            .from("movie_night_sessions")
            .select("creator_done, partner_done")
            .eq("id", session.id)
            .single();

          if (polled?.creator_done && polled?.partner_done) {
            clearInterval(pollRef.current);
            const { data: mData } = await supabase.rpc("movie_night_matches", {
              p_session_id: session.id,
            });
            if (mData?.ready) {
              const mIds = new Set(mData.matches || []);
              setMatches(stack.filter(f => mIds.has(f.tmdb_id)));
            } else {
              setMatches([]);
            }
            setPhase("reveal");
          }
        }, POLL_MS);
      }
    } else {
      setCurrentIndex(nextIdx);
    }
  }, [phase, currentIndex, stack, session, role, userId]);

  const swipeRight = useCallback(() => swipe(true), [swipe]);
  const swipeLeft = useCallback(() => swipe(false), [swipe]);

  // ── RESET ──
  const reset = useCallback(() => {
    clearInterval(pollRef.current);
    abortRef.current = true;
    setPhase("setup");
    setRole(null);
    setSession(null);
    setStack([]);
    setCurrentIndex(0);
    setError(null);
    setLoading(false);
    setMatches(null);
  }, []);

  return {
    phase, role, session, stack, currentIndex, error, loading, matches,
    currentFilm: stack[currentIndex] || null,
    remaining: stack.length - currentIndex,
    total: stack.length,
    createSession, joinSession, startSwiping,
    swipeRight, swipeLeft, reset,
  };
}
