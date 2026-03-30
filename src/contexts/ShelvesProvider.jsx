import { createContext, useContext, useState, useCallback, useRef } from "react";
import { supabase } from "../supabase";

const ShelvesContext = createContext(null);

export function ShelvesProvider({ children }) {
  const [shelves, setShelves] = useState({ movies: [], shows: [], totalItems: 0 });
  const [shelvesLoaded, setShelvesLoaded] = useState(false);
  const lastUserId = useRef(null);

  const loadShelves = useCallback(async (userId) => {
    if (!userId) return;
    lastUserId.current = userId;
    try {
      const [
        { data: allMovies }, { data: allShows },
      ] = await Promise.all([
        supabase.from("user_films_v").select("id, title, poster_url, rating, year, director, notes, watched_at").eq("user_id", userId).order("watched_at", { ascending: false, nullsFirst: false }),
        supabase.from("user_shows_v").select("id, title, poster_url, tmdb_id, show_status, rating, notes, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);

      const movies = (allMovies || []).map(m => ({ id: m.id, title: m.title, cover: m.poster_url, rating: m.rating, year: m.year, director: m.director, notes: m.notes, watchedAt: m.watched_at }));
      const shows = (allShows || []).sort((a, b) => (a.show_status === "watching" ? -1 : 1) - (b.show_status === "watching" ? -1 : 1)).map(s => ({ id: s.id, title: s.title, cover: s.poster_url, tmdbId: s.tmdb_id, status: s.show_status, isWatching: s.show_status === "watching", rating: s.rating, notes: s.notes }));

      setShelves({ movies, shows, totalItems: movies.length + shows.length });
    } catch (err) {
      console.error("[Shelves] Failed to load:", err);
    }
    setShelvesLoaded(true);
  }, []);

  const refreshShelves = useCallback(() => {
    if (lastUserId.current) return loadShelves(lastUserId.current);
  }, [loadShelves]);

  const resetShelves = useCallback(() => {
    lastUserId.current = null;
    setShelves({ movies: [], shows: [], totalItems: 0 });
    setShelvesLoaded(false);
  }, []);

  return (
    <ShelvesContext.Provider value={{ shelves, shelvesLoaded, loadShelves, refreshShelves, resetShelves }}>
      {children}
    </ShelvesContext.Provider>
  );
}

export const useShelves = () => useContext(ShelvesContext);
