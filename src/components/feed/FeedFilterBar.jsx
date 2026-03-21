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
  sortOrder = "recent",
  onSortChange,
  selectedPodcast = null,  // null = "All Podcasts"
  onPodcastChange,
  communitySubscriptions,  // Set of community IDs
}) {
  const [podcasts, setPodcasts] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // ── Fetch podcast list once ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("community_pages")
        .select("id, slug, name")
        .eq("launched", true)
        .order("sort_order", { ascending: true });
      if (!cancelled && !error && data) {
        // Also grab artwork from podcasts table
        const { data: pods } = await supabase
          .from("podcasts")
          .select("community_page_id, artwork_url")
          .eq("active", true);
        const artMap = new Map();
        for (const p of (pods || [])) artMap.set(p.community_page_id, p.artwork_url);

        setPodcasts(data.map(cp => ({
          id: cp.id,
          slug: cp.slug,
          name: cp.name,
          artwork_url: artMap.get(cp.id) || null,
          accent: getCommunityAccent(cp.slug),
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

  // ── Partition: subscribed first, then rest ──
  const subSet = communitySubscriptions || new Set();
  const subscribed = podcasts.filter(p => subSet.has(p.id));
  const rest = podcasts.filter(p => !subSet.has(p.id));
  const orderedPodcasts = [...subscribed, ...rest];

  const selectedLabel = selectedPodcast
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
        background: "rgba(255,255,255,0.04)",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.06)",
        overflow: "hidden",
        flexShrink: 0,
      }}>
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => onSortChange(opt.key)}
            style={{
              padding: "5px 12px",
              background: sortOrder === opt.key ? "rgba(255,255,255,0.08)" : "transparent",
              border: "none",
              color: sortOrder === opt.key ? "var(--text-primary, #e8e0d4)" : "var(--text-muted, #8892a8)",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "'Barlow Condensed', sans-serif",
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
            background: selectedPodcast ? (getCommunityAccent(selectedPodcast) + "18") : "rgba(255,255,255,0.04)",
            border: selectedPodcast
              ? `1px solid ${getCommunityAccent(selectedPodcast)}44`
              : "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8,
            color: selectedPodcast ? getCommunityAccent(selectedPodcast) : "var(--text-muted, #8892a8)",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {selectedPodcast && (() => {
            const pod = podcasts.find(p => p.slug === selectedPodcast);
            return pod?.artwork_url ? (
              <img src={pod.artwork_url} alt="" style={{
                width: 16, height: 16, borderRadius: 3, objectFit: "cover", flexShrink: 0,
              }} />
            ) : null;
          })()}
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
            border: "1px solid rgba(255,255,255,0.1)",
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

            {/* Subscribed divider */}
            {subscribed.length > 0 && rest.length > 0 && (
              <div style={{
                padding: "6px 12px 2px",
                fontSize: 9, fontWeight: 700,
                fontFamily: "'Barlow Condensed', sans-serif",
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
                fontSize: 9, fontWeight: 700,
                fontFamily: "'Barlow Condensed', sans-serif",
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

function DropdownItem({ label, artwork, accent, active, onClick }) {
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
        fontFamily: "var(--font-body, 'Inter', sans-serif)",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s",
      }}
    >
      {artwork && (
        <img src={artwork} alt="" style={{
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
