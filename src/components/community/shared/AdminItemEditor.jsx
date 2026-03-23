import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../../../supabase";
import { searchTMDBRaw, apiProxy } from "../../../utils/api";

const ADMIN_USER_ID = "19410e64-d610-4fab-9c26-d24fafc94696";

/**
 * RSS Feed URLs per community slug.
 * Add new communities here as they launch.
 */
const RSS_FEEDS = {
  // Now Playing Podcast (Podbean)
  npp: "https://feed.podbean.com/nowplayingpodcast/feed.xml",
  nowplaying: "https://feed.podbean.com/nowplayingpodcast/feed.xml",
  "now-playing": "https://feed.podbean.com/nowplayingpodcast/feed.xml",
  // Blank Check (Megaphone)
  blankcheck: "https://feeds.megaphone.fm/blank-check",
  "blank-check": "https://feeds.megaphone.fm/blank-check",
};

/**
 * AdminItemEditor v2 — full admin editor for community_items.
 *
 * Fixes from v1:
 *   - TV show TMDB pick (name/first_air_date)
 *   - episode_url writes to BOTH column + extra_data
 *   - Sort order reflow is now atomic (only runs after successful update)
 *   - Shelf select init edge case
 *
 * New features:
 *   - RSS Episode Browser (fuzzy search, audio preview, auto-fill)
 *   - Poster preview panel (current + new TMDB ID, side by side)
 *   - All missing schema fields (creator, episode_number, air_date, tags, etc.)
 *   - Item UUID + created_at display
 *   - Status flag editor (commentary_only, etc. in extra_data)
 *   - Cross-community indicator
 *
 * Props:
 *   item           — community_items row
 *   userId         — current user ID (only renders for admin)
 *   miniseries     — array of all miniseries for this community [{ id, title }]
 *   communitySlug  — e.g. "npp", "blankcheck" (used for RSS feed lookup)
 *   onSaved        — optional callback after save/delete
 *   onToast        — optional toast callback
 */
