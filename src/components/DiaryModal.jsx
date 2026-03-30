import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import { upsertMediaLog } from "../utils/mediaWrite";
import { searchTMDB, fetchTMDBDetails } from "../utils/api";

function DiaryModal({ initialCategory, onClose, session, onSaved, onToast }) {
  const [category, setCategory] = useState(initialCategory || null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [rating, setRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const [showStatus, setShowStatus] = useState("watching");
  const [addedToWishlist, setAddedToWishlist] = useState(false);
  const [markedWatched, setMarkedWatched] = useState(false);
  const searchTimer = useRef(null);
  const categories = ["movie", "show"];

  // Warm up the api-proxy edge function on mount so first search isn't slow
  useEffect(() => {
    supabase.functions.invoke("api-proxy", { body: { action: "ping" } }).catch(() => {});
  }, []);

  const addToWishlistFromSearch = async () => {
    if (!session || !selected) return;
    const type = selected.type === "tv" ? "show" : selected.type;
    if (addedToWishlist) {
      const { error } = await supabase.from("wishlist").delete()
        .eq("user_id", session.user.id).eq("title", selected.title).eq("item_type", type);
      if (!error) {
        setAddedToWishlist(false);
        if (onToast) onToast("Removed from watchlist");
      }
      return;
    }
    const { error } = await supabase.from("wishlist").insert({
      user_id: session.user.id,
      item_type: type,
      title: selected.title,
      cover_url: selected.poster || selected.cover || null,
      year: selected.year ? parseInt(selected.year) : null,
    });
    if (!error) {
      setAddedToWishlist(true);
      if (onToast) onToast("Added to watchlist!");
    }
  };

  const handleStarClick = (starNum, isLeftHalf) => {
    const newRating = isLeftHalf ? starNum - 0.5 : starNum;
    setRating(rating === newRating ? 0 : newRating);
  };

  const renderRatingStars = () => {
    return [1, 2, 3, 4, 5].map((n) => {
      const isFull = rating >= n;
      const isHalf = !isFull && rating >= n - 0.5;
      return (
        <div key={n} className={`star-btn${isFull ? " full" : isHalf ? " half" : ""}`}>
          <div className="star-half-zone left" onClick={() => handleStarClick(n, true)} />
          <div className="star-half-zone right" onClick={() => handleStarClick(n, false)} />
          {isFull ? "★" : isHalf ? "⯨" : "☆"}
        </div>
      );
    });
  };

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query || query.length < 2 || !category) { setResults([]); setSearching(false); return; }

    setSearching(true);
    setResults([]);
    setSearchError(null);
    searchTimer.current = setTimeout(async () => {
      let res = [];
      try {
        const type = category === "show" ? "tv" : "movie";
        res = await searchTMDB(query, type);
      } catch (e) {
        setSearchError(e.message);
      }
      setResults(res);
      setSearching(false);
    }, 500);

    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, category]);

  // Load details when item selected
  useEffect(() => {
    if (!selected) { setDetails(null); return; }
    if (selected.type === "tv") setShowStatus("watching");
    const loadDetails = async () => {
      const d = await fetchTMDBDetails(selected.tmdbId, selected.type);
      setDetails(d);
    };
    loadDetails();
  }, [selected]);

  const handleSave = async () => {
    if (!selected || !session) return;
    setSaving(true);

    try {
      if (selected.type === "movie") {
        const now = new Date().toISOString();
        const todayStr = now.slice(0, 10);
        const mediaId = await upsertMediaLog(session.user.id, {
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
        if (!mediaId) throw new Error("upsert_media_log failed");
      } else if (selected.type === "tv") {
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
        if (!mediaId) throw new Error("upsert_media_log failed");
      }

      // Auto-remove from wishlist if it was on there
      try {
        const wlType = selected.type === "tv" ? "show" : selected.type;
        await supabase.from("wishlist").delete()
          .eq("user_id", session.user.id).eq("title", selected.title).eq("item_type", wlType);
      } catch {}

      onSaved(selected.type, selected.type === "tv" ? showStatus : null);
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      setSaving(false);
    }
  };

  // Detail view
  if (selected) {
    return (
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal-sheet">
          <div className="modal-handle" />
          <button className="shelf-detail-back" onClick={() => { setSelected(null); setRating(0); setDetails(null); setAddedToWishlist(false); setMarkedWatched(false); }}>
            ← Back to results
          </button>
          <div className="shelf-detail">
            <div className="shelf-detail-hero">
              {selected.poster ? (
                <img src={selected.poster} className="shelf-detail-poster" loading="lazy" alt="" />
              ) : (
                <div className="shelf-detail-poster" />
              )}
              <div className="shelf-detail-info">
                <div className="shelf-detail-title">{selected.title}</div>
                <div className="shelf-detail-meta">{selected.year}{details?.director ? ` · ${details.director}` : ""}</div>
                {details?.runtime && <div className="shelf-detail-meta">{details.runtime} min</div>}
                {details?.genre && <div className="shelf-detail-meta">{details.genre}</div>}
                {details?.totalSeasons && <div className="shelf-detail-meta">{details.totalSeasons} season{details.totalSeasons > 1 ? "s" : ""} · {details.totalEpisodes} episodes</div>}
              </div>
            </div>
            {selected.overview && (
              <div className="shelf-detail-overview">{selected.overview}</div>
            )}

            {selected.type === "movie" && (
              <div className="book-status-toggle">
                <button className={`book-status-btn${markedWatched ? " active" : ""}`} onClick={() => setMarkedWatched(true)}>Watched</button>
                <button className={`book-status-btn${addedToWishlist ? " active" : ""}`} onClick={() => { addToWishlistFromSearch(); setMarkedWatched(false); }} style={addedToWishlist ? { color: "var(--sage)" } : {}}>
                  {addedToWishlist ? "✓ Listed" : "🎬 Want to Watch"}
                </button>
              </div>
            )}

            {selected.type === "tv" && (
              <div className="book-status-toggle">
                <button className={`book-status-btn${showStatus === "watching" ? " active" : ""}`} onClick={() => setShowStatus("watching")}>📺 Currently Watching</button>
                <button className={`book-status-btn${addedToWishlist ? " active" : ""}`} onClick={addToWishlistFromSearch} style={addedToWishlist ? { color: "var(--sage)" } : {}}>
                  {addedToWishlist ? "✓ Listed" : "🎬 Want to Watch"}
                </button>
                <button className={`book-status-btn${showStatus === "finished" ? " active" : ""}`} onClick={() => setShowStatus("finished")}>✓ Finished</button>
              </div>
            )}

            {(selected.type === "movie" || (selected.type === "tv" && showStatus === "finished")) && (
              <div className="rating-section">
                <div className="rating-label">Your Rating</div>
                <div className="star-row">{renderRatingStars()}</div>
                {rating > 0 && <div className="rating-display">{rating} / 5</div>}
              </div>
            )}

            <button className="btn-shelf-it" onClick={handleSave} disabled={saving}>
              {saving ? "Logging..." : selected.type === "tv" ? (showStatus === "watching" ? "Start Watching" : "Log This Show") : "Log This Film"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Search view
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title bb">Log It</div>
        <div className="modal-sub">Search for something to add to your library.</div>

        <input
          className="search-input"
          type="text"
          placeholder={category === "movie" ? "Search films..." : category === "show" ? "Search shows..." : "Pick a category below..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus={!!category}
          disabled={!category}
          style={!category ? { opacity: 0.5 } : {}}
        />

        <div className="category-pills">
          {categories.map((cat) => (
            <button key={cat} className={`pill${category === cat ? " active" : ""}`} onClick={() => { setCategory(cat); setQuery(""); setResults([]); }}>
              {cat === "movie" ? "🎬 Film" : "📺 Show"}
            </button>
          ))}
        </div>

        {!category && (
          <div className="search-placeholder">
            <div className="search-placeholder-icon">👆</div>
            <div className="search-placeholder-text">Pick what you want to log</div>
          </div>
        )}

        {category && !query && !searching && results.length === 0 && (
          <div className="search-placeholder">
            <div className="search-placeholder-icon">🔍</div>
            <div className="search-placeholder-text">
              {category === "movie" ? "Search for a film you watched" : "Search for a show you're watching"}
            </div>
          </div>
        )}

        {searching && <div className="search-loading">Searching...</div>}

        {!searching && results.length > 0 && (
          <div className="search-results">
            {results.map((item, idx) => (
              <div className="search-result" key={item.tmdbId || idx} onClick={() => setSelected(item)}>
                {item.posterSmall ? (
                  <img src={item.posterSmall} className="result-poster" loading="lazy" alt="" />
                ) : (
                  <div className="result-poster" />
                )}
                <div className="result-info">
                  <div className="result-title">{item.title}</div>
                  <div className="result-meta">{item.year}</div>
                </div>
                <div className="result-type-badge">{item.type === "movie" ? "Film" : "Show"}</div>
              </div>
            ))}
          </div>
        )}

        {!searching && category && query.length >= 2 && results.length === 0 && (
          <div className="search-placeholder">
            <div className="search-placeholder-icon">😕</div>
            <div className="search-placeholder-text">
              {searchError ? `Error: ${searchError}` : `No results for "${query}"`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DiaryModal;
