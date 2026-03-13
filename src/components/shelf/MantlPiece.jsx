import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "../../supabase";
import { sb } from "../../utils/api";
import { formatDate } from "../../utils/helpers";

/* ═══════════════════════════════════════════════════════════════
   Community display names — maps slug → pretty label
   ═══════════════════════════════════════════════════════════════ */
const COMMUNITY_NAMES = {
  blankcheck: "Blank Check",
  nowplaying: "Now Playing Podcast",
  bigpicture: "The Big Picture",
  filmjunk: "Film Junk",
  hdtgm: "How Did This Get Made?",
  filmspotting: "Filmspotting",
  chapo: "Chapo Trap House",
  rewatchables: "The Rewatchables",
  getplayed: "Get Played",
};

/* ═══════════════════════════════════════════════════════════════
   Relative time helper — "3 days ago", "2 weeks ago", etc.
   ═══════════════════════════════════════════════════════════════ */
function timeAgo(isoDate) {
  if (!isoDate) return null;
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/* ═══════════════════════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════════════════════ */
const S = {
  mantl: {
    padding: "0 16px 8px",
  },

  /* ── Display case frame ── */
  displayCase: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: "20px 16px 0",
    position: "relative",
    overflow: "hidden",
  },
  displayHighlight: {
    position: "absolute", top: 0, left: 20, right: 20, height: 1,
    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
  },

  /* ── Title ── */
  titleRow: {
    display: "flex", alignItems: "center", gap: 14,
    marginBottom: 16, padding: "0 2px",
  },
  titleLine: {
    flex: 1, height: 1,
    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
  },
  title: {
    fontFamily: "var(--font-display)", fontWeight: 900,
    fontSize: 20, color: "var(--text-primary)",
    textTransform: "uppercase", letterSpacing: "0.12em",
    cursor: "pointer", whiteSpace: "nowrap",
    textAlign: "center",
  },
  editBtn: {
    fontSize: 16, color: "var(--text-faint)",
    cursor: "pointer", padding: "4px 2px",
    opacity: 0.5, transition: "opacity 0.2s",
    flexShrink: 0,
  },

  /* ── 2×2 Grid ── */
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    padding: "0 0 14px",
    perspective: "1200px",
  },

  /* ── Card wrapper (holds front + back, does the 3D flip) ── */
  cardScene: {
    position: "relative",
    aspectRatio: "1 / 1.43",
    transformStyle: "preserve-3d",
    WebkitTransformStyle: "preserve-3d",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
  },

  /* ── Front face ── */
  cellFront: {
    position: "absolute", inset: 0,
    borderRadius: 10,
    overflow: "hidden",
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    boxShadow: "0 3px 12px rgba(0,0,0,0.3)",
  },
  cellImg: {
    width: "100%", height: "100%", objectFit: "cover", display: "block",
  },
  cellFallback: {
    width: "100%", height: "100%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 36, background: "rgba(255,255,255,0.02)",
  },
  cellOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: "16px 10px 10px",
    background: "linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)",
  },
  cellOverlayTitle: {
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: 11, color: "#fff",
    lineHeight: 1.2, textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  cellOverlayDate: {
    fontFamily: "var(--font-mono)", fontSize: 9,
    color: "rgba(255,255,255,0.6)", marginTop: 2,
  },

  /* ── Back face (Polaroid) ── */
  cellBack: {
    position: "absolute", inset: 0,
    borderRadius: 10,
    overflow: "hidden",
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    transform: "rotateY(180deg)",
    WebkitTransform: "rotateY(180deg)",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "16px 14px",
    /* Warm paper texture */
    background: "linear-gradient(145deg, #f5f0e8 0%, #ece4d4 40%, #e8dcc8 100%)",
    boxShadow: "0 3px 12px rgba(0,0,0,0.3), inset 0 0 40px rgba(0,0,0,0.04)",
  },
  /* Subtle paper grain overlay */
  paperGrain: {
    position: "absolute", inset: 0,
    opacity: 0.06,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
    backgroundSize: "150px 150px",
    pointerEvents: "none",
  },

  /* Back content */
  backNote: {
    fontFamily: "'Caveat', 'Segoe Script', 'Comic Sans MS', cursive",
    fontSize: 16, fontWeight: 600,
    color: "#3d3228",
    textAlign: "center",
    lineHeight: 1.4,
    maxWidth: "100%",
    wordBreak: "break-word",
    position: "relative",
    zIndex: 1,
  },
  backNoteEmpty: {
    fontFamily: "'Caveat', 'Segoe Script', 'Comic Sans MS', cursive",
    fontSize: 15,
    color: "#9e8e7a",
    textAlign: "center",
    fontStyle: "italic",
    position: "relative",
    zIndex: 1,
    display: "flex", alignItems: "center", gap: 6,
  },
  backSource: {
    fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
    fontSize: 9,
    color: "#8a7b6b",
    letterSpacing: "0.04em",
    textAlign: "center",
    marginTop: 12,
    position: "relative",
    zIndex: 1,
    lineHeight: 1.5,
  },
  backCommunityName: {
    fontFamily: "var(--font-display, 'IBM Plex Sans', sans-serif)",
    fontWeight: 700,
    fontSize: 10,
    color: "#6b5a47",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  backNoteInput: {
    width: "100%",
    background: "transparent",
    border: "none",
    borderBottom: "1.5px dashed #c4a882",
    fontFamily: "'Caveat', 'Segoe Script', 'Comic Sans MS', cursive",
    fontSize: 16, fontWeight: 600,
    color: "#3d3228",
    textAlign: "center",
    outline: "none",
    padding: "4px 0",
    position: "relative",
    zIndex: 1,
  },

  /* ── Ghost slots ── */
  ghostCell: {
    borderRadius: 10,
    aspectRatio: "1 / 1.43",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexDirection: "column", gap: 6,
    background: "rgba(255,255,255,0.02)",
    border: "2px dashed rgba(255,255,255,0.08)",
    cursor: "pointer",
  },
  ghostIcon: {
    fontSize: 24, color: "var(--text-faint)", opacity: 0.5,
  },
  ghostLabel: {
    fontFamily: "var(--font-display)", fontSize: 10,
    fontWeight: 600, color: "var(--text-faint)",
    letterSpacing: "0.06em", textTransform: "uppercase",
  },

  /* ── Ledge ── */
  ledge: {
    height: 5, margin: "0 -16px",
    background: "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 50%, transparent 100%)",
    borderTop: "1px solid rgba(255,255,255,0.06)",
  },
  ledgeGlow: {
    height: 24, margin: "0 10px",
    background: "radial-gradient(ellipse at center, rgba(196,115,79,0.1) 0%, transparent 70%)",
    filter: "blur(6px)",
  },
};

/* ═══════════════════════════════════════════════════════════════
   FlipCard — individual MANTL pin with Polaroid flip
   ═══════════════════════════════════════════════════════════════ */
function FlipCard({ item, pin, isActive, session, onTap, onSaveNote, onViewItem }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [editNoteText, setEditNoteText] = useState("");
  const longPressTimer = useRef(null);
  const didLongPress = useRef(false);
  const touchStartPos = useRef(null);

  // Reset flip state when active card changes
  useEffect(() => {
    if (!isActive) {
      setIsFlipped(false);
      setEditingNote(false);
    }
  }, [isActive]);

  /* ── Long press detection ── */
  const handlePressStart = useCallback((e) => {
    didLongPress.current = false;
    const touch = e.touches ? e.touches[0] : e;
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };

    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(15);
      setIsFlipped((f) => !f);
    }, 400);
  }, []);

  const handlePressEnd = useCallback((e) => {
    clearTimeout(longPressTimer.current);
    if (didLongPress.current) {
      didLongPress.current = false;
      e.preventDefault();
      return;
    }
    // Short tap: if flipped, flip back. If not flipped, normal tap behavior.
    if (isFlipped) {
      if (!editingNote) setIsFlipped(false);
    } else {
      onTap();
    }
  }, [isFlipped, editingNote, onTap]);

  const handlePressMove = useCallback((e) => {
    // Cancel long press if finger moves too much
    if (!touchStartPos.current) return;
    const touch = e.touches ? e.touches[0] : e;
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimer.current);
    }
  }, []);

  /* ── Note editing on the back ── */
  const handleBackNoteClick = useCallback((e) => {
    if (!session) return;
    e.stopPropagation();
    setEditNoteText(item._note || "");
    setEditingNote(true);
  }, [session, item._note]);

  const handleNoteSave = useCallback(() => {
    onSaveNote(editNoteText);
    setEditingNote(false);
  }, [editNoteText, onSaveNote]);

  /* ── Derived data ── */
  const cover = item.cover || item.locationImage || null;
  const isEvent = item._pinType === "trophy" || item._pinType === "goal";
  const isCountry = item._pinType === "country";
  const sourceName = pin.source ? (COMMUNITY_NAMES[pin.source] || pin.source) : null;
  const pinnedAgo = pin.pinned_at ? timeAgo(pin.pinned_at) : null;

  /* ── Card transform ── */
  const cardTransform = isFlipped
    ? "rotateY(180deg) scale(1.06)"
    : isActive
      ? "rotateY(0deg) scale(1.03)"
      : "rotateY(0deg) scale(1)";

  const cardShadow = isFlipped
    ? "0 8px 32px rgba(0,0,0,0.4), 0 0 0 2px rgba(196,115,79,0.4)"
    : isActive
      ? "0 4px 20px rgba(196,115,79,0.3), 0 0 0 2px var(--accent-terra, rgba(196,115,79,0.7))"
      : "0 3px 12px rgba(0,0,0,0.3)";

  return (
    <div
      style={{
        ...S.cardScene,
        transform: cardTransform,
        boxShadow: cardShadow,
        borderRadius: 10,
        transition: "transform 0.5s cubic-bezier(0.4,0,0.2,1), box-shadow 0.4s ease",
      }}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchMove={handlePressMove}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={() => clearTimeout(longPressTimer.current)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ─── FRONT ─── */}
      <div style={S.cellFront}>
        {cover ? (
          <>
            <img src={cover} alt="" style={S.cellImg} draggable={false} />
            {(isEvent || isCountry) && (
              <div style={S.cellOverlay}>
                {isCountry && <div style={{ fontSize: 14 }}>{item.flag}</div>}
                <div style={S.cellOverlayTitle}>{item.title}</div>
                {isEvent && (item.targetDate || item.completedAt) && (
                  <div style={S.cellOverlayDate}>{formatDate(item.targetDate || item.completedAt)}</div>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={S.cellFallback}>
            {item.emoji || item.flag || ({ book: "📖", movie: "🎬", show: "📺", game: "🎮", trophy: "🏆", goal: "🎯", country: "🌍" })[item._pinType]}
          </div>
        )}
      </div>

      {/* ─── BACK (Polaroid) ─── */}
      <div style={S.cellBack}>
        <div style={S.paperGrain} />

        {/* Decorative corner marks */}
        <div style={{
          position: "absolute", top: 8, left: 8,
          width: 12, height: 12,
          borderTop: "1.5px solid #c4a882", borderLeft: "1.5px solid #c4a882",
          opacity: 0.5, zIndex: 1,
        }} />
        <div style={{
          position: "absolute", top: 8, right: 8,
          width: 12, height: 12,
          borderTop: "1.5px solid #c4a882", borderRight: "1.5px solid #c4a882",
          opacity: 0.5, zIndex: 1,
        }} />
        <div style={{
          position: "absolute", bottom: 8, left: 8,
          width: 12, height: 12,
          borderBottom: "1.5px solid #c4a882", borderLeft: "1.5px solid #c4a882",
          opacity: 0.5, zIndex: 1,
        }} />
        <div style={{
          position: "absolute", bottom: 8, right: 8,
          width: 12, height: 12,
          borderBottom: "1.5px solid #c4a882", borderRight: "1.5px solid #c4a882",
          opacity: 0.5, zIndex: 1,
        }} />

        {/* Title on back */}
        <div style={{
          fontFamily: "var(--font-display, 'IBM Plex Sans', sans-serif)",
          fontSize: 11, fontWeight: 700,
          color: "#6b5a47",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 10,
          position: "relative", zIndex: 1,
          textAlign: "center",
          lineHeight: 1.3,
        }}>
          {item.title}
        </div>

        {/* Divider */}
        <div style={{
          width: 40, height: 1,
          background: "linear-gradient(90deg, transparent, #c4a882, transparent)",
          marginBottom: 10, position: "relative", zIndex: 1,
        }} />

        {/* Note or prompt */}
        {editingNote ? (
          <input
            style={S.backNoteInput}
            placeholder="write something..."
            value={editNoteText}
            onChange={(e) => setEditNoteText(e.target.value.slice(0, 120))}
            maxLength={120}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNoteSave();
              if (e.key === "Escape") setEditingNote(false);
            }}
            onBlur={handleNoteSave}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            onClick={handleBackNoteClick}
            style={item._note ? S.backNote : S.backNoteEmpty}
          >
            {item._note ? (
              `"${item._note}"`
            ) : session ? (
              <>
                <span style={{ fontSize: 14 }}>✏️</span>
                write on the back...
              </>
            ) : null}
          </div>
        )}

        {/* Source + timestamp */}
        {(sourceName || pinnedAgo) && (
          <div style={S.backSource}>
            {pinnedAgo && <span>Pinned {pinnedAgo}</span>}
            {pinnedAgo && sourceName && <span> · </span>}
            {sourceName && (
              <span>
                from <span style={S.backCommunityName}>{sourceName}</span>
              </span>
            )}
          </div>
        )}

        {/* Fallback if no source — just show item type */}
        {!sourceName && !pinnedAgo && (
          <div style={S.backSource}>
            {({ book: "📖 Book", movie: "🎬 Film", show: "📺 Show", game: "🎮 Game", trophy: "🏆 Trophy", goal: "🎯 Goal", country: "🌍 Travel" })[item._pinType] || ""}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MantlPiece — main shelf component
   ═══════════════════════════════════════════════════════════════ */
export default function MantlPiece({ profile, shelves, shelvesLoaded, session, onUpdateProfile, onToast, onViewItem, onViewCountry, onOpenPinPicker }) {
  const pins = profile.mantlPins || [];
  const [activeIdx, setActiveIdx] = useState(null);

  /* ── Resolve pinned items ── */
  const allItems = [
    ...(shelves.books || []).map(b => ({ ...b, _pinType: "book" })),
    ...(shelves.movies || []).map(m => ({ ...m, _pinType: "movie" })),
    ...(shelves.shows || []).map(s => ({ ...s, _pinType: "show" })),
    ...(shelves.games || []).map(g => ({ ...g, _pinType: "game" })),
    ...(shelves.trophies || []).map(t => ({ ...t, _pinType: "trophy" })),
    ...(shelves.goals || []).map(g => ({ ...g, _pinType: "goal" })),
    ...(shelves.countries || []).map(c => ({ ...c, _pinType: "country", title: c.countryName, cover: c.photoUrl })),
  ];
  const pinnedItems = pins.map(pin => {
    const item = allItems.find(it => it._pinType === pin.type && String(it.id) === String(pin.id));
    return item ? { ...item, _note: pin.note || "" } : null;
  }).filter(Boolean);

  const handleTap = useCallback((i, item) => {
    if (activeIdx === i) {
      // Second tap → open detail view
      if (!item) return;
      if (item._pinType === "country") { onViewCountry(item); return; }
      const shelfType = ({ book: "books", movie: "movies", show: "shows", game: "games", trophy: "trophies", goal: "goals" })[item._pinType];
      onViewItem({ ...item, shelfType });
    } else {
      setActiveIdx(i);
    }
  }, [activeIdx, onViewItem, onViewCountry]);

  const handleSaveNote = useCallback(async (idx, newNote) => {
    if (!session || idx === null) return;
    const item = pinnedItems[idx];
    if (!item) return;
    const updatedPins = (profile.mantlPins || []).map(p =>
      p.type === item._pinType && String(p.id) === String(item.id)
        ? { ...p, note: newNote.trim().slice(0, 120) }
        : p
    );
    const { error } = await supabase.from("profiles").update({ mantl_pins: updatedPins }).eq("id", session.user.id);
    if (!error) {
      onUpdateProfile({ mantlPins: updatedPins });
      if (onToast) onToast("Note saved!");
    }
  }, [session, pinnedItems, profile.mantlPins, onUpdateProfile, onToast]);

  /* ── Loading skeleton ── */
  if (pins.length > 0 && !shelvesLoaded) {
    return (
      <div style={S.mantl}>
        <div style={S.displayCase}>
          <div style={S.displayHighlight} />
          <div style={S.titleRow}>
            <div style={S.titleLine} />
            <div style={S.title}>{profile.mantlpieceTitle || "My Mantl"}</div>
            <div style={S.titleLine} />
          </div>
          <div style={S.grid}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ borderRadius: 10, aspectRatio: "1 / 1.43", opacity: 0.4 }} className="skeleton-dark" />
            ))}
          </div>
          <div style={S.ledge} />
        </div>
        <div style={S.ledgeGlow} />
      </div>
    );
  }

  /* ── Pad to 4 slots ── */
  const slots = [...pinnedItems];
  while (slots.length < 4) slots.push(null);

  return (
    <div style={S.mantl}>
      {/* Google Font for handwriting — Caveat */}
      <link
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap"
        rel="stylesheet"
      />

      <div style={S.displayCase}>
        <div style={S.displayHighlight} />

        {/* Title inscription */}
        <div style={S.titleRow}>
          <div style={S.titleLine} />
          <div style={{ ...S.title, cursor: session ? "pointer" : "default" }}
            onClick={session ? async () => {
              const newTitle = prompt("Name your Mantlpiece:", profile.mantlpieceTitle || "My Mantl");
              if (newTitle !== null) {
                const trimmed = newTitle.trim().slice(0, 40) || "My Mantl";
                const { error } = await sb(supabase.from("profiles").update({ mantlpiece_title: trimmed }).eq("id", session.user.id), onToast, "Couldn't save title");
                if (!error) onUpdateProfile({ mantlpieceTitle: trimmed });
              }
            } : undefined}
            title={session ? "Tap to rename" : undefined}
          >{profile.mantlpieceTitle || "My Mantl"}</div>
          <div style={S.titleLine} />
          {onOpenPinPicker && <div style={S.editBtn} onClick={onOpenPinPicker} title="Edit pins">✎</div>}
        </div>

        {/* 2×2 Grid */}
        <div style={S.grid}>
          {slots.slice(0, 4).map((item, i) => {
            if (!item) {
              return onOpenPinPicker ? (
                <div key={`ghost-${i}`} style={S.ghostCell} onClick={onOpenPinPicker}>
                  <div style={S.ghostIcon}>+</div>
                  <div style={S.ghostLabel}>Pin</div>
                </div>
              ) : (
                <div key={`ghost-${i}`} style={{ ...S.ghostCell, cursor: "default", border: "2px dashed rgba(255,255,255,0.04)" }}>
                  <div style={{ ...S.ghostIcon, opacity: 0.25 }}>·</div>
                </div>
              );
            }

            return (
              <FlipCard
                key={`pin-${i}`}
                item={item}
                pin={pins[i] || {}}
                isActive={activeIdx === i}
                session={session}
                onTap={() => handleTap(i, item)}
                onSaveNote={(note) => handleSaveNote(i, note)}
                onViewItem={onViewItem}
              />
            );
          })}
        </div>

        {/* Hint text — only shows when nothing is flipped */}
        <div style={{
          textAlign: "center",
          padding: "0 0 10px",
          opacity: 0.35,
          transition: "opacity 0.3s ease",
        }}>
          <span style={{
            fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
            fontSize: 9,
            color: "var(--text-faint)",
            letterSpacing: "0.06em",
          }}>
            long press to flip
          </span>
        </div>

        <div style={S.ledge} />
      </div>
      <div style={S.ledgeGlow} />
    </div>
  );
}
