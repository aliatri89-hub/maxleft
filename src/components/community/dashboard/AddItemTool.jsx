import { t } from "../../../theme";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "../../../supabase";
import { searchTMDBRaw } from "../../../utils/api";

const TMDB_IMG = "https://image.tmdb.org/t/p";

/**
 * RSS Feed URLs per community slug.
 * Must match the keys in AdminItemEditor.
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

// ── Debounce hook ──────────────────────────────────────────────
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── TMDB search ────────────────────────────────────────────────
async function searchTMDB(query, mediaType = "movie") {
  if (!query || query.length < 2) return [];
  const results = await searchTMDBRaw(query, null, mediaType);
  return (results || []).slice(0, 8);
}

/**
 * AddItemTool v2 — Admin tool for adding items + creating shelves.
 *
 * New in v2:
 *   - Create New Shelf inline (all community_miniseries fields)
 *   - RSS Episode Browser with fuzzy search + audio preview
 *   - Creator/director field
 *   - Fixed media_type (tv → "show")
 *   - episode_url column + extra_data dual-write
 *   - tmdb_tv_id for TV shows
 *   - Book/game support (cover URL, manual entry)
 *   - genre_bucket, tags, relationship_note
 *
 * Props:
 *   community   – community_pages row
 *   miniseries  – full miniseries array
 *   session     – supabase auth session
 *   onClose     – () => void
 *   onAdded     – (newItem) => void
 *   onToast     – (msg) => void
 */