export default function AdminItemEditor({
  item,
  userId,
  miniseries = [],
  communitySlug = "",
  onSaved,
  onToast,
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("core"); // core | audio | meta | danger

  // ─── Core fields ───
  const [title, setTitle] = useState(item.title || "");
  const [year, setYear] = useState(item.year || "");
  const [tmdbId, setTmdbId] = useState(item.tmdb_id || "");
  const [tmdbTvId, setTmdbTvId] = useState(item.tmdb_tv_id || "");
  const [shelfId, setShelfId] = useState(item.miniseries_id || "");
  const [sortOrder, setSortOrder] = useState(item.sort_order ?? "");
  const [mediaType, setMediaType] = useState(item.media_type || "film");
  const [creator, setCreator] = useState(item.creator || "");
  const [coverImage, setCoverImage] = useState(
    item.extra_data?.cover_image || item.poster_path || ""
  );
  const [backdropPath, setBackdropPath] = useState(item.backdrop_path || "");
  const [tmdbFetching, setTmdbFetching] = useState(false);

  // ─── Audio / Episode fields ───
  // Read from column first, fall back to extra_data
  const [episodeUrl, setEpisodeUrl] = useState(
    item.episode_url || item.extra_data?.episode_url || ""
  );
  const [episodeTitle, setEpisodeTitle] = useState(
    item.extra_data?.episode_title || ""
  );
  const [episodeNumber, setEpisodeNumber] = useState(item.episode_number || "");
  const [episodeNumberDisplay, setEpisodeNumberDisplay] = useState(
    item.episode_number_display || ""
  );
  const [rssGuid, setRssGuid] = useState(item.rss_guid || "");

  // ─── Meta fields ───
  const [airDate, setAirDate] = useState(item.air_date || "");
  const [genreBucket, setGenreBucket] = useState(item.genre_bucket || "");
  const [tags, setTags] = useState((item.tags || []).join(", "));
  const [relationshipNote, setRelationshipNote] = useState(
    item.relationship_note || ""
  );
  const [commentaryOnly, setCommentaryOnly] = useState(
    item.extra_data?.commentary_only || false
  );
  const [comingSoon, setComingSoon] = useState(
    item.extra_data?.coming_soon || false
  );

  // ─── UI state ───
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ─── TMDB Search ───
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [posterPreview, setPosterPreview] = useState(null); // { current, next }

  // ─── RSS Episode Browser ───
  const [rssEpisodes, setRssEpisodes] = useState([]);
  const [rssLoading, setRssLoading] = useState(false);
  const [rssLoaded, setRssLoaded] = useState(false);
  const [rssFilter, setRssFilter] = useState("");
  const [rssError, setRssError] = useState("");
  const audioRef = useRef(null);
  const [previewingUrl, setPreviewingUrl] = useState("");

  // ─── Quick Match (auto-load top 3 RSS episodes, fuzzy rank) ───
  const [quickMatchEps, setQuickMatchEps] = useState([]);
  const [quickMatchLoading, setQuickMatchLoading] = useState(false);
  const [quickMatchDone, setQuickMatchDone] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);

  // ─── Book cover search ───
  const [coverSearching, setCoverSearching] = useState(false);

  if (userId !== ADMIN_USER_ID) return null;

  // ─── Build poster preview when tmdbId changes ───
  const currentPoster = item.poster_path
    ? item.poster_path.startsWith("http")
      ? item.poster_path
      : `https://image.tmdb.org/t/p/w154${item.poster_path}`
    : null;

  // ─── TMDB Search ───
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchTMDBRaw(searchQuery.trim());
      setSearchResults((results || []).slice(0, 8));
    } catch (e) {
      console.error("[AdminEdit] Search error:", e);
    }
    setSearching(false);
  };

  const handlePickResult = (result) => {
    // FIXED: TV shows use `name` and `first_air_date`, movies use `title` and `release_date`
    const isTV = !!result.first_air_date || result.media_type === "tv";
    const pickedTitle = isTV ? result.name || result.title : result.title || result.name;
    const dateStr = isTV ? result.first_air_date : result.release_date;
    const pickedYear = dateStr ? parseInt(dateStr.split("-")[0]) : "";

    setTitle(pickedTitle);
    setYear(pickedYear);

    if (isTV) {
      setTmdbTvId(result.id);
      setMediaType("show");
    } else {
      setTmdbId(result.id);
      if (mediaType === "show") setMediaType("film");
    }

    // Set poster preview
    if (result.poster_path) {
      setPosterPreview({
        current: currentPoster,
        next: `https://image.tmdb.org/t/p/w154${result.poster_path}`,
        nextPath: result.poster_path,
      });
    }

    setSearchResults([]);
    setSearchQuery("");

    // Auto-fetch details (director, backdrop) — pass ID + type directly
    // since state won't have updated yet
    handleTmdbFetch(result.id, isTV ? "tv" : "movie");
  };

  // ─── RSS Feed Browser ───
  const feedUrl = RSS_FEEDS[communitySlug] || "";

  const loadRssFeed = async () => {
    if (!feedUrl) {
      setRssError("No RSS feed configured for this community.");
      return;
    }
    setRssLoading(true);
    setRssError("");
    try {
      // Use a CORS proxy or fetch via Supabase edge function
      // For now, try direct fetch (works if CORS allows, or use allorigins)
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
      const resp = await fetch(proxyUrl);
      if (!resp.ok) throw new Error(`Feed fetch failed: ${resp.status}`);
      const text = await resp.text();

      // Parse RSS XML
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");
      const items = xml.querySelectorAll("item");
      const episodes = [];

      items.forEach((item, idx) => {
        const epTitle = item.querySelector("title")?.textContent || "";
        const enclosure = item.querySelector("enclosure");
        const audioUrl = enclosure?.getAttribute("url") || "";
        const guid =
          item.querySelector("guid")?.textContent || "";
        const pubDate = item.querySelector("pubDate")?.textContent || "";

        if (audioUrl) {
          episodes.push({
            idx,
            title: epTitle,
            audioUrl,
            guid,
            pubDate,
          });
        }
      });

      setRssEpisodes(episodes);
      setRssLoaded(true);
    } catch (e) {
      console.error("[AdminEdit] RSS load error:", e);
      setRssError(`Failed to load feed: ${e.message}`);
    }
    setRssLoading(false);
  };

  // Fuzzy filter RSS episodes
  const filteredEpisodes = useMemo(() => {
    if (!rssFilter.trim()) return rssEpisodes.slice(0, 30);
    const q = rssFilter.toLowerCase();
    return rssEpisodes
      .filter((ep) => ep.title.toLowerCase().includes(q))
      .slice(0, 30);
  }, [rssEpisodes, rssFilter]);

  const handlePickEpisode = (ep) => {
    setEpisodeUrl(ep.audioUrl);
    setEpisodeTitle(ep.title);
    setRssGuid(ep.guid);
    setPreviewingUrl(ep.audioUrl);
  };

  // ─── Quick Match — auto-load top 3 RSS eps, fuzzy rank, one-tap save ───
  const quickMatchNormalize = (s) => (s || "").toLowerCase()
    .replace(/['']/g, "")
    .replace(/[:\-–—,.!?()[\]"]/g, " ")
    .replace(/\s+/g, " ").trim();

  const quickMatchScore = (filmTitle, epTitle) => {
    const ft = quickMatchNormalize(filmTitle);
    const et = quickMatchNormalize(epTitle);
    if (!ft || !et) return 0;
    // Exact substring match = high score
    if (et.includes(ft)) return 100;
    // Word overlap scoring
    const fWords = ft.split(" ").filter(w => w.length > 2);
    if (fWords.length === 0) return 0;
    const hits = fWords.filter(w => et.includes(w)).length;
    return Math.round((hits / fWords.length) * 80);
  };

  const loadQuickMatch = async () => {
    if (!feedUrl || quickMatchDone) return;
    setQuickMatchLoading(true);
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
      const resp = await fetch(proxyUrl);
      if (!resp.ok) throw new Error(`Feed fetch failed: ${resp.status}`);
      const text = await resp.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");
      const items = xml.querySelectorAll("item");
      const eps = [];
      for (let i = 0; i < Math.min(items.length, 5); i++) {
        const node = items[i];
        const epTitle = node.querySelector("title")?.textContent || "";
        const enclosure = node.querySelector("enclosure");
        const audioUrl = enclosure?.getAttribute("url") || "";
        const guid = node.querySelector("guid")?.textContent || "";
        const pubDate = node.querySelector("pubDate")?.textContent || "";
        if (audioUrl) {
          eps.push({
            title: epTitle, audioUrl, guid, pubDate,
            score: quickMatchScore(title, epTitle),
          });
        }
      }
      // Sort by fuzzy score descending
      eps.sort((a, b) => b.score - a.score);
      setQuickMatchEps(eps);
      setQuickMatchDone(true);
    } catch (e) {
      console.error("[AdminEdit] Quick match error:", e);
    }
    setQuickMatchLoading(false);
  };

  const handleQuickMatch = async (ep) => {
    setQuickSaving(true);
    try {
      // Look up podcast_episodes row by audio_url for the FK
      const { data: peRow } = await supabase
        .from("podcast_episodes")
        .select("id")
        .eq("audio_url", ep.audioUrl)
        .maybeSingle();

      // Build the update — episode_url column + episode_id FK
      // extra_data gets episode_title only (not episode_url — column is source of truth)
      const existingExtra = item.extra_data || {};
      const newExtra = { ...existingExtra };
      newExtra.episode_title = ep.title;
      delete newExtra.episode_url; // column is source of truth

      const updates = {
        episode_url: ep.audioUrl,
        rss_guid: ep.guid,
        extra_data: newExtra,
      };
      if (peRow?.id) updates.episode_id = peRow.id;

      const { error } = await supabase
        .from("community_items")
        .update(updates)
        .eq("id", item.id);

      if (error) throw error;

      // Update local state to reflect the match
      setEpisodeUrl(ep.audioUrl);
      setEpisodeTitle(ep.title);
      setRssGuid(ep.guid);
      if (onToast) onToast(`Linked: ${ep.title} ✓`);
      if (onSaved) onSaved();
    } catch (e) {
      console.error("[AdminEdit] Quick match save error:", e);
      if (onToast) onToast(`Error: ${e.message}`);
    }
    setQuickSaving(false);
  };

  // Auto-load Quick Match when Audio tab opens on unmatched item
  useEffect(() => {
    if (activeTab === "audio" && !episodeUrl && feedUrl && !quickMatchDone && !quickMatchLoading) {
      loadQuickMatch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const toggleAudioPreview = (url) => {
    if (previewingUrl === url && audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setPreviewingUrl("");
    } else {
      setPreviewingUrl(url);
      // Let the audio element handle play via useEffect or direct
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play().catch(() => {});
        }
      }, 50);
    }
  };

  // ─── Google Books cover search ───
  const handleCoverSearch = async () => {
    setCoverSearching(true);
    try {
      const query = item.isbn
        ? `isbn:${item.isbn}`
        : `intitle:${title}+inauthor:${creator || item.creator || ""}`;
      const data = await apiProxy("google_books", { query, max_results: "3" });
      if (data?.items) {
        for (const vol of data.items) {
          const links = vol.volumeInfo?.imageLinks;
          if (links) {
            const url = (links.thumbnail || links.smallThumbnail || "")
              .replace("&edge=curl", "")
              .replace("http://", "https://")
              .replace("zoom=1", "zoom=2");
            if (url) {
              setCoverImage(url);
              break;
            }
          }
        }
      }
    } catch (e) {
      console.error("[AdminEdit] Cover search error:", e);
    }
    setCoverSearching(false);
  };

  // ─── Fetch poster + backdrop from TMDB by ID ───
  const handleTmdbFetch = async (overrideId, overrideType) => {
    const type = overrideType || (mediaType === "show" ? "tv" : "movie");
    const id = overrideId || (mediaType === "show" ? (tmdbTvId || tmdbId) : tmdbId);
    if (!id) return;
    setTmdbFetching(true);
    try {
      const data = await apiProxy("tmdb_details", { tmdb_id: String(id), type });
      if (data) {
        if (data.poster_path) {
          setPosterPreview({
            current: currentPoster,
            next: `https://image.tmdb.org/t/p/w154${data.poster_path}`,
            nextPath: data.poster_path,
          });
        }
        if (data.backdrop_path) {
          setBackdropPath(data.backdrop_path);
        }
        // Auto-fill director/creator from credits
        const dir = data.credits?.crew?.find(c => c.job === "Director");
        if (dir && !creator.trim()) {
          setCreator(dir.name);
        }
        if (onToast) onToast(`Fetched TMDB data for ${data.title || data.name || id}`);
      }
    } catch (e) {
      console.error("[AdminEdit] TMDB fetch error:", e);
    }
    setTmdbFetching(false);
  };

  // ─── SAVE ───
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updates = {
        title: title.trim(),
        year: year ? parseInt(year) : null,
        tmdb_id: tmdbId ? parseInt(tmdbId) : null,
        tmdb_tv_id: tmdbTvId ? parseInt(tmdbTvId) : null,
        sort_order: sortOrder !== "" ? parseInt(sortOrder) : null,
        media_type: mediaType,
        creator: creator.trim() || null,
        episode_number: episodeNumber.trim() || null,
        episode_number_display: episodeNumberDisplay.trim() || null,
        air_date: airDate || null,
        genre_bucket: genreBucket.trim() || null,
        relationship_note: relationshipNote.trim() || null,
        rss_guid: rssGuid.trim() || null,
        tags: tags.trim()
          ? tags.split(",").map((t) => t.trim()).filter(Boolean)
          : null,
      };

      // ─── Episode URL: write to column (source of truth) ───
      updates.episode_url = episodeUrl.trim() || null;

      // ─── Episode ID FK: look up from podcast_episodes ───
      if (episodeUrl.trim()) {
        const { data: peRow } = await supabase
          .from("podcast_episodes")
          .select("id")
          .eq("audio_url", episodeUrl.trim())
          .maybeSingle();
        updates.episode_id = peRow?.id || null;
      } else {
        updates.episode_id = null;
      }

      // ─── Backdrop ───
      updates.backdrop_path = backdropPath.trim() || null;

      // ─── Poster logic ───
      const newTmdbId = tmdbId ? parseInt(tmdbId) : null;
      const mediaTypeChanged = mediaType !== (item.media_type || "film");
      const tmdbIdChanged = (newTmdbId || null) !== (item.tmdb_id || null);
      const isTmdbMedia = mediaType === "film" || mediaType === "show";

      if (isTmdbMedia && (tmdbIdChanged || mediaTypeChanged)) {
        // If we picked a new TMDB result with a poster, set it directly
        if (posterPreview?.nextPath) {
          updates.poster_path = posterPreview.nextPath;
        } else {
          updates.poster_path = null; // force re-fetch
        }
      }

      // ─── Shelf move ───
      if (shelfId && shelfId !== item.miniseries_id) {
        updates.miniseries_id = shelfId;
      }

      // ─── extra_data merge ───
      const existingExtra = item.extra_data || {};
      const newExtra = { ...existingExtra };

      // Episode title in extra_data (episode_url lives in column only)
      if (episodeUrl.trim()) {
        newExtra.episode_title = episodeTitle.trim() || null;
      } else {
        delete newExtra.episode_title;
      }
      delete newExtra.episode_url; // column is source of truth

      // Commentary-only flag
      if (commentaryOnly) {
        newExtra.commentary_only = true;
      } else {
        delete newExtra.commentary_only;
      }

      // Coming soon flag
      if (comingSoon) {
        newExtra.coming_soon = true;
      } else {
        delete newExtra.coming_soon;
      }

      // Cover image for books/games
      if (coverImage.trim() && !isTmdbMedia) {
        newExtra.cover_image = coverImage.trim();
        updates.poster_path = coverImage.trim();
      } else if (!isTmdbMedia) {
        delete newExtra.cover_image;
      } else {
        delete newExtra.cover_image;
      }

      updates.extra_data = Object.keys(newExtra).length > 0 ? newExtra : null;

      // ─── Update the item FIRST, then reflow sort order ───
      // (FIXED: v1 reflowed before update, causing corruption on failure)
      const { error } = await supabase
        .from("community_items")
        .update(updates)
        .eq("id", item.id);

      if (error) {
        if (
          error.message?.includes("idx_community_items_no_dupes") ||
          error.code === "23505"
        ) {
          throw new Error("Duplicate — this TMDB ID already exists on this shelf.");
        }
        throw error;
      }

      // ─── Reflow sort order AFTER successful update ───
      const newSort = sortOrder !== "" ? parseInt(sortOrder) : null;
      const oldSort = item.sort_order;
      const targetShelfId = shelfId || item.miniseries_id;
      const shelfChanged = shelfId && shelfId !== item.miniseries_id;

      if (newSort !== null && (newSort !== oldSort || shelfChanged)) {
        try {
          await supabase.rpc("reflow_sort_order", {
            p_miniseries_id: targetShelfId,
            p_target_sort: newSort,
            p_exclude_item_id: item.id,
          });
        } catch (reflowErr) {
          console.warn("[AdminEdit] Sort reflow warning:", reflowErr);
          // Item is saved — reflow failure is non-critical
        }
      }

      // ─── Bust localStorage cover cache ───
      const coverChanged =
        coverImage.trim() !==
        (item.extra_data?.cover_image || item.poster_path || "");
      if (tmdbIdChanged || mediaTypeChanged || coverChanged) {
        try {
          const cacheKey = "mantl_cover_cache";
          const stored = localStorage.getItem(cacheKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (item.tmdb_id) delete parsed[`tmdb:${item.tmdb_id}`];
            if (item.tmdb_id) delete parsed[`tmdb_tv:${item.tmdb_id}`];
            delete parsed[`book:${item.isbn || item.title}`];
            delete parsed[`book:${title.trim()}`];
            delete parsed[`game:${item.title}`];
            delete parsed[`game:${title.trim()}`];
            if (newTmdbId) delete parsed[`tmdb:${newTmdbId}`];
            if (newTmdbId) delete parsed[`tmdb_tv:${newTmdbId}`];
            localStorage.setItem(cacheKey, JSON.stringify(parsed));
          }
        } catch {}
      }

      setSaved(true);
      setPosterPreview(null);
      if (onToast) onToast("Item updated ✓");
      if (onSaved) onSaved();
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("[AdminEdit] Save error:", e);
      alert("Save failed: " + e.message);
    }
    setSaving(false);
  };

  // ─── DELETE ───
  const handleDelete = async () => {
    if (!confirm(`Delete "${title}" from this community?`)) return;
    setSaving(true);
    try {
      await supabase.from("community_user_progress").delete().eq("item_id", item.id);
      try {
        await supabase.from("badge_items").delete().eq("item_id", item.id);
      } catch {}

      const { error } = await supabase
        .from("community_items")
        .delete()
        .eq("id", item.id);
      if (error) {
        if (error.message?.includes("foreign key") || error.code === "23503") {
          throw new Error(
            "Can't delete — referenced elsewhere. Remove from badges/progress first."
          );
        }
        throw error;
      }
      if (onToast) onToast("Item deleted");
      if (onSaved) onSaved();
    } catch (e) {
      console.error("[AdminEdit] Delete error:", e);
      alert("Delete failed: " + e.message);
    }
    setSaving(false);
  };

  // ─── Collapsed state ───
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "none",
          borderRadius: "50%",
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#555",
          fontSize: 14,
          cursor: "pointer",
          flexShrink: 0,
        }}
        title="Admin: Edit item"
      >
        ⚙
      </button>
    );
  }

  const currentShelf = miniseries.find((m) => m.id === item.miniseries_id);
  const isTmdbMedia = mediaType === "film" || mediaType === "show";

  // ──────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────
  return (
    <div style={S.container}>
      {/* ─── Header ─── */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <span style={S.badge}>Admin Editor</span>
          <span style={S.itemId} title={item.id}>
            {item.id.slice(0, 8)}…
          </span>
          {item.created_at && (
            <span style={S.timestamp}>
              {new Date(item.created_at).toLocaleDateString()}
            </span>
          )}
        </div>
        <button onClick={() => setOpen(false)} style={S.closeBtn}>
          ✕
        </button>
      </div>

      {/* ─── Tabs ─── */}
      <div style={S.tabs}>
        {[
          ["core", "Core"],
          ["audio", "Audio"],
          ["meta", "Meta"],
          ["danger", "Danger"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              ...S.tab,
              ...(activeTab === key ? S.tabActive : {}),
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════
          TAB: CORE — title, TMDB, poster, shelf, sort
          ═══════════════════════════════════════════ */}
      {activeTab === "core" && (
        <div style={S.tabContent}>
          {/* TMDB Search */}
          <div style={{ marginBottom: 10 }}>
            <label style={S.label}>TMDB Search</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search TMDB by title..."
                style={{ ...S.input, flex: 1 }}
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                style={S.smallBtn}
              >
                {searching ? "…" : "Search"}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div style={S.searchResults}>
                {searchResults.map((r) => {
                  const isTV =
                    !!r.first_air_date || r.media_type === "tv";
                  const rTitle = isTV
                    ? r.name || r.title
                    : r.title || r.name;
                  const rDate = isTV
                    ? r.first_air_date
                    : r.release_date;
                  const yr = rDate ? rDate.split("-")[0] : "?";
                  return (
                    <div
                      key={r.id}
                      onClick={() => handlePickResult(r)}
                      style={S.searchRow}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(255,255,255,0.06)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      {r.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w45${r.poster_path}`}
                          style={S.searchThumb}
                          alt=""
                        />
                      ) : (
                        <div style={S.searchThumbEmpty} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={S.searchTitle}>{rTitle}</div>
                        <div style={S.searchMeta}>
                          {yr} · {isTV ? "TV" : "Film"} · tmdb:{r.id}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Poster Preview */}
          {(currentPoster || posterPreview) && (
            <div style={S.posterRow}>
              {currentPoster && (
                <div style={S.posterCol}>
                  <div style={S.posterLabel}>Current</div>
                  <img
                    src={currentPoster}
                    style={S.posterImg}
                    alt="current"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                </div>
              )}
              {posterPreview?.next && (
                <>
                  <div style={S.posterArrow}>→</div>
                  <div style={S.posterCol}>
                    <div style={S.posterLabel}>New</div>
                    <img
                      src={posterPreview.next}
                      style={{
                        ...S.posterImg,
                        border: "2px solid rgba(250,204,21,0.5)",
                      }}
                      alt="new"
                      onError={(e) => (e.target.style.display = "none")}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Fetch from TMDB button */}
          {isTmdbMedia && (tmdbId || tmdbTvId) && (
            <div style={{ marginBottom: 10 }}>
              <button
                onClick={handleTmdbFetch}
                disabled={tmdbFetching}
                style={{
                  ...S.smallBtn,
                  width: "100%",
                  padding: "7px 0",
                  textAlign: "center",
                  background: tmdbFetching ? "rgba(255,255,255,0.04)" : "rgba(250,204,21,0.08)",
                  borderColor: "rgba(250,204,21,0.2)",
                  color: "#facc15",
                }}
              >
                {tmdbFetching ? "Fetching…" : "Fetch Poster + Backdrop from TMDB"}
              </button>
            </div>
          )}

          {/* Backdrop */}
          {isTmdbMedia && (
            <div style={{ marginBottom: 10 }}>
              <label style={S.label}>
                Backdrop {backdropPath ? "✓" : "⚠ missing"}
              </label>
              <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    value={backdropPath}
                    onChange={(e) => setBackdropPath(e.target.value)}
                    placeholder="/abcdef123.jpg (TMDB path or full URL)"
                    style={{ ...S.input, fontSize: 10, color: "#999" }}
                  />
                </div>
                {backdropPath && (
                  <button
                    onClick={() => setBackdropPath("")}
                    style={{ ...S.smallBtn, color: "#e94560", borderColor: "rgba(233,69,96,0.2)", padding: "6px 10px" }}
                  >Clear</button>
                )}
              </div>
              {backdropPath && (
                <img
                  src={backdropPath.startsWith("http") ? backdropPath : `https://image.tmdb.org/t/p/w780${backdropPath}`}
                  alt="backdrop preview"
                  style={{
                    width: "100%", height: 80, objectFit: "cover",
                    borderRadius: 6, marginTop: 6,
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  onError={(e) => (e.target.style.display = "none")}
                />
              )}
            </div>
          )}

          {/* Title */}
          <div style={{ marginBottom: 8 }}>
            <label style={S.label}>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={S.input}
            />
          </div>

          {/* Creator */}
          <div style={{ marginBottom: 8 }}>
            <label style={S.label}>Creator / Director</label>
            <input
              value={creator}
              onChange={(e) => setCreator(e.target.value)}
              placeholder="Director, author, or studio"
              style={S.input}
            />
          </div>

          {/* Year + TMDB ID + TMDB TV ID */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                style={S.input}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>TMDB ID</label>
              <input
                type="number"
                value={tmdbId}
                onChange={(e) => setTmdbId(e.target.value)}
                style={S.input}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>TMDB TV ID</label>
              <input
                type="number"
                value={tmdbTvId}
                onChange={(e) => setTmdbTvId(e.target.value)}
                style={S.input}
              />
            </div>
          </div>

          {/* Media Type + Sort Order */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Media Type</label>
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value)}
                style={{ ...S.input, cursor: "pointer", colorScheme: "dark" }}
              >
                <option value="film">Film</option>
                <option value="show">TV Show</option>
                <option value="book">Book</option>
                <option value="game">Game</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Sort Order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                style={S.input}
              />
            </div>
          </div>

          {/* Book/Game Cover */}
          {!isTmdbMedia && (
            <div style={{ marginBottom: 10 }}>
              <label style={S.label}>
                Cover Image {coverImage ? "✓" : "⚠ missing"}
              </label>
              <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                {coverImage && (
                  <img
                    src={coverImage}
                    alt=""
                    style={S.coverThumb}
                    onError={(e) => (e.target.style.display = "none")}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="Paste cover image URL…"
                    style={S.input}
                  />
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    {mediaType === "book" && (
                      <button
                        onClick={handleCoverSearch}
                        disabled={coverSearching}
                        style={S.smallBtn}
                      >
                        {coverSearching ? "…" : "Search Google Books"}
                      </button>
                    )}
                    {coverImage && (
                      <button
                        onClick={() => setCoverImage("")}
                        style={{ ...S.smallBtn, color: "#e94560", borderColor: "rgba(233,69,96,0.2)" }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Shelf */}
          {miniseries.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <label style={S.label}>
                Shelf{" "}
                {currentShelf ? (
                  <span style={{ color: "#666", fontWeight: 400 }}>
                    (currently: {currentShelf.title})
                  </span>
                ) : (
                  ""
                )}
              </label>
              <select
                value={shelfId}
                onChange={(e) => setShelfId(e.target.value)}
                style={{ ...S.input, cursor: "pointer", colorScheme: "dark" }}
              >
                {miniseries.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}{" "}
                    {m.id === item.miniseries_id ? "(current)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* TMDB link */}
          {(tmdbId || tmdbTvId) && (
            <a
              href={`https://www.themoviedb.org/${
                mediaType === "show" ? "tv" : "movie"
              }/${mediaType === "show" ? tmdbTvId || tmdbId : tmdbId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={S.tmdbLink}
            >
              View on TMDB →
            </a>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TAB: AUDIO — episode URL, RSS browser
          ═══════════════════════════════════════════ */}
      {activeTab === "audio" && (
        <div style={S.tabContent}>
          {/* ─── Quick Match (shown when no audio linked) ─── */}
          {!episodeUrl && feedUrl && (
            <div style={{
              marginBottom: 14, padding: 12, borderRadius: 10,
              background: "rgba(250,204,21,0.04)",
              border: "1px solid rgba(250,204,21,0.12)",
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 8,
              }}>
                <label style={{ ...S.label, marginBottom: 0, color: "#facc15" }}>
                  Quick Match
                </label>
                {quickMatchDone && (
                  <button
                    onClick={() => { setQuickMatchDone(false); setTimeout(loadQuickMatch, 50); }}
                    style={{ ...S.smallBtn, fontSize: 9, padding: "2px 8px" }}
                  >Reload</button>
                )}
              </div>

              {quickMatchLoading && (
                <div style={{ fontSize: 11, color: "#888", padding: "8px 0" }}>
                  Loading latest episodes…
                </div>
              )}

              {quickMatchDone && quickMatchEps.length === 0 && (
                <div style={{ fontSize: 11, color: "#666", padding: "4px 0" }}>
                  No recent episodes found in feed.
                </div>
              )}

              {quickMatchDone && quickMatchEps.map((ep, i) => {
                const isBest = i === 0 && ep.score >= 50;
                return (
                  <div key={ep.guid || i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", borderRadius: 8, marginBottom: 4,
                    background: isBest ? "rgba(250,204,21,0.08)" : "rgba(255,255,255,0.02)",
                    border: isBest ? "1px solid rgba(250,204,21,0.25)" : "1px solid rgba(255,255,255,0.04)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                    onClick={() => !quickSaving && handleQuickMatch(ep)}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleAudioPreview(ep.audioUrl); }}
                      style={S.playBtn}
                      title="Preview audio"
                    >
                      {previewingUrl === ep.audioUrl ? "⏸" : "▶"}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: isBest ? 700 : 500,
                        color: isBest ? "#facc15" : "#ccc",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{ep.title}</div>
                      <div style={{ fontSize: 9, color: "#666" }}>
                        {ep.pubDate ? new Date(ep.pubDate).toLocaleDateString() : ""}
                        {ep.score > 0 && <span style={{ marginLeft: 6, color: ep.score >= 50 ? "#facc15" : "#555" }}>
                          {ep.score}% match
                        </span>}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: "0.06em", flexShrink: 0,
                      color: isBest ? "#facc15" : "#888",
                    }}>
                      {quickSaving ? "…" : "Link"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Current episode info */}
          <div style={{ marginBottom: 10 }}>
            <label style={S.label}>
              Episode URL {episodeUrl ? "🎧" : ""}
            </label>
            <input
              value={episodeUrl}
              onChange={(e) => setEpisodeUrl(e.target.value)}
              placeholder="https://…mp3"
              style={S.input}
            />
          </div>

          {episodeUrl && (
            <div style={{ marginBottom: 10 }}>
              <label style={S.label}>Episode Title</label>
              <input
                value={episodeTitle}
                onChange={(e) => setEpisodeTitle(e.target.value)}
                placeholder="Episode display name"
                style={S.input}
              />
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Episode #</label>
              <input
                value={episodeNumber}
                onChange={(e) => setEpisodeNumber(e.target.value)}
                placeholder="e.g. 142"
                style={S.input}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Display #</label>
              <input
                value={episodeNumberDisplay}
                onChange={(e) => setEpisodeNumberDisplay(e.target.value)}
                placeholder="e.g. S3E5"
                style={S.input}
              />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={S.label}>RSS GUID</label>
            <input
              value={rssGuid}
              onChange={(e) => setRssGuid(e.target.value)}
              placeholder="RSS episode GUID"
              style={{ ...S.input, fontSize: 10, color: "#888" }}
            />
          </div>

          {/* Audio Preview */}
          {episodeUrl && (
            <div style={{ marginBottom: 12 }}>
              <button
                onClick={() => toggleAudioPreview(episodeUrl)}
                style={{
                  ...S.smallBtn,
                  background:
                    previewingUrl === episodeUrl
                      ? "rgba(250,204,21,0.15)"
                      : "rgba(255,255,255,0.08)",
                }}
              >
                {previewingUrl === episodeUrl ? "⏸ Pause" : "▶ Preview Current"}
              </button>
            </div>
          )}

          {/* RSS Feed Browser */}
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: 10,
              marginTop: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <label style={{ ...S.label, marginBottom: 0 }}>
                RSS Episode Browser{" "}
                {rssLoaded && (
                  <span style={{ color: "#22c55e", fontWeight: 400 }}>
                    ({rssEpisodes.length} episodes)
                  </span>
                )}
              </label>
              <button
                onClick={loadRssFeed}
                disabled={rssLoading}
                style={S.smallBtn}
              >
                {rssLoading
                  ? "Loading…"
                  : rssLoaded
                  ? "Reload Feed"
                  : "Load Feed"}
              </button>
            </div>

            {feedUrl && (
              <div
                style={{
                  fontSize: 9,
                  color: "#555",
                  marginBottom: 6,
                  wordBreak: "break-all",
                }}
              >
                {feedUrl}
              </div>
            )}

            {rssError && (
              <div style={{ fontSize: 10, color: "#e94560", marginBottom: 8 }}>
                {rssError}
              </div>
            )}

            {rssLoaded && (
              <>
                <input
                  value={rssFilter}
                  onChange={(e) => setRssFilter(e.target.value)}
                  placeholder="Filter episodes by title…"
                  style={{ ...S.input, marginBottom: 6 }}
                />
                <div style={S.rssList}>
                  {filteredEpisodes.map((ep) => (
                    <div
                      key={ep.guid || ep.idx}
                      style={{
                        ...S.rssRow,
                        background:
                          episodeUrl === ep.audioUrl
                            ? "rgba(250,204,21,0.1)"
                            : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (episodeUrl !== ep.audioUrl)
                          e.currentTarget.style.background =
                            "rgba(255,255,255,0.04)";
                      }}
                      onMouseLeave={(e) => {
                        if (episodeUrl !== ep.audioUrl)
                          e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <button
                        onClick={() => toggleAudioPreview(ep.audioUrl)}
                        style={S.playBtn}
                        title="Preview audio"
                      >
                        {previewingUrl === ep.audioUrl ? "⏸" : "▶"}
                      </button>
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          cursor: "pointer",
                        }}
                        onClick={() => handlePickEpisode(ep)}
                      >
                        <div style={S.rssTitle}>{ep.title}</div>
                        <div style={S.rssMeta}>
                          {ep.pubDate
                            ? new Date(ep.pubDate).toLocaleDateString()
                            : ""}
                        </div>
                      </div>
                      {episodeUrl === ep.audioUrl && (
                        <span
                          style={{
                            fontSize: 10,
                            color: "#facc15",
                            flexShrink: 0,
                          }}
                        >
                          ✓ selected
                        </span>
                      )}
                    </div>
                  ))}
                  {filteredEpisodes.length === 0 && (
                    <div
                      style={{
                        padding: 12,
                        fontSize: 11,
                        color: "#666",
                        textAlign: "center",
                      }}
                    >
                      No episodes match "{rssFilter}"
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Clear episode */}
          {episodeUrl && (
            <button
              onClick={() => {
                setEpisodeUrl("");
                setEpisodeTitle("");
                setRssGuid("");
                setPreviewingUrl("");
              }}
              style={{
                ...S.smallBtn,
                marginTop: 8,
                color: "#e94560",
                borderColor: "rgba(233,69,96,0.2)",
              }}
            >
              Remove episode link
            </button>
          )}

          {/* Hidden audio element */}
          <audio ref={audioRef} style={{ display: "none" }} />
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TAB: META — air_date, tags, genre, flags
          ═══════════════════════════════════════════ */}
      {activeTab === "meta" && (
        <div style={S.tabContent}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Air Date</label>
              <input
                type="date"
                value={airDate}
                onChange={(e) => setAirDate(e.target.value)}
                style={{ ...S.input, colorScheme: "dark" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Genre Bucket</label>
              <input
                value={genreBucket}
                onChange={(e) => setGenreBucket(e.target.value)}
                placeholder="e.g. horror, comedy"
                style={S.input}
              />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={S.label}>Tags (comma-separated)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="franchise, sequel, reboot…"
              style={S.input}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={S.label}>Relationship Note</label>
            <input
              value={relationshipNote}
              onChange={(e) => setRelationshipNote(e.target.value)}
              placeholder="e.g. Covered on the show, bonus episode"
              style={S.input}
            />
          </div>

          {/* Status flags */}
          <div style={{ marginBottom: 10 }}>
            <label style={S.label}>Status Flags</label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "#ccc",
                cursor: "pointer",
                padding: "6px 0",
              }}
            >
              <input
                type="checkbox"
                checked={commentaryOnly}
                onChange={(e) => setCommentaryOnly(e.target.checked)}
                style={{ accentColor: "#facc15" }}
              />
              Commentary Only
              <span style={{ fontSize: 9, color: "#666" }}>
                (Patreon tab — no green card frame)
              </span>
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "#ccc",
                cursor: "pointer",
                padding: "6px 0",
              }}
            >
              <input
                type="checkbox"
                checked={comingSoon}
                onChange={(e) => setComingSoon(e.target.checked)}
                style={{ accentColor: "#facc15" }}
              />
              Coming Soon
              <span style={{ fontSize: 9, color: "#666" }}>
                (episode seeded but not yet aired)
              </span>
            </label>
          </div>

          {/* Debug info */}
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: 10,
              marginTop: 10,
            }}
          >
            <label style={S.label}>Debug</label>
            <div style={{ fontSize: 10, color: "#555", lineHeight: 1.6 }}>
              <div>
                <strong>ID:</strong>{" "}
                <span style={{ fontFamily: "monospace", userSelect: "all" }}>
                  {item.id}
                </span>
              </div>
              <div>
                <strong>Created:</strong>{" "}
                {item.created_at
                  ? new Date(item.created_at).toLocaleString()
                  : "—"}
              </div>
              <div>
                <strong>Shelf ID:</strong>{" "}
                <span style={{ fontFamily: "monospace" }}>
                  {item.miniseries_id || "—"}
                </span>
              </div>
              {item.extra_data && (
                <details style={{ marginTop: 4 }}>
                  <summary style={{ cursor: "pointer", color: "#777" }}>
                    extra_data
                  </summary>
                  <pre
                    style={{
                      fontSize: 9,
                      color: "#666",
                      whiteSpace: "pre-wrap",
                      marginTop: 4,
                    }}
                  >
                    {JSON.stringify(item.extra_data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TAB: DANGER — save, delete
          ═══════════════════════════════════════════ */}
      {activeTab === "danger" && (
        <div style={S.tabContent}>
          <div
            style={{
              padding: 12,
              background: "rgba(233,69,96,0.06)",
              borderRadius: 8,
              border: "1px solid rgba(233,69,96,0.15)",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#e94560",
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Delete Item
            </div>
            <div style={{ fontSize: 10, color: "#999", marginBottom: 10 }}>
              This will permanently remove "{title}" from this community, including
              all user progress and badge items linked to it.
            </div>
            <button
              onClick={handleDelete}
              disabled={saving}
              style={{
                padding: "8px 20px",
                background: "rgba(233,69,96,0.15)",
                border: "1px solid rgba(233,69,96,0.3)",
                borderRadius: 8,
                color: "#e94560",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {saving ? "Deleting…" : "Delete Item"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Global Save Button (visible on all tabs except danger) ─── */}
      {activeTab !== "danger" && (
        <div style={{ padding: "0 12px 12px" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%",
              padding: "10px 0",
              background: saved
                ? "#22c55e"
                : "rgba(250,204,21,0.15)",
              border: saved
                ? "1px solid #22c55e"
                : "1px solid rgba(250,204,21,0.3)",
              borderRadius: 8,
              color: saved ? "#000" : "#facc15",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════
const S = {
  container: {
    marginBottom: 14,
    background: "rgba(250,204,21,0.03)",
    border: "1px solid rgba(250,204,21,0.12)",
    borderRadius: 12,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px 0",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    fontSize: 9,
    fontWeight: 700,
    color: "#facc15",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  itemId: {
    fontSize: 9,
    color: "#555",
    fontFamily: "monospace",
  },
  timestamp: {
    fontSize: 9,
    color: "#444",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#666",
    fontSize: 14,
    cursor: "pointer",
    padding: "2px 6px",
  },
  tabs: {
    display: "flex",
    gap: 0,
    padding: "8px 12px 0",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  tab: {
    flex: 1,
    padding: "6px 0",
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    color: "#666",
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  tabActive: {
    color: "#facc15",
    borderBottomColor: "#facc15",
  },
  tabContent: {
    padding: "10px 12px",
  },
  label: {
    display: "block",
    fontSize: 9,
    fontWeight: 600,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 3,
  },
  input: {
    width: "100%",
    padding: "6px 8px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 6,
    color: "#e0e0e0",
    fontSize: 12,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  smallBtn: {
    padding: "4px 12px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 6,
    color: "#ccc",
    fontSize: 11,
    cursor: "pointer",
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
  searchResults: {
    marginTop: 6,
    maxHeight: 240,
    overflowY: "auto",
    background: "rgba(0,0,0,0.35)",
    borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.08)",
  },
  searchRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 8px",
    cursor: "pointer",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  searchThumb: {
    width: 28,
    height: 42,
    borderRadius: 3,
    objectFit: "cover",
  },
  searchThumbEmpty: {
    width: 28,
    height: 42,
    borderRadius: 3,
    background: "rgba(255,255,255,0.05)",
  },
  searchTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: "#fff",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  searchMeta: {
    fontSize: 9,
    color: "#888",
  },
  posterRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    padding: 8,
    background: "rgba(0,0,0,0.2)",
    borderRadius: 8,
  },
  posterCol: {
    textAlign: "center",
  },
  posterLabel: {
    fontSize: 8,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 4,
  },
  posterImg: {
    width: 60,
    height: 90,
    borderRadius: 4,
    objectFit: "cover",
  },
  posterArrow: {
    fontSize: 16,
    color: "#facc15",
  },
  coverThumb: {
    width: 36,
    height: 54,
    borderRadius: 3,
    objectFit: "cover",
    flexShrink: 0,
  },
  tmdbLink: {
    display: "block",
    marginTop: 4,
    fontSize: 9,
    color: "rgba(255,255,255,0.25)",
    textDecoration: "none",
  },
  rssList: {
    maxHeight: 280,
    overflowY: "auto",
    background: "rgba(0,0,0,0.25)",
    borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.06)",
  },
  rssRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 8px",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  playBtn: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#facc15",
    fontSize: 10,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rssTitle: {
    fontSize: 11,
    color: "#ddd",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  rssMeta: {
    fontSize: 9,
    color: "#666",
  },
};
