import { createContext, useContext, useState, useCallback, useRef } from "react";
import { supabase } from "../supabase";

const ShelvesContext = createContext(null);

export function ShelvesProvider({ children }) {
  const [shelves, setShelves] = useState({ books: [], movies: [], shows: [], games: [], totalItems: 0 });
  const [shelvesLoaded, setShelvesLoaded] = useState(false);
  const lastUserId = useRef(null);

  const loadShelves = useCallback(async (userId) => {
    if (!userId) return;
    lastUserId.current = userId;
    try {
      const [
        { data: allBooks }, { data: activeBooks }, { data: allMovies },
        { data: allShows }, { data: allGames }, { data: allCountries },
      ] = await Promise.all([
        supabase.from("user_books_v").select("id, title, author, cover_url, rating, notes, finished_at, source").eq("user_id", userId).eq("status", "finished").order("finished_at", { ascending: false, nullsFirst: false }),
        supabase.from("user_books_v").select("id, title, author, cover_url, notes, source").eq("user_id", userId).eq("status", "watching"),
        supabase.from("user_films_v").select("id, title, poster_url, rating, year, director, notes, watched_at").eq("user_id", userId).order("watched_at", { ascending: false, nullsFirst: false }),
        supabase.from("user_shows_v").select("id, title, poster_url, tmdb_id, show_status, rating, notes, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("user_games_v").select("id, title, cover_url, genre, game_status, rating, notes, source, external_id, steam_app_id, extra_data, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("countries").select("id, country_code, country_name, status, visit_month, visit_year, trip_month, trip_year, notes, photo_url").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);

      const books = (allBooks || []).map(b => ({ id: b.id, title: b.title, author: b.author, cover: b.cover_url, rating: b.rating, notes: b.notes, finishedAt: b.finished_at, source: b.source || "mantl" }));
      const currentBooks = (activeBooks || []).map(b => ({ id: b.id, title: b.title, author: b.author, cover: b.cover_url, notes: b.notes, isReading: true, source: b.source || "mantl" }));
      const movies = (allMovies || []).map(m => ({ id: m.id, title: m.title, cover: m.poster_url, rating: m.rating, year: m.year, director: m.director, notes: m.notes, watchedAt: m.watched_at }));
      const shows = (allShows || []).sort((a, b) => (a.show_status === "watching" ? -1 : 1) - (b.show_status === "watching" ? -1 : 1)).map(s => ({ id: s.id, title: s.title, cover: s.poster_url, tmdbId: s.tmdb_id, status: s.show_status, isWatching: s.show_status === "watching", rating: s.rating, notes: s.notes }));
      const games = (allGames || []).sort((a, b) => (a.game_status === "playing" ? -1 : 1) - (b.game_status === "playing" ? -1 : 1)).map(g => ({ id: g.id, title: g.title, cover: g.cover_url, platform: g.extra_data?.platform || null, genre: g.genre, status: g.game_status, isPlaying: g.game_status === "playing", isBeat: g.game_status === "beat", rating: g.rating, notes: g.notes, source: g.source || null, externalId: g.external_id || null, steamAppId: g.steam_app_id || null }));
      const countries = (allCountries || []).map(c => ({ id: c.id, countryCode: c.country_code, countryName: c.country_name, flag: "🏳️", status: c.status, visitMonth: c.visit_month, visitYear: c.visit_year, tripMonth: c.trip_month, tripYear: c.trip_year, notes: c.notes, photoUrl: c.photo_url }));

      setShelves({ books: [...currentBooks, ...books], currentBooks, movies, shows, games, countries, totalItems: books.length + movies.length + shows.length + games.length });
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
    setShelves({ books: [], movies: [], shows: [], games: [], totalItems: 0 });
    setShelvesLoaded(false);
  }, []);

  return (
    <ShelvesContext.Provider value={{ shelves, shelvesLoaded, loadShelves, refreshShelves, resetShelves }}>
      {children}
    </ShelvesContext.Provider>
  );
}

export const useShelves = () => useContext(ShelvesContext);
