import { t } from "../../theme";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabase";
import { getCommunityAccent } from "./FeedPrimitives";

// ════════════════════════════════════════════════
// FEED FILTER BAR — sort toggle + podcast dropdown
// Sits below the feed tab toggle on all three tabs
// ════════════════════════════════════════════════

const SORT_OPTIONS = [
  { key: "recent", label: "Recent" },
  { key: "oldest", label: "Oldest" },
];

export default function FeedFilterBar({
  sortOrder = null,
  onSortChange,
  selectedPodcast = null,  // null = "All Podcasts", "__favorites__" = favorites group
  onPodcastChange,
  communitySubscriptions,  // Set of community IDs
  favoritePodcasts,        // Set of podcast UUIDs (from user_podcast_favorites)
  onFavoriteSlugsReady,    // callback: (Set<slug>) => void
}) {
  const [podcasts, setPodcasts] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // ── Fetch podcast list once (all communities with active podcasts) ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: pods, error } = await supabase
        .from("podcasts")
        .select("id, name, slug, artwork_url, community_page_id, community_pages(id, slug, sort_order)")
        .eq("active", true)
        .order("name", { ascending: true });
      if (!cancelled && !error && pods) {
        // Sort: community podcasts by sort_order first, then non-community alphabetically
        const sorted = pods.sort((a, b) => {
          const aOrder = a.community_pages?.sort_order ?? 999;
          const bOrder = b.community_pages?.sort_order ?? 999;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return a.name.localeCompare(b.name);
        });
        setPodcasts(sorted.map(p => ({
          id: p.community_page_id || p.id,
          podcastId: p.id,  // actual podcast UUID for favorite matching
          slug: p.community_pages?.slug || p.slug,
          name: p.name,
          artwork_url: p.artwork_url || null,
          accent: getCommunityAccent(p.community_pages?.slug || p.slug),
          communityPageId: p.community_page_id || null,
        })));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Close dropdown on outside tap ──
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [dropdownOpen]);

  // ── Partition: favorited first, then rest ──
  const favSet = favoritePodcasts || new Set();
  const subscribed = podcasts.filter(p => favSet.has(p.podcastId));
  const rest = podcasts.filter(p => !favSet.has(p.podcastId));
  const orderedPodcasts = [...subscribed, ...rest];

  // ── Report favorite slugs to parent for filtering ──
  const favSlugsRef = useRef(null);
  useEffect(() => {
    if (!onFavoriteSlugsReady || subscribed.length === 0) return;
    const slugs = new Set(subscribed.map(p => p.slug));
    // Only fire if the set actually changed
    if (favSlugsRef.current?.size === slugs.size && [...slugs].every(s => favSlugsRef.current.has(s))) return;
    favSlugsRef.current = slugs;
    onFavoriteSlugsReady(slugs);
  }, [subscribed, onFavoriteSlugsReady]);

  const selectedLabel = selectedPodcast === "__favorites__"
    ? "Favorites"
    : selectedPodcast
      ? (podcasts.find(p => p.slug === selectedPodcast)?.name || selectedPodcast)
      : "All Podcasts";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "2px 16px 6px",
    }}>
      {/* ── Sort toggle ── */}
      <div style={{
        display: "flex",
        background: t.bgElevated,
        borderRadius: 8,
        border: `1px solid ${t.borderSubtle}`,
        overflow: "hidden",
        flexShrink: 0,
      }}>
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => onSortChange(sortOrder === opt.key ? null : opt.key)}
            style={{
              padding: "5px 12px",
              background: sortOrder === opt.key ? "rgba(255,255,255,0.08)" : "transparent",
              border: "none",
              color: sortOrder === opt.key ? "var(--text-primary, #e8e0d4)" : "var(--text-muted, #8892a8)",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: t.fontDisplay,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── Podcast dropdown ── */}
      <div ref={dropdownRef} style={{ position: "relative", flex: 1, minWidth: 0 }}>
        <button
          onClick={() => setDropdownOpen(prev => !prev)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            width: "100%",
            padding: "5px 10px",
            background: selectedPodcast === "__favorites__"
              ? "rgba(251,191,36,0.09)"
              : selectedPodcast
                ? (getCommunityAccent(selectedPodcast) + "18")
                : "rgba(255,255,255,0.04)",
            border: selectedPodcast === "__favorites__"
              ? "1px solid rgba(251,191,36,0.27)"
              : selectedPodcast
                ? `1px solid ${getCommunityAccent(selectedPodcast)}44`
                : `1px solid ${t.borderSubtle}`,
            borderRadius: 8,
            color: selectedPodcast === "__favorites__"
              ? "#fbbf24"
              : selectedPodcast
                ? getCommunityAccent(selectedPodcast)
                : "var(--text-muted, #8892a8)",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: t.fontDisplay,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {selectedPodcast && selectedPodcast !== "__favorites__" && (() => {
            const pod = podcasts.find(p => p.slug === selectedPodcast);
            return pod?.artwork_url ? (
              <img src={pod.artwork_url} loading="lazy" alt="" style={{
                width: 16, height: 16, borderRadius: 3, objectFit: "cover", flexShrink: 0,
              }} />
            ) : null;
          })()}
          {selectedPodcast === "__favorites__" && (
            <span style={{ fontSize: 12, flexShrink: 0, lineHeight: 1 }}>★</span>
          )}
          <span style={{
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left",
          }}>
            {selectedLabel}
          </span>
          <svg width="10" height="6" viewBox="0 0 10 6" style={{
            flexShrink: 0, opacity: 0.6,
            transform: dropdownOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}>
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        </button>

        {/* ── Dropdown menu ── */}
        {dropdownOpen && (
          <div style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0, right: 0,
            background: "var(--bg-card, #1a1714)",
            border: `1px solid ${t.borderMedium}`,
            borderRadius: 10,
            zIndex: 100,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            maxHeight: 280,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
          }}>
            {/* All Podcasts option */}
            <DropdownItem
              label="All Podcasts"
              active={!selectedPodcast}
              accent="#34d399"
              onClick={() => { onPodcastChange(null); setDropdownOpen(false); }}
            />

            {/* Favorites option — only show when there are favorites */}
            {subscribed.length > 1 && (
              <DropdownItem
                label="Favorites"
                icon="★"
                active={selectedPodcast === "__favorites__"}
                accent="#fbbf24"
                onClick={() => { onPodcastChange("__favorites__"); setDropdownOpen(false); }}
              />
            )}

            {/* Subscribed divider */}
            {subscribed.length > 0 && rest.length > 0 && (
              <div style={{
                padding: "6px 12px 2px",
                fontSize: 11, fontWeight: 700,
                fontFamily: t.fontDisplay,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-faint, #5a6480)",
              }}>
                Your Podcasts
              </div>
            )}

            {subscribed.map(pod => (
              <DropdownItem
                key={pod.slug}
                label={pod.name}
                artwork={pod.artwork_url}
                accent={pod.accent}
                active={selectedPodcast === pod.slug}
                onClick={() => { onPodcastChange(pod.slug); setDropdownOpen(false); }}
              />
            ))}

            {/* Rest divider */}
            {subscribed.length > 0 && rest.length > 0 && (
              <div style={{
                padding: "6px 12px 2px",
                fontSize: 11, fontWeight: 700,
                fontFamily: t.fontDisplay,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-faint, #5a6480)",
              }}>
                Discover
              </div>
            )}

            {rest.map(pod => (
              <DropdownItem
                key={pod.slug}
                label={pod.name}
                artwork={pod.artwork_url}
                accent={pod.accent}
                active={selectedPodcast === pod.slug}
                onClick={() => { onPodcastChange(pod.slug); setDropdownOpen(false); }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DropdownItem({ label, artwork, icon, accent, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        width: "100%",
        padding: "9px 12px",
        background: active ? (accent + "14") : "transparent",
        border: "none",
        borderLeft: active ? `2px solid ${accent}` : "2px solid transparent",
        color: active ? accent : "var(--text-primary, #e8e0d4)",
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        fontFamily: "var(--font-body, 'Barlow Condensed', sans-serif)",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s",
      }}
    >
      {icon && (
        <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1 }}>{icon}</span>
      )}
      {artwork && (
        <img src={artwork} loading="lazy" alt="" style={{
          width: 20, height: 20, borderRadius: 4, objectFit: "cover", flexShrink: 0,
        }} />
      )}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
      {active && (
        <svg width="12" height="12" viewBox="0 0 12 12" style={{ flexShrink: 0, marginLeft: "auto" }}>
          <path d="M2 6l3 3 5-5" stroke={accent} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
