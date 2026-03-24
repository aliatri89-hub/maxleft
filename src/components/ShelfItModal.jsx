import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import { upsertMediaLog, logGame } from "../utils/mediaWrite";
import { searchTMDB, searchGoogleBooks, searchRAWG, fetchTMDBDetails } from "../utils/api";

function ShelfItModal({ initialCategory, onClose, session, onSaved, onToast }) {
  const [category, setCategory] = useState(initialCategory || null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null); // detail view
  const [rating, setRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const [bookStatus, setBookStatus] = useState("finished"); // "reading" or "finished"
  const [bookFinishDate, setBookFinishDate] = useState("today"); // "today" or "YYYY-MM-DD"
  const [showStatus, setShowStatus] = useState("watching"); // "watching" or "finished"
  const [gameStatus, setGameStatus] = useState("finished"); // "playing" or "finished"
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [addedToWishlist, setAddedToWishlist] = useState(false);
  const searchTimer = useRef(null);
  const categories = ["movie", "show", "book", "game"];

  const addToWishlistFromSearch = async () => {
    if (!session || !selected) return;
    const type = selected.type === "tv" ? "show" : selected.type;
    if (addedToWishlist) {
      // Remove from watchlist
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
      cover_url: selected.type === "book" ? (selected.cover || null) : (selected.poster || selected.cover || null),
      author: selected.author || null,
      year: selected.year ? parseInt(selected.year) : null,
    });
    if (!error) {
      setAddedToWishlist(true);
      if (onToast) onToast("Added to watchlist!");
    }
  };

  // Half-star rating handler: tap left half = n-0.5, tap right half = n
  const handleStarClick = (starNum, isLeftHalf) => {
    const newRating = isLeftHalf ? starNum - 0.5 : starNum;
    setRating(rating === newRating ? 0 : newRating);
  };

  const renderRatingStars = () => {
    return [1, 2, 3, 4, 5].map((n) => {
      const isFull = rating >= n;
      const isHalf = !isFull && rating >= n - 0.5;
      return (
        <div
          key={n}
          className={`star-btn${isFull ? " full" : isHalf ? " half" : ""}`}
        >
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
        if (category === "movie" || category === "show") {
          const type = category === "show" ? "tv" : "movie";
          res = await searchTMDB(query, type);
        } else if (category === "book") {
          res = await searchGoogleBooks(query);
        } else if (category === "game") {
          res = await searchRAWG(query);
        }
      } catch (e) {
        setSearchError(e.message);
      }
      setResults(res);
      setSearching(false);
    }, 500);

    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, category]);

  // Load details when item selected (TMDB only)
  useEffect(() => {
    if (!selected) { setDetails(null); return; }
    if (selected.type === "book") {
      setBookStatus("finished");
      setBookFinishDate("today");
      return;
    }
    if (selected.type === "tv") {
      setShowStatus("watching");
    }
    if (selected.type === "game") {
      setGameStatus("finished");
      setSelectedPlatform(selected.platforms?.[0] || "");
      setDetails({ genre: selected.genres, metacritic: selected.metacritic, platforms: selected.platforms });
      return;
    }
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
      } else if (selected.type === "book") {
        const isReading = bookStatus === "reading";
        const dateStr = bookFinishDate === "today" ? new Date().toISOString().slice(0, 10) : bookFinishDate;
        const mediaId = await upsertMediaLog(session.user.id, {
          mediaType: "book",
          title: selected.title,
          creator: selected.author || null,
          posterPath: selected.cover || null,
          rating: isReading ? null : (rating || null),
          watchedAt: isReading ? null : new Date().toISOString(),
          watchedDate: isReading ? null : dateStr,
          source: "mantl",
          status: isReading ? "watching" : "finished",
        });

        if (!mediaId) throw new Error("upsert_media_log failed");
      } else if (selected.type === "game") {
        const isPlaying = gameStatus === "playing";
        const displayStatus = isPlaying ? "playing" : "beat";
        const mediaId = await logGame(session.user.id,
          { title: selected.title, rawg_id: selected.rawgId, year: selected.year ? parseInt(selected.year) : null, genre: selected.genres },
          selected.cover || null,
          {
            status: displayStatus,
            rating: isPlaying ? null : (rating || null),
            completed_at: isPlaying ? null : new Date().toISOString(),
            platform: selectedPlatform || null,
          }
        );

        if (!mediaId) throw new Error("logGame failed");
      }

      const status = selected.type === "book" ? bookStatus : selected.type === "tv" ? showStatus : selected.type === "game" ? gameStatus : null;

      // Log to feed_activity for friends feed
      const actionMap = {
        movie: "shelved",
        tv: status === "watching" ? "started watching" : "finished",
        book: status === "reading" ? "started reading" : "finished",
        game: status === "playing" ? "started playing" : "finished",
      };
      try {
        // Check for existing feed entry (dedup with Letterboxd sync)
        const feedType = selected.type === "tv" ? "show" : selected.type;
        const { data: existingFeedEntry } = await supabase.from("feed_activity")
          .select("id").eq("user_id", session.user.id).eq("activity_type", feedType)
          .eq("item_title", selected.title).limit(1);

        if (!existingFeedEntry || existingFeedEntry.length === 0) {
          const { error: feedErr } = await supabase.from("feed_activity").insert({
            user_id: session.user.id,
            activity_type: selected.type === "tv" ? "show" : selected.type,
            action: actionMap[selected.type] || "shelved",
            title: selected.title,
            item_title: selected.title,
            item_cover: selected.type === "book" ? (selected.cover || null) : (selected.poster || selected.cover || null),
            item_author: selected.author || details?.director || null,
            item_year: selected.year ? parseInt(selected.year) : null,
            rating: rating ? Math.round(rating) : null,
          });
          if (feedErr) console.error("Feed activity insert failed:", feedErr.message, feedErr.code);
        } else if (rating) {
          await supabase.from("feed_activity").update({ rating: Math.round(rating) }).eq("id", existingFeedEntry[0].id);
        }
      } catch (e) { console.error("Feed activity error:", e); }

      // Auto-remove from wishlist if it was on there
      try {
        const wlType = selected.type === "tv" ? "show" : selected.type;
        await supabase.from("wishlist").delete()
          .eq("user_id", session.user.id).eq("title", selected.title).eq("item_type", wlType);
      } catch {}

      onSaved(selected.type, status);
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

          <button className="shelf-detail-back" onClick={() => { setSelected(null); setRating(0); setDetails(null); setBookStatus("finished"); setAddedToWishlist(false); }}>
            ← Back to results
          </button>

          <div className="shelf-detail">
            <div className="shelf-detail-hero">
              {(selected.poster || selected.cover) ? (
                <img src={selected.poster || selected.cover} className="shelf-detail-poster" alt="" />
              ) : (
                <div className="shelf-detail-poster" />
              )}
              <div className="shelf-detail-info">
                <div className="shelf-detail-title">{selected.title}</div>
                {selected.type === "book" ? (
                  <>
                    {selected.author && <div className="shelf-detail-meta">{selected.author}</div>}
                    {selected.year && <div className="shelf-detail-meta">{selected.year}</div>}
                    {selected.pages && <div className="shelf-detail-meta">{selected.pages} pages</div>}
                  </>
                ) : selected.type === "game" ? (
                  <>
                    {selected.year && <div className="shelf-detail-meta">{selected.year}</div>}
                    {selected.genres && <div className="shelf-detail-meta">{selected.genres}</div>}
                    {selected.metacritic && <div className="shelf-detail-meta" style={{ color: selected.metacritic >= 75 ? "#2d6a2e" : selected.metacritic >= 50 ? "var(--text-dim)" : "#9e3c2f" }}>Metacritic: {selected.metacritic}</div>}
                    {selected.platforms && <div className="shelf-detail-meta">{selected.platforms.slice(0, 4).join(" · ")}</div>}
                  </>
                ) : (
                  <>
                    <div className="shelf-detail-meta">{selected.year}{details?.director ? ` · ${details.director}` : ""}</div>
                    {details?.runtime && <div className="shelf-detail-meta">{details.runtime} min</div>}
                    {details?.genre && <div className="shelf-detail-meta">{details.genre}</div>}
                    {details?.totalSeasons && <div className="shelf-detail-meta">{details.totalSeasons} season{details.totalSeasons > 1 ? "s" : ""} · {details.totalEpisodes} episodes</div>}
                  </>
                )}
              </div>
            </div>

            {(selected.overview || selected.description) && (
              <div className="shelf-detail-overview">{selected.overview || selected.description}</div>
            )}

            {/* Movie-specific: watched vs want to watch */}
            {selected.type === "movie" && (
              <div className="book-status-toggle">
                <button
                  className={`book-status-btn${!addedToWishlist ? " active" : ""}`}
                  onClick={() => {}}
                  style={{ cursor: "default" }}
                >
                  Watched
                </button>
                <button
                  className={`book-status-btn${addedToWishlist ? " active" : ""}`}
                  onClick={addToWishlistFromSearch}
                  style={addedToWishlist ? { color: "var(--sage)" } : {}}
                >
                  {addedToWishlist ? "✓ Listed" : "🎬 Want to Watch"}
                </button>
              </div>
            )}

            {/* Book-specific: reading vs finished toggle + page tracker */}
            {selected.type === "book" && (
              <>
                <div className="book-status-toggle">
                  <button
                    className={`book-status-btn${bookStatus === "reading" ? " active" : ""}`}
                    onClick={() => setBookStatus("reading")}
                  >
                    📖 Currently Reading
                  </button>
                  <button
                    className={`book-status-btn${bookStatus === "finished" ? " active" : ""}`}
                    onClick={() => setBookStatus("finished")}
                  >
                    ✓ Finished
                  </button>
                </div>

                {bookStatus === "finished" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.04em", flexShrink: 0 }}>Finished:</div>
                    <button
                      onClick={() => setBookFinishDate("today")}
                      style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${bookFinishDate === "today" ? "var(--terracotta)" : "var(--border-med)"}`, background: bookFinishDate === "today" ? "var(--terra-glow)" : "var(--cream)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--charcoal)", cursor: "pointer" }}
                    >Today</button>
                    <input
                      type="date"
                      value={bookFinishDate === "today" ? "" : bookFinishDate}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={e => setBookFinishDate(e.target.value || "today")}
                      style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: `1px solid ${bookFinishDate !== "today" ? "var(--terracotta)" : "var(--border-med)"}`, background: bookFinishDate !== "today" ? "var(--terra-glow)" : "var(--cream)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--charcoal)" }}
                    />
                  </div>
                )}
              </>
            )}

            {/* Show-specific: watching vs finished toggle + season/episode picker */}
            {selected.type === "tv" && (
              <>
                <div className="book-status-toggle">
                  <button
                    className={`book-status-btn${showStatus === "watching" ? " active" : ""}`}
                    onClick={() => setShowStatus("watching")}
                  >
                    📺 Currently Watching
                  </button>
                  <button
                    className={`book-status-btn${addedToWishlist ? " active" : ""}`}
                    onClick={addToWishlistFromSearch}
                    style={addedToWishlist ? { color: "var(--sage)" } : {}}
                  >
                    {addedToWishlist ? "✓ Listed" : "🎬 Want to Watch"}
                  </button>
                  <button
                    className={`book-status-btn${showStatus === "finished" ? " active" : ""}`}
                    onClick={() => setShowStatus("finished")}
                  >
                    ✓ Finished
                  </button>
                </div>
              </>
            )}

            {/* Game-specific: playing vs finished + platform picker */}
            {selected.type === "game" && (
              <>
                <div className="book-status-toggle">
                  <button
                    className={`book-status-btn${gameStatus === "playing" ? " active" : ""}`}
                    onClick={() => setGameStatus("playing")}
                  >
                    Currently Playing
                  </button>
                  <button
                    className={`book-status-btn${gameStatus === "finished" ? " active" : ""}`}
                    onClick={() => setGameStatus("finished")}
                  >
                    ✓ Finished
                  </button>
                </div>

                {selected.platforms && selected.platforms.length > 0 && (
                  <div className="page-tracker">
                    <div className="rating-label">Platform</div>
                    <div className="page-tracker-row">
                      <select
                        className="page-input"
                        value={selectedPlatform}
                        onChange={(e) => setSelectedPlatform(e.target.value)}
                        style={{ width: "100%", flex: 1 }}
                      >
                        {selected.platforms.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Rating — show for finished items, all movies */}
            {(selected.type === "movie" || (selected.type === "book" && bookStatus === "finished") || (selected.type === "tv" && showStatus === "finished") || (selected.type === "game" && gameStatus === "finished")) && (
              <div className="rating-section">
                <div className="rating-label">Your Rating</div>
                <div className="star-row">
                  {renderRatingStars()}
                </div>
                {rating > 0 && <div className="rating-display">{rating} / 5</div>}
              </div>
            )}

            <button
              className="btn-shelf-it"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Logging..." :
                selected.type === "tv" ? (showStatus === "watching" ? "Start Watching" : "Log This Show") :
                selected.type === "book" ? (bookStatus === "reading" ? "Start Reading" : "Log This Book") :
                selected.type === "game" ? (gameStatus === "playing" ? "Start Playing" : "Log This Game") :
                "Log This Film"}
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
          placeholder={category === "movie" ? "Search films..." : category === "show" ? "Search shows..." : category === "book" ? "Search books..." : category === "game" ? "Search games..." : "Pick a category below..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus={!!category}
          disabled={!category}
          style={!category ? { opacity: 0.5 } : {}}
        />

        <div className="category-pills">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`pill${category === cat ? " active" : ""}`}
              onClick={() => { setCategory(cat); setQuery(""); setResults([]); }}
            >
              {cat === "movie" ? "🎬 Film" : cat === "show" ? "📺 Show" : cat === "book" ? "📖 Book" : "🎮 Game"}
            </button>
          ))}
        </div>

        {!category && (
          <div className="search-placeholder">
            <div className="search-placeholder-icon">👆</div>
            <div className="search-placeholder-text">
              Pick what you want to shelf
            </div>
          </div>
        )}

        {category && !query && !searching && results.length === 0 && (
          <div className="search-placeholder">
            <div className="search-placeholder-icon">🔍</div>
            <div className="search-placeholder-text">
              {category === "movie" ? "Search for a film you watched" :
               category === "show" ? "Search for a show you're watching" :
               category === "book" ? "Search for a book you read" :
               "Game search coming soon"}
            </div>
          </div>
        )}

        {searching && <div className="search-loading">Searching...</div>}

        {!searching && results.length > 0 && (
          <div className="search-results">
            {results.map((item, idx) => (
              <div
                className="search-result"
                key={item.tmdbId || item.googleId || item.rawgId || idx}
                onClick={() => setSelected(item)}
              >
                {(item.posterSmall || item.cover) ? (
                  <img src={item.posterSmall || item.cover} className="result-poster" alt="" />
                ) : (
                  <div className="result-poster" />
                )}
                <div className="result-info">
                  <div className="result-title">{item.title}</div>
                  <div className="result-meta">
                    {item.type === "book" ? item.author || item.year : item.type === "game" ? (item.year ? `${item.year}${item.platforms?.length ? ` · ${item.platforms[0]}` : ""}` : item.platforms?.[0] || "") : item.year}
                  </div>
                </div>
                <div className="result-type-badge">
                  {item.type === "movie" ? "Film" : item.type === "tv" ? "Show" : item.type === "book" ? "Book" : "Game"}
                </div>
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


export default ShelfItModal;