export default function AddItemTool({
  community,
  miniseries = [],
  session,
  onClose,
  onAdded,
  onToast,
}) {
  const accent = community?.theme_config?.accent || "#e94560";
  const communitySlug = community?.slug;

  // ══════════════════════════════════════════════════════════════
  // MODE: "add-item" | "new-shelf"
  // ══════════════════════════════════════════════════════════════
  const [mode, setMode] = useState("add-item");

  // ══════════════════════════════════════════════════════════════
  // SHELF PICKER (for add-item mode)
  // ══════════════════════════════════════════════════════════════
  const seriesOptions = useMemo(() => {
    return miniseries
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((s) => ({
        id: s.id,
        label: s.tab_key ? `[${s.tab_key}] ${s.title}` : s.title,
        title: s.title,
        tab_key: s.tab_key,
        itemCount: (s.items || []).length,
      }));
  }, [miniseries]);

  const [selectedShelves, setSelectedShelves] = useState([]);
  const [shelfSearch, setShelfSearch] = useState("");

  const toggleShelf = useCallback(
    (id) => {
      setSelectedShelves((prev) =>
        prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
      );
    },
    []
  );

  const filteredShelfOptions = useMemo(() => {
    const q = shelfSearch.toLowerCase().trim();
    if (!q) return seriesOptions;
    return seriesOptions.filter(
      (s) =>
        s.label.toLowerCase().includes(q) || s.title.toLowerCase().includes(q)
    );
  }, [seriesOptions, shelfSearch]);

  // ══════════════════════════════════════════════════════════════
  // TMDB SEARCH
  // ══════════════════════════════════════════════════════════════
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("movie"); // movie | tv | manual
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debouncedQuery = useDebounce(searchQuery);
  const searchRef = useRef(null);

  useEffect(() => {
    if (searchType === "manual" || !debouncedQuery || debouncedQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    searchTMDB(debouncedQuery, searchType).then((results) => {
      if (!cancelled) {
        setSearchResults(results);
        setSearching(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, searchType]);

  // ══════════════════════════════════════════════════════════════
  // SELECTED ITEM STATE
  // ══════════════════════════════════════════════════════════════
  const [selectedResult, setSelectedResult] = useState(null);
  const [titleOverride, setTitleOverride] = useState("");
  const [yearOverride, setYearOverride] = useState("");
  const [creatorOverride, setCreatorOverride] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [airDate, setAirDate] = useState("");
  const [episodeDisplay, setEpisodeDisplay] = useState("");
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [genreBucket, setGenreBucket] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [relationshipNote, setRelationshipNote] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");

  // Host verdicts (NPP-specific)
  const [hostUp, setHostUp] = useState("");
  const [hostDown, setHostDown] = useState("");
  const [hostBrown, setHostBrown] = useState("");

  // Audio / Episode
  const [episodeUrl, setEpisodeUrl] = useState("");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [rssGuid, setRssGuid] = useState("");

  // ══════════════════════════════════════════════════════════════
  // RSS EPISODE BROWSER
  // ══════════════════════════════════════════════════════════════
  const [rssEpisodes, setRssEpisodes] = useState([]);
  const [rssLoading, setRssLoading] = useState(false);
  const [rssLoaded, setRssLoaded] = useState(false);
  const [rssFilter, setRssFilter] = useState("");
  const [rssError, setRssError] = useState("");
  const [rssOpen, setRssOpen] = useState(false);
  const audioRef = useRef(null);
  const [previewingUrl, setPreviewingUrl] = useState("");

  const feedUrl = RSS_FEEDS[communitySlug] || "";

  const loadRssFeed = async () => {
    if (!feedUrl) {
      setRssError("No RSS feed configured for this community.");
      return;
    }
    setRssLoading(true);
    setRssError("");
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
      const resp = await fetch(proxyUrl);
      if (!resp.ok) throw new Error(`Feed fetch failed: ${resp.status}`);
      const text = await resp.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");
      const items = xml.querySelectorAll("item");
      const episodes = [];
      items.forEach((item, idx) => {
        const epTitle = item.querySelector("title")?.textContent || "";
        const enclosure = item.querySelector("enclosure");
        const audioUrl = enclosure?.getAttribute("url") || "";
        const guid = item.querySelector("guid")?.textContent || "";
        const pubDate = item.querySelector("pubDate")?.textContent || "";
        if (audioUrl) {
          episodes.push({ idx, title: epTitle, audioUrl, guid, pubDate });
        }
      });
      setRssEpisodes(episodes);
      setRssLoaded(true);
    } catch (e) {
      console.error("[AddItemTool] RSS load error:", e);
      setRssError(`Failed to load feed: ${e.message}`);
    }
    setRssLoading(false);
  };

  const filteredEpisodes = useMemo(() => {
    if (!rssFilter.trim()) return rssEpisodes.slice(0, 30);
    const q = rssFilter.toLowerCase();
    return rssEpisodes.filter((ep) => ep.title.toLowerCase().includes(q)).slice(0, 30);
  }, [rssEpisodes, rssFilter]);

  const handlePickEpisode = (ep) => {
    setEpisodeUrl(ep.audioUrl);
    setEpisodeTitle(ep.title);
    setRssGuid(ep.guid);
  };

  const toggleAudioPreview = (url) => {
    if (previewingUrl === url && audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setPreviewingUrl("");
    } else {
      setPreviewingUrl(url);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play().catch(() => {});
        }
      }, 50);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // DUPLICATE CHECK
  // ══════════════════════════════════════════════════════════════
  const [existingCheck, setExistingCheck] = useState(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (!selectedResult || !community?.id) {
      setExistingCheck(null);
      setEditMode(false);
      return;
    }
    let cancelled = false;
    setExistingCheck(null);
    setEditMode(false);

    async function check() {
      const seriesIds = miniseries.map((m) => m.id);
      if (seriesIds.length === 0) {
        setExistingCheck({ status: "clear" });
        return;
      }
      const { data } = await supabase
        .from("community_items")
        .select("id, title, miniseries_id, extra_data")
        .eq("tmdb_id", selectedResult.id)
        .in("miniseries_id", seriesIds);

      if (!cancelled) {
        if (data && data.length > 0) {
          const match = data[0];
          const ms = miniseries.find((m) => m.id === match.miniseries_id);
          setExistingCheck({
            status: "exists",
            title: match.title,
            shelf: ms?.title || "unknown",
            itemIds: data.map((d) => d.id),
            extraData: match.extra_data || {},
          });
        } else {
          setExistingCheck({ status: "clear" });
        }
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [selectedResult, community?.id, miniseries]);

  // ── Enter edit mode ──
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const enterEditMode = useCallback(() => {
    if (!existingCheck || existingCheck.status !== "exists") return;
    const ed = existingCheck.extraData || {};
    setHostUp(ed.up != null ? String(ed.up) : "");
    setHostDown(ed.down != null ? String(ed.down) : "");
    setHostBrown(ed.brown != null ? String(ed.brown) : "");
    setConfirmDelete(false);
    setEditMode(true);
  }, [existingCheck]);

  // ── Update existing verdicts ──
  const handleUpdate = async () => {
    if (!existingCheck?.itemIds?.length) return;
    setUpdating(true);
    setFeedback(null);
    try {
      const extraData = {};
      if (hostUp !== "") extraData.up = parseInt(hostUp, 10);
      if (hostDown !== "") extraData.down = parseInt(hostDown, 10);
      if (hostBrown !== "") extraData.brown = parseInt(hostBrown, 10);

      const { error } = await supabase
        .from("community_items")
        .update({
          extra_data: Object.keys(extraData).length > 0 ? extraData : null,
        })
        .in("id", existingCheck.itemIds);

      if (error) throw error;

      const title = existingCheck.title || titleOverride;
      setFeedback({
        type: "success",
        msg: `Updated verdicts for "${title}"`,
      });
      if (onToast) onToast(`Updated ${title}! ✓`);
      if (onAdded) onAdded(null);
      resetForm();
    } catch (err) {
      setFeedback({ type: "error", msg: err.message || "Update failed" });
    } finally {
      setUpdating(false);
    }
  };

  // ── Delete existing ──
  const handleDelete = async () => {
    if (!existingCheck?.itemIds?.length) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setFeedback(null);
    try {
      await supabase
        .from("community_user_progress")
        .delete()
        .in("item_id", existingCheck.itemIds);
      await supabase
        .from("badge_items")
        .delete()
        .in("item_id", existingCheck.itemIds)
        .then(() => {})
        .catch(() => {});

      const { error } = await supabase
        .from("community_items")
        .delete()
        .in("id", existingCheck.itemIds);

      if (error) {
        if (error.message?.includes("foreign key") || error.code === "23503") {
          throw new Error("Can't delete — referenced by badges or progress.");
        }
        throw error;
      }

      setFeedback({
        type: "success",
        msg: `Deleted "${existingCheck.title}"`,
      });
      if (onToast) onToast(`Deleted ${existingCheck.title}`);
      if (onAdded) onAdded(null);
      resetForm();
    } catch (err) {
      setFeedback({ type: "error", msg: err.message || "Delete failed" });
    } finally {
      setDeleting(false);
    }
  };

  // ── Select a TMDB result ──
  const handleSelect = useCallback((result) => {
    const isTV = !!result.first_air_date || result.media_type === "tv";
    setSelectedResult(result);
    setTitleOverride(isTV ? result.name || result.title : result.title || result.name);
    const dateStr = isTV ? result.first_air_date : result.release_date;
    setYearOverride(dateStr ? dateStr.split("-")[0] : "");
    setSearchResults([]);
    setSearchQuery("");
    resetFields();
  }, []);

  // ── Manual entry (books/games) ──
  const handleManualConfirm = () => {
    if (!titleOverride.trim()) return;
    setSelectedResult({
      id: null,
      title: titleOverride.trim(),
      poster_path: null,
      _manual: true,
    });
    setSearchResults([]);
    setSearchQuery("");
  };

  // ── Next sort_order ──
  const getNextSortOrder = useCallback(async (shelfId) => {
    if (!shelfId) return 0;
    const { data } = await supabase
      .from("community_items")
      .select("sort_order")
      .eq("miniseries_id", shelfId)
      .order("sort_order", { ascending: false })
      .limit(1);
    return data && data.length > 0 ? (data[0].sort_order || 0) + 1 : 0;
  }, []);

  // ══════════════════════════════════════════════════════════════
  // SAVE ITEM
  // ══════════════════════════════════════════════════════════════
  const handleSave = async () => {
    if (!selectedResult || selectedShelves.length === 0) {
      setFeedback({
        type: "error",
        msg: "Pick a result and at least one shelf.",
      });
      return;
    }
    setSaving(true);
    setFeedback(null);

    try {
      // FIXED: tv → "show", not "film"
      let mediaType = "film";
      if (searchType === "tv") mediaType = "show";
      else if (searchType === "manual") {
        // Infer from context — default to film
        mediaType = "film";
      }

      const extraData = {};
      if (hostUp !== "") extraData.up = parseInt(hostUp, 10);
      if (hostDown !== "") extraData.down = parseInt(hostDown, 10);
      if (hostBrown !== "") extraData.brown = parseInt(hostBrown, 10);
      if (episodeUrl.trim()) {
        extraData.episode_url = episodeUrl.trim();
        if (episodeTitle.trim()) extraData.episode_title = episodeTitle.trim();
      }
      if (coverImageUrl.trim()) extraData.cover_image = coverImageUrl.trim();

      const baseRow = {
        title: titleOverride || selectedResult.title || selectedResult.name,
        year: yearOverride ? parseInt(yearOverride, 10) : null,
        media_type: mediaType,
        poster_path: selectedResult.poster_path || coverImageUrl.trim() || null,
        extra_data: Object.keys(extraData).length > 0 ? extraData : null,
        creator: creatorOverride.trim() || null,
        genre_bucket: genreBucket.trim() || null,
        relationship_note: relationshipNote.trim() || null,
        tags: tagsStr.trim()
          ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean)
          : null,
      };

      // TMDB IDs
      if (selectedResult.id && !selectedResult._manual) {
        if (searchType === "tv") {
          baseRow.tmdb_tv_id = selectedResult.id;
        } else {
          baseRow.tmdb_id = selectedResult.id;
        }
      }

      // Episode fields (dual-write to column + extra_data)
      if (episodeUrl.trim()) baseRow.episode_url = episodeUrl.trim();
      if (rssGuid.trim()) baseRow.rss_guid = rssGuid.trim();
      if (airDate) baseRow.air_date = airDate;
      if (episodeDisplay.trim()) baseRow.episode_number_display = episodeDisplay.trim();
      if (episodeNumber.trim()) baseRow.episode_number = episodeNumber.trim();

      // Build one row per shelf
      const rows = [];
      for (const shelfId of selectedShelves) {
        const so =
          sortOrder !== ""
            ? parseInt(sortOrder, 10)
            : await getNextSortOrder(shelfId);
        rows.push({ ...baseRow, miniseries_id: shelfId, sort_order: so });
      }

      const { data, error } = await supabase
        .from("community_items")
        .insert(rows)
        .select();

      if (error) {
        if (
          error.message?.includes("idx_community_items_no_dupes") ||
          error.code === "23505"
        ) {
          throw new Error(
            `"${baseRow.title}" already exists on one of the selected shelves.`
          );
        }
        throw error;
      }

      const shelfNames = selectedShelves
        .map((id) => seriesOptions.find((s) => s.id === id)?.title || "?")
        .join(", ");
      setFeedback({
        type: "success",
        msg: `Added "${baseRow.title}" → ${shelfNames}`,
      });
      if (onToast) onToast(`Added ${baseRow.title}! ✓`);
      if (onAdded) onAdded(data);
      resetForm();
    } catch (err) {
      setFeedback({ type: "error", msg: err.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // NEW SHELF STATE
  // ══════════════════════════════════════════════════════════════
  const [shelfTitle, setShelfTitle] = useState("");
  const [shelfDirector, setShelfDirector] = useState("");
  const [shelfEmoji, setShelfEmoji] = useState("");
  const [shelfTabKey, setShelfTabKey] = useState("filmography");
  const [shelfStatus, setShelfStatus] = useState("active");
  const [shelfEpisodeRange, setShelfEpisodeRange] = useState("");
  const [shelfYearCovered, setShelfYearCovered] = useState("");
  const [shelfDescription, setShelfDescription] = useState("");
  const [shelfGenreBucket, setShelfGenreBucket] = useState("");
  const [shelfSaving, setShelfSaving] = useState(false);

  const handleCreateShelf = async () => {
    if (!shelfTitle.trim()) {
      setFeedback({ type: "error", msg: "Shelf title is required." });
      return;
    }
    if (!community?.id) {
      setFeedback({ type: "error", msg: "No community ID." });
      return;
    }
    setShelfSaving(true);
    setFeedback(null);

    try {
      // Get next sort_order for shelves
      const { data: existing } = await supabase
        .from("community_miniseries")
        .select("sort_order")
        .eq("community_id", community.id)
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextSort =
        existing && existing.length > 0
          ? (existing[0].sort_order || 0) + 1
          : 0;

      const row = {
        community_id: community.id,
        title: shelfTitle.trim(),
        director_name: shelfDirector.trim() || null,
        director_emoji: shelfEmoji.trim() || null,
        tab_key: shelfTabKey,
        status: shelfStatus,
        episode_range: shelfEpisodeRange.trim() || null,
        year_covered: shelfYearCovered.trim() || null,
        description: shelfDescription.trim() || null,
        genre_bucket: shelfGenreBucket.trim() || null,
        sort_order: nextSort,
      };

      const { data, error } = await supabase
        .from("community_miniseries")
        .insert([row])
        .select();

      if (error) throw error;

      setFeedback({
        type: "success",
        msg: `Created shelf "${shelfTitle.trim()}"! Switch to Add Item to populate it.`,
      });
      if (onToast) onToast(`Shelf "${shelfTitle.trim()}" created! ✓`);
      if (onAdded) onAdded(null); // trigger parent refresh

      // Reset shelf form
      setShelfTitle("");
      setShelfDirector("");
      setShelfEmoji("");
      setShelfEpisodeRange("");
      setShelfYearCovered("");
      setShelfDescription("");
      setShelfGenreBucket("");
      setShelfStatus("active");
      setShelfTabKey("filmography");

      // Auto-select the new shelf and switch to add-item mode
      if (data && data[0]) {
        setSelectedShelves([data[0].id]);
        setMode("add-item");
      }
    } catch (err) {
      setFeedback({ type: "error", msg: err.message || "Shelf creation failed" });
    } finally {
      setShelfSaving(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════
  const resetFields = () => {
    setCreatorOverride("");
    setSortOrder("");
    setAirDate("");
    setEpisodeDisplay("");
    setEpisodeNumber("");
    setGenreBucket("");
    setTagsStr("");
    setRelationshipNote("");
    setCoverImageUrl("");
    setHostUp("");
    setHostDown("");
    setHostBrown("");
    setEpisodeUrl("");
    setEpisodeTitle("");
    setRssGuid("");
  };

  const resetForm = () => {
    setSelectedResult(null);
    setTitleOverride("");
    setYearOverride("");
    resetFields();
    setExistingCheck(null);
    setEditMode(false);
    setConfirmDelete(false);
    setSelectedShelves([]);
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  const showVerdicts = communitySlug === "npp" || communitySlug === "nowplaying";

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          background: "#111118",
          borderRadius: "20px 20px 0 0",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "ait-slide-up 0.25s ease forwards",
        }}
      >
        <style>{`
          @keyframes ait-slide-up {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .ait-scroll::-webkit-scrollbar { display: none; }
        `}</style>

        {/* ─── Header with mode toggle ─── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px 0",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: t.textPrimary,
              fontFamily: t.fontDisplay,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            {mode === "add-item" ? "＋ Add Item" : "＋ New Shelf"}
          </div>
          <button
            onClick={onClose}
            style={{
              background: t.bgInput,
              border: "none",
              borderRadius: 8,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: t.textSecondary,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Mode tabs */}
        <div
          style={{
            display: "flex",
            gap: 0,
            padding: "10px 20px 0",
            borderBottom: `1px solid ${t.borderSubtle}`,
            flexShrink: 0,
          }}
        >
          {[
            ["add-item", "Add Item"],
            ["new-shelf", "New Shelf"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              style={{
                flex: 1,
                padding: "8px 0",
                background: "none",
                border: "none",
                borderBottom: `2px solid ${mode === key ? accent : "transparent"}`,
                color: mode === key ? accent : t.textFaint,
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontFamily: t.fontDisplay,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ─── Scrollable body ─── */}
        <div
          className="ait-scroll"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px 32px",
            scrollbarWidth: "none",
          }}
        >
          {/* Feedback */}
          {feedback && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                marginBottom: 14,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: t.fontDisplay,
                background:
                  feedback.type === "success"
                    ? "rgba(74,222,128,0.1)"
                    : "rgba(239,68,68,0.1)",
                color:
                  feedback.type === "success" ? t.green : t.red,
                border: `1px solid ${
                  feedback.type === "success"
                    ? "rgba(74,222,128,0.2)"
                    : "rgba(239,68,68,0.2)"
                }`,
              }}
            >
              {feedback.type === "success" ? "✓ " : "✗ "}
              {feedback.msg}
            </div>
          )}

          {/* ═══════════════════════════════════════════
              MODE: NEW SHELF
              ═══════════════════════════════════════════ */}
          {mode === "new-shelf" && (
            <div>
              <Label>
                Shelf Title{" "}
                <span style={{ color: t.red }}>*</span>
              </Label>
              <input
                value={shelfTitle}
                onChange={(e) => setShelfTitle(e.target.value)}
                placeholder="e.g. Podrassic Cast"
                style={inputStyle(accent)}
              />

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <Label>Director / Subtitle</Label>
                  <input
                    value={shelfDirector}
                    onChange={(e) => setShelfDirector(e.target.value)}
                    placeholder="e.g. Steven Spielberg"
                    style={inputStyle(accent)}
                  />
                </div>
                <div style={{ width: 64 }}>
                  <Label>Emoji</Label>
                  <input
                    value={shelfEmoji}
                    onChange={(e) => setShelfEmoji(e.target.value)}
                    placeholder="🦖"
                    style={{ ...inputStyle(accent), textAlign: "center", fontSize: 18 }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <Label>Tab</Label>
                  <select
                    value={shelfTabKey}
                    onChange={(e) => setShelfTabKey(e.target.value)}
                    style={{
                      ...selectStyle(accent, true),
                      fontSize: 12,
                      padding: "8px 10px",
                    }}
                  >
                    <option value="filmography" style={{ background: t.bgCard }}>
                      Filmography
                    </option>
                    <option value="patreon" style={{ background: t.bgCard }}>
                      Patreon
                    </option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <Label>Status</Label>
                  <select
                    value={shelfStatus}
                    onChange={(e) => setShelfStatus(e.target.value)}
                    style={{
                      ...selectStyle(accent, true),
                      fontSize: 12,
                      padding: "8px 10px",
                    }}
                  >
                    <option value="active" style={{ background: t.bgCard }}>
                      Active
                    </option>
                    <option value="completed" style={{ background: t.bgCard }}>
                      Completed
                    </option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <Label>Episode Range</Label>
                <input
                  value={shelfEpisodeRange}
                  onChange={(e) => setShelfEpisodeRange(e.target.value)}
                  placeholder="e.g. Eps 142–155"
                  style={inputStyle(accent)}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <Label>Year Covered</Label>
                  <input
                    value={shelfYearCovered}
                    onChange={(e) => setShelfYearCovered(e.target.value)}
                    placeholder="e.g. 1975–1993"
                    style={inputStyle(accent)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Label>Genre Bucket</Label>
                  <input
                    value={shelfGenreBucket}
                    onChange={(e) => setShelfGenreBucket(e.target.value)}
                    placeholder="e.g. horror"
                    style={inputStyle(accent)}
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <Label>Description</Label>
                <textarea
                  value={shelfDescription}
                  onChange={(e) => setShelfDescription(e.target.value)}
                  placeholder="Optional shelf description…"
                  rows={2}
                  style={{
                    ...inputStyle(accent),
                    resize: "vertical",
                    minHeight: 48,
                  }}
                />
              </div>

              {/* Preview */}
              {shelfTitle.trim() && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 10,
                    border: `1px solid ${t.borderSubtle}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: t.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 6,
                    }}
                  >
                    Preview
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {shelfEmoji && (
                      <span style={{ fontSize: 20 }}>{shelfEmoji}</span>
                    )}
                    <div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: t.textPrimary,
                          fontFamily: t.fontDisplay,
                        }}
                      >
                        {shelfTitle}
                      </div>
                      {(shelfDirector || shelfEpisodeRange) && (
                        <div style={{ fontSize: 12, color: t.textSecondary }}>
                          {[
                            shelfDirector !== "." && shelfDirector,
                            shelfEpisodeRange,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleCreateShelf}
                disabled={shelfSaving || !shelfTitle.trim()}
                style={{
                  marginTop: 16,
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 12,
                  background: shelfSaving
                    ? "rgba(255,255,255,0.04)"
                    : `${accent}18`,
                  border: `2px solid ${accent}`,
                  color: t.textPrimary,
                  fontSize: 15,
                  fontWeight: 800,
                  fontFamily: t.fontDisplay,
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                  cursor:
                    shelfSaving || !shelfTitle.trim()
                      ? "not-allowed"
                      : "pointer",
                  opacity: shelfSaving || !shelfTitle.trim() ? 0.4 : 1,
                  transition: "all 0.15s",
                }}
              >
                {shelfSaving ? "Creating…" : "Create Shelf"}
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════
              MODE: ADD ITEM
              ═══════════════════════════════════════════ */}
          {mode === "add-item" && (
            <>
              {/* ── Shelf picker ──────────────────── */}
              <Label>
                Shelves{" "}
                <span
                  style={{
                    fontWeight: 400,
                    textTransform: "none",
                    letterSpacing: 0,
                    color: t.textMuted,
                  }}
                >
                  — search & tap multiple
                </span>
              </Label>
              <input
                type="text"
                placeholder="Filter shelves…"
                value={shelfSearch}
                onChange={(e) => setShelfSearch(e.target.value)}
                style={{
                  width: "100%",
                  marginBottom: 6,
                  background: t.bgElevated,
                  border: `1px solid ${t.bgHover}`,
                  borderRadius: 8,
                  color: t.textSecondary,
                  padding: "7px 10px",
                  fontSize: 12,
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {/* Selected pills */}
              {selectedShelves.length > 0 && shelfSearch && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 4,
                    marginBottom: 6,
                  }}
                >
                  {selectedShelves.map((id) => {
                    const s = seriesOptions.find((o) => o.id === id);
                    if (!s) return null;
                    return (
                      <button
                        key={id}
                        onClick={() => toggleShelf(id)}
                        style={{
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          fontFamily: t.fontDisplay,
                          border: `1.5px solid ${accent}`,
                          background: `${accent}20`,
                          color: accent,
                          cursor: "pointer",
                        }}
                      >
                        ✓ {s.title} ✕
                      </button>
                    );
                  })}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  maxHeight: 140,
                  overflowY: "auto",
                  padding: 2,
                }}
              >
                {filteredShelfOptions.map((s) => {
                  const isActive = selectedShelves.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleShelf(s.id)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: t.fontDisplay,
                        letterSpacing: "0.02em",
                        cursor: "pointer",
                        border: `1.5px solid ${
                          isActive ? accent : "rgba(255,255,255,0.08)"
                        }`,
                        background: isActive
                          ? `${accent}20`
                          : "rgba(255,255,255,0.03)",
                        color: isActive ? accent : t.textFaint,
                        transition: "all 0.15s",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      {isActive ? "✓ " : ""}
                      {s.label} ({s.itemCount})
                    </button>
                  );
                })}
                {filteredShelfOptions.length === 0 && (
                  <div
                    style={{
                      fontSize: 11,
                      color: t.textMuted,
                      fontStyle: "italic",
                      padding: "4px 0",
                    }}
                  >
                    No shelves match "{shelfSearch}" —{" "}
                    <span
                      onClick={() => setMode("new-shelf")}
                      style={{
                        color: accent,
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      create one?
                    </span>
                  </div>
                )}
              </div>

              {/* ── Search TMDB / Manual ──────────── */}
              <Label style={{ marginTop: 16 }}>Search</Label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder={
                    searchType === "manual"
                      ? "Type title manually…"
                      : "e.g. Deep Blue Sea"
                  }
                  value={searchType === "manual" ? titleOverride : searchQuery}
                  onChange={(e) =>
                    searchType === "manual"
                      ? setTitleOverride(e.target.value)
                      : setSearchQuery(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (searchType === "manual" && e.key === "Enter")
                      handleManualConfirm();
                  }}
                  style={inputStyle(accent)}
                />
                <select
                  value={searchType}
                  onChange={(e) => {
                    setSearchType(e.target.value);
                    setSearchResults([]);
                    setSelectedResult(null);
                  }}
                  style={{
                    ...selectStyle(accent, false),
                    width: 90,
                    flexShrink: 0,
                  }}
                >
                  <option value="movie" style={{ background: t.bgCard }}>
                    Film
                  </option>
                  <option value="tv" style={{ background: t.bgCard }}>
                    TV
                  </option>
                  <option value="manual" style={{ background: t.bgCard }}>
                    Manual
                  </option>
                </select>
              </div>

              {/* Manual confirm button */}
              {searchType === "manual" && titleOverride.trim() && !selectedResult && (
                <button
                  onClick={handleManualConfirm}
                  style={{
                    marginTop: 8,
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: `${accent}15`,
                    border: `1.5px solid ${accent}40`,
                    color: accent,
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: t.fontDisplay,
                    cursor: "pointer",
                  }}
                >
                  Confirm: "{titleOverride.trim()}"
                </button>
              )}

              {searching && (
                <div
                  style={{
                    fontSize: 12,
                    color: t.textMuted,
                    marginTop: 6,
                    fontFamily: t.fontDisplay,
                  }}
                >
                  Searching…
                </div>
              )}

              {/* Search results */}
              {searchResults.length > 0 && (
                <div
                  style={{
                    marginTop: 8,
                    border: `1px solid ${t.borderSubtle}`,
                    borderRadius: 12,
                    overflow: "hidden",
                    maxHeight: 280,
                    overflowY: "auto",
                  }}
                >
                  {searchResults.map((r) => {
                    const isTV = !!r.first_air_date || r.media_type === "tv";
                    const rTitle = isTV
                      ? r.name || r.title
                      : r.title || r.name;
                    const rDate = isTV
                      ? r.first_air_date
                      : r.release_date;
                    const yr = rDate ? rDate.split("-")[0] : "";
                    return (
                      <button
                        key={r.id}
                        onClick={() => handleSelect(r)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          width: "100%",
                          background: "#18181b",
                          border: "none",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          padding: "8px 12px",
                          cursor: "pointer",
                          textAlign: "left",
                          color: t.textSecondary,
                        }}
                      >
                        {r.poster_path ? (
                          <img
                            src={`${TMDB_IMG}/w92${r.poster_path}`}
                            alt={rTitle}
                            style={{
                              width: 36,
                              height: 54,
                              borderRadius: 4,
                              objectFit: "cover",
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 36,
                              height: 54,
                              borderRadius: 4,
                              background: "#27272a",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: t.textMuted,
                              fontSize: 14,
                              flexShrink: 0,
                            }}
                          >
                            ?
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: 13,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {rTitle}
                          </span>
                          <span style={{ fontSize: 11, color: t.textMuted }}>
                            {yr}
                            {yr ? " · " : ""}
                            {isTV ? "TV" : "Film"} · TMDB {r.id}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── Selected item preview ────────── */}
              {selectedResult && (
                <div
                  style={{
                    marginTop: 16,
                    background: "#18181b",
                    borderRadius: 14,
                    padding: 16,
                    border: `1px solid ${t.borderSubtle}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 14,
                      marginBottom: 14,
                    }}
                  >
                    {selectedResult.poster_path ? (
                      <img
                        src={`${TMDB_IMG}/w154${selectedResult.poster_path}`}
                        alt={titleOverride}
                        style={{
                          width: 80,
                          height: 120,
                          borderRadius: 10,
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 80,
                          height: 120,
                          borderRadius: 10,
                          background: "#27272a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: t.textMuted,
                          fontSize: 11,
                          flexShrink: 0,
                        }}
                      >
                        {selectedResult._manual ? "Manual" : "No Poster"}
                      </div>
                    )}

                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        minWidth: 0,
                      }}
                    >
                      {/* Dupe check */}
                      {existingCheck?.status === "exists" && (
                        <div
                          onClick={editMode ? undefined : enterEditMode}
                          style={{
                            background: editMode
                              ? "rgba(34,211,238,0.1)"
                              : "rgba(251,191,36,0.1)",
                            color: editMode ? t.cyan : t.gold,
                            padding: "6px 10px",
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 600,
                            fontFamily: t.fontDisplay,
                            cursor: editMode ? "default" : "pointer",
                          }}
                        >
                          {editMode
                            ? `✎ Editing — ${existingCheck.itemIds.length} row${
                                existingCheck.itemIds.length > 1 ? "s" : ""
                              }`
                            : `⚠ Already in "${existingCheck.shelf}" — tap to edit`}
                        </div>
                      )}
                      {existingCheck?.status === "clear" && (
                        <div
                          style={{
                            color: t.green,
                            fontSize: 11,
                            fontWeight: 600,
                            fontFamily: t.fontDisplay,
                          }}
                        >
                          ✓ Not in community yet
                        </div>
                      )}

                      <FieldRow label="Title">
                        <input
                          value={titleOverride}
                          onChange={(e) => setTitleOverride(e.target.value)}
                          style={{
                            ...inputStyle(accent),
                            fontSize: 13,
                            padding: "6px 10px",
                          }}
                        />
                      </FieldRow>
                      <FieldRow label="Year">
                        <input
                          value={yearOverride}
                          onChange={(e) => setYearOverride(e.target.value)}
                          style={{
                            ...inputStyle(accent),
                            fontSize: 13,
                            padding: "6px 10px",
                            width: 80,
                          }}
                        />
                      </FieldRow>
                      <FieldRow label="Creator">
                        <input
                          value={creatorOverride}
                          onChange={(e) => setCreatorOverride(e.target.value)}
                          placeholder="Director / Author"
                          style={{
                            ...inputStyle(accent),
                            fontSize: 12,
                            padding: "6px 10px",
                          }}
                        />
                      </FieldRow>
                      {selectedResult._manual && (
                        <FieldRow label="Cover">
                          <input
                            value={coverImageUrl}
                            onChange={(e) => setCoverImageUrl(e.target.value)}
                            placeholder="Paste image URL"
                            style={{
                              ...inputStyle(accent),
                              fontSize: 11,
                              padding: "6px 10px",
                            }}
                          />
                        </FieldRow>
                      )}
                      <FieldRow label="TMDB">
                        <span
                          style={{
                            fontSize: 12,
                            color: t.textMuted,
                            fontFamily: "monospace",
                          }}
                        >
                          {selectedResult._manual
                            ? "manual"
                            : `${
                                searchType === "tv" ? "tv:" : ""
                              }${selectedResult.id}`}
                        </span>
                      </FieldRow>
                    </div>
                  </div>

                  {/* ── Optional fields ─── */}
                  <div
                    style={{
                      borderTop: `1px solid ${t.borderSubtle}`,
                      paddingTop: 12,
                      marginTop: 4,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <FieldRow label="Sort #" style={{ flex: "0 0 auto" }}>
                      <input
                        type="number"
                        placeholder="auto"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        style={{
                          ...inputStyle(accent),
                          fontSize: 12,
                          padding: "6px 8px",
                          width: 64,
                        }}
                      />
                    </FieldRow>
                    <FieldRow label="Air Date" style={{ flex: "1 1 120px" }}>
                      <input
                        type="date"
                        value={airDate}
                        onChange={(e) => setAirDate(e.target.value)}
                        style={{
                          ...inputStyle(accent),
                          fontSize: 12,
                          padding: "6px 8px",
                          colorScheme: "dark",
                        }}
                      />
                    </FieldRow>
                    <FieldRow label="Ep #" style={{ flex: "0 0 auto" }}>
                      <input
                        placeholder="142"
                        value={episodeNumber}
                        onChange={(e) => setEpisodeNumber(e.target.value)}
                        style={{
                          ...inputStyle(accent),
                          fontSize: 12,
                          padding: "6px 8px",
                          width: 64,
                        }}
                      />
                    </FieldRow>
                    <FieldRow label="Display" style={{ flex: "0 0 auto" }}>
                      <input
                        placeholder="Ep. 142"
                        value={episodeDisplay}
                        onChange={(e) => setEpisodeDisplay(e.target.value)}
                        style={{
                          ...inputStyle(accent),
                          fontSize: 12,
                          padding: "6px 8px",
                          width: 90,
                        }}
                      />
                    </FieldRow>
                  </div>

                  {/* ── Meta fields ─── */}
                  <div
                    style={{
                      borderTop: `1px solid ${t.borderSubtle}`,
                      paddingTop: 12,
                      marginTop: 12,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <FieldRow label="Genre" style={{ flex: "1 1 100px" }}>
                      <input
                        value={genreBucket}
                        onChange={(e) => setGenreBucket(e.target.value)}
                        placeholder="horror, comedy…"
                        style={{
                          ...inputStyle(accent),
                          fontSize: 12,
                          padding: "6px 8px",
                        }}
                      />
                    </FieldRow>
                    <FieldRow label="Tags" style={{ flex: "1 1 140px" }}>
                      <input
                        value={tagsStr}
                        onChange={(e) => setTagsStr(e.target.value)}
                        placeholder="franchise, reboot…"
                        style={{
                          ...inputStyle(accent),
                          fontSize: 12,
                          padding: "6px 8px",
                        }}
                      />
                    </FieldRow>
                  </div>

                  {/* ── Audio / RSS ─── */}
                  <div
                    style={{
                      borderTop: `1px solid ${t.borderSubtle}`,
                      paddingTop: 12,
                      marginTop: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <Label style={{ marginBottom: 0 }}>
                        Episode Audio{" "}
                        {episodeUrl && (
                          <span style={{ color: t.green }}>🎧</span>
                        )}
                      </Label>
                      {feedUrl && (
                        <button
                          onClick={() => {
                            setRssOpen(!rssOpen);
                            if (!rssLoaded && !rssLoading) loadRssFeed();
                          }}
                          style={{
                            padding: "3px 10px",
                            borderRadius: 6,
                            background: rssOpen
                              ? `${accent}15`
                              : "rgba(255,255,255,0.06)",
                            border: `1px solid ${
                              rssOpen ? `${accent}40` : "rgba(255,255,255,0.1)"
                            }`,
                            color: rssOpen ? accent : t.textMuted,
                            fontSize: 10,
                            fontWeight: 700,
                            fontFamily: t.fontDisplay,
                            cursor: "pointer",
                          }}
                        >
                          {rssOpen ? "Hide RSS" : "Browse RSS"}
                        </button>
                      )}
                    </div>

                    <input
                      value={episodeUrl}
                      onChange={(e) => setEpisodeUrl(e.target.value)}
                      placeholder="https://…mp3 (or pick from RSS below)"
                      style={{
                        ...inputStyle(accent),
                        fontSize: 12,
                        padding: "6px 10px",
                      }}
                    />

                    {episodeUrl && (
                      <div style={{ marginTop: 6 }}>
                        <input
                          value={episodeTitle}
                          onChange={(e) => setEpisodeTitle(e.target.value)}
                          placeholder="Episode title"
                          style={{
                            ...inputStyle(accent),
                            fontSize: 12,
                            padding: "6px 10px",
                          }}
                        />
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            marginTop: 6,
                          }}
                        >
                          <button
                            onClick={() => toggleAudioPreview(episodeUrl)}
                            style={{
                              ...smallBtn,
                              background:
                                previewingUrl === episodeUrl
                                  ? `${accent}15`
                                  : "rgba(255,255,255,0.06)",
                            }}
                          >
                            {previewingUrl === episodeUrl
                              ? "⏸ Pause"
                              : "▶ Preview"}
                          </button>
                          <button
                            onClick={() => {
                              setEpisodeUrl("");
                              setEpisodeTitle("");
                              setRssGuid("");
                            }}
                            style={{
                              ...smallBtn,
                              color: t.red,
                              borderColor: "rgba(233,69,96,0.2)",
                            }}
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}

                    {/* RSS Browser (inline) */}
                    {rssOpen && (
                      <div
                        style={{
                          marginTop: 8,
                          background: "rgba(0,0,0,0.2)",
                          borderRadius: 8,
                          padding: 8,
                          border: `1px solid ${t.borderSubtle}`,
                        }}
                      >
                        {rssLoading && (
                          <div
                            style={{
                              fontSize: 11,
                              color: t.textMuted,
                              padding: 8,
                            }}
                          >
                            Loading feed…
                          </div>
                        )}
                        {rssError && (
                          <div
                            style={{
                              fontSize: 11,
                              color: t.red,
                              padding: 8,
                            }}
                          >
                            {rssError}
                          </div>
                        )}
                        {rssLoaded && (
                          <>
                            <input
                              value={rssFilter}
                              onChange={(e) => setRssFilter(e.target.value)}
                              placeholder="Filter episodes…"
                              style={{
                                ...inputStyle(accent),
                                fontSize: 11,
                                padding: "5px 8px",
                                marginBottom: 6,
                              }}
                            />
                            <div
                              style={{
                                maxHeight: 200,
                                overflowY: "auto",
                                borderRadius: 6,
                              }}
                            >
                              {filteredEpisodes.map((ep) => (
                                <div
                                  key={ep.guid || ep.idx}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "5px 6px",
                                    borderBottom:
                                      "1px solid rgba(255,255,255,0.03)",
                                    background:
                                      episodeUrl === ep.audioUrl
                                        ? `${accent}10`
                                        : "transparent",
                                  }}
                                >
                                  <button
                                    onClick={() =>
                                      toggleAudioPreview(ep.audioUrl)
                                    }
                                    style={{
                                      width: 22,
                                      height: 22,
                                      borderRadius: "50%",
                                      background: t.bgInput,
                                      border:
                                        `1px solid ${t.borderMedium}`,
                                      color: accent,
                                      fontSize: 9,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {previewingUrl === ep.audioUrl
                                      ? "⏸"
                                      : "▶"}
                                  </button>
                                  <div
                                    style={{
                                      flex: 1,
                                      minWidth: 0,
                                      cursor: "pointer",
                                    }}
                                    onClick={() => handlePickEpisode(ep)}
                                  >
                                    <div
                                      style={{
                                        fontSize: 10,
                                        color: t.textSecondary,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {ep.title}
                                    </div>
                                    <div
                                      style={{ fontSize: 9, color: t.textMuted }}
                                    >
                                      {ep.pubDate
                                        ? new Date(
                                            ep.pubDate
                                          ).toLocaleDateString()
                                        : ""}
                                    </div>
                                  </div>
                                  {episodeUrl === ep.audioUrl && (
                                    <span
                                      style={{
                                        fontSize: 9,
                                        color: accent,
                                        flexShrink: 0,
                                      }}
                                    >
                                      ✓
                                    </span>
                                  )}
                                </div>
                              ))}
                              {filteredEpisodes.length === 0 && (
                                <div
                                  style={{
                                    padding: 10,
                                    fontSize: 10,
                                    color: t.textMuted,
                                    textAlign: "center",
                                  }}
                                >
                                  No episodes match
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Host verdicts (NPP) ─── */}
                  {(showVerdicts || editMode) && (
                    <div
                      style={{
                        borderTop: `1px solid ${t.borderSubtle}`,
                        paddingTop: 12,
                        marginTop: 12,
                      }}
                    >
                      <Label style={{ marginBottom: 8 }}>Host Verdicts</Label>
                      <div style={{ display: "flex", gap: 16 }}>
                        <VerdictInput
                          color="#22c55e"
                          arrow="↑"
                          value={hostUp}
                          onChange={setHostUp}
                        />
                        <VerdictInput
                          color="#ef4444"
                          arrow="↓"
                          value={hostDown}
                          onChange={setHostDown}
                        />
                        <VerdictInput
                          color="#a16207"
                          arrow="↑"
                          value={hostBrown}
                          onChange={setHostBrown}
                        />
                      </div>
                    </div>
                  )}

                  {/* ── Action buttons ─── */}
                  {editMode ? (
                    <>
                      <button
                        onClick={handleUpdate}
                        disabled={updating}
                        style={{
                          marginTop: 16,
                          width: "100%",
                          padding: "12px 0",
                          borderRadius: 12,
                          background: updating
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(34,211,238,0.1)",
                          border: "2px solid #22d3ee",
                          color: t.textPrimary,
                          fontSize: 15,
                          fontWeight: 800,
                          fontFamily: t.fontDisplay,
                          letterSpacing: "0.03em",
                          textTransform: "uppercase",
                          cursor: updating ? "not-allowed" : "pointer",
                          opacity: updating ? 0.4 : 1,
                          transition: "all 0.15s",
                        }}
                      >
                        {updating ? "Updating…" : "Update Verdicts"}
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        style={{
                          marginTop: 8,
                          width: "100%",
                          padding: "10px 0",
                          borderRadius: 12,
                          background: confirmDelete
                            ? "rgba(239,68,68,0.15)"
                            : "transparent",
                          border: `1.5px solid ${
                            confirmDelete
                              ? "#ef4444"
                              : "rgba(239,68,68,0.3)"
                          }`,
                          color: confirmDelete
                            ? "#ef4444"
                            : "rgba(239,68,68,0.6)",
                          fontSize: 12,
                          fontWeight: 800,
                          fontFamily: t.fontDisplay,
                          letterSpacing: "0.03em",
                          textTransform: "uppercase",
                          cursor: deleting ? "not-allowed" : "pointer",
                          opacity: deleting ? 0.4 : 1,
                          transition: "all 0.15s",
                        }}
                      >
                        {deleting
                          ? "Deleting…"
                          : confirmDelete
                          ? "Tap again to confirm delete"
                          : `Delete (${existingCheck?.itemIds?.length || 0} rows)`}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleSave}
                      disabled={saving || selectedShelves.length === 0}
                      style={{
                        marginTop: 16,
                        width: "100%",
                        padding: "12px 0",
                        borderRadius: 12,
                        background: saving
                          ? "rgba(255,255,255,0.04)"
                          : `${accent}18`,
                        border: `2px solid ${accent}`,
                        color: t.textPrimary,
                        fontSize: 15,
                        fontWeight: 800,
                        fontFamily: t.fontDisplay,
                        letterSpacing: "0.03em",
                        textTransform: "uppercase",
                        cursor:
                          saving || selectedShelves.length === 0
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          saving || selectedShelves.length === 0
                            ? 0.4
                            : 1,
                        transition: "all 0.15s",
                      }}
                    >
                      {saving
                        ? "Saving…"
                        : selectedShelves.length > 1
                        ? `Add to ${selectedShelves.length} Shelves`
                        : "Add to Community"}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Hidden audio element */}
        <audio ref={audioRef} style={{ display: "none" }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════════ */

function Label({ children, style = {} }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: t.textMuted,
        fontFamily: t.fontDisplay,
        marginBottom: 6,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function FieldRow({ label, children, style = {} }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        ...style,
      }}
    >
      <span
        style={{
          fontSize: 10,
          color: t.textMuted,
          fontWeight: 600,
          fontFamily: t.fontDisplay,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          minWidth: 44,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function VerdictInput({ color, arrow, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}
      >
        {arrow}
      </span>
      <input
        type="number"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 48,
          textAlign: "center",
          background: t.bgElevated,
          border: `1px solid ${t.bgHover}`,
          borderRadius: 8,
          padding: "6px 4px",
          color: t.textSecondary,
          fontSize: 14,
          fontFamily: t.fontDisplay,
          fontWeight: 700,
          outline: "none",
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Shared inline styles
   ═══════════════════════════════════════════════════════════════ */

const smallBtn = {
  padding: "4px 12px",
  borderRadius: 6,
  background: t.bgInput,
  border: `1px solid ${t.borderMedium}`,
  color: t.textSecondary,
  fontSize: 11,
  fontWeight: 600,
  fontFamily: t.fontDisplay,
  cursor: "pointer",
};

function inputStyle(accent) {
  return {
    width: "100%",
    background: t.bgElevated,
    border: `1px solid ${t.bgHover}`,
    borderRadius: 10,
    color: t.textSecondary,
    padding: "10px 12px",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    WebkitAppearance: "none",
    boxSizing: "border-box",
  };
}

function selectStyle(accent, hasValue) {
  return {
    width: "100%",
    appearance: "none",
    WebkitAppearance: "none",
    background: hasValue ? `${accent}10` : "rgba(255,255,255,0.04)",
    border: `1.5px solid ${
      hasValue ? `${accent}40` : "rgba(255,255,255,0.08)"
    }`,
    borderRadius: 10,
    color: hasValue ? accent : t.textMuted,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: t.fontDisplay,
    letterSpacing: "0.03em",
    cursor: "pointer",
    outline: "none",
    boxSizing: "border-box",
  };
}
