import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../supabase";
import { useGlobalBadges } from "../../hooks/useGlobalBadges";

const accent = "#EF9F27";
const SIZE = 68;
const STROKE = 2.5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Gold pedestal — tapered column with base plate */
function Pedestal({ gold }) {
  const hi = gold ? "#c9a84c" : "#555";
  const lo = gold ? "#8b6914" : "#333";
  const mid = gold ? "#b8942e" : "#444";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: -1, position: "relative", zIndex: 0 }}>
      <div style={{ width: 28, height: 4, background: `linear-gradient(180deg, ${hi}, ${lo})`, borderRadius: 1 }} />
      <div style={{ width: 20, height: 12, background: `linear-gradient(180deg, ${mid}, ${lo})`, clipPath: "polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)", marginTop: -1 }} />
      <div style={{ width: 32, height: 5, background: `linear-gradient(180deg, ${hi}, ${lo})`, borderRadius: "1px 1px 2px 2px", marginTop: -1 }} />
    </div>
  );
}

function BadgeSlot({ badge, delay = 0, onTap }) {
  const badgeAccent = badge.accent_color || accent;
  return (
    <div
      onClick={onTap}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        cursor: "pointer", width: 80,
        animation: `badgeShelfIn 0.4s ${delay}s ease-out both`,
        opacity: 0,
      }}
    >
      <div style={{ position: "relative", width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={`${badgeAccent}30`} strokeWidth={STROKE} />
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={badgeAccent} strokeWidth={STROKE}
            strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={0} />
        </svg>
        <div style={{
          position: "absolute", top: STROKE + 3, left: STROKE + 3,
          width: SIZE - (STROKE + 3) * 2, height: SIZE - (STROKE + 3) * 2,
          borderRadius: "50%", overflow: "hidden", background: "#1a1714",
        }}>
          {badge.image_url ? (
            <img src={badge.image_url} alt={badge.name} style={{
              width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.1)",
            }} />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              background: `radial-gradient(circle, ${badgeAccent}30, ${badgeAccent}10)`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
            }}>🏆</div>
          )}
        </div>
        <div style={{
          position: "absolute", bottom: -1, right: -1,
          width: 18, height: 18, borderRadius: "50%",
          background: "#22c55e", border: "2px solid #0f0d0b",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, color: "#fff", fontWeight: 700,
        }}>✓</div>
      </div>
      <Pedestal gold />
      {/* Engraved plaque */}
      {badge.plaque_name && (
        <div style={{
          marginTop: 4,
          padding: "2px 8px",
          background: "linear-gradient(180deg, #c9a84c, #8b6914)",
          borderRadius: 2,
          fontSize: 8, fontWeight: 700,
          color: "#2a1f0a",
          fontFamily: "var(--font-display)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          textAlign: "center",
          lineHeight: 1.3,
          maxWidth: 80,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {badge.plaque_name}
        </div>
      )}
    </div>

function EmptySlot({ delay = 0, onTap }) {
  return (
    <div onClick={onTap} style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      width: 80, cursor: "pointer",
      animation: `badgeShelfIn 0.4s ${delay}s ease-out both`, opacity: 0,
    }}>
      <div style={{
        width: SIZE, height: SIZE, borderRadius: "50%",
        border: "1.5px dashed rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 3v12M3 9h12" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <Pedestal gold={false} />
    </div>
  );
}

/** ── Badge Picker Bottom Sheet ── */
function BadgePicker({ earnedBadges, currentIds, slotIndex, onPick, onClear, onClose }) {
  const alreadyPinned = new Set(currentIds.filter((id, i) => i !== slotIndex && id));

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480,
          background: "#1a1714",
          borderRadius: "20px 20px 0 0",
          padding: "20px 16px 32px",
          maxHeight: "60vh", overflowY: "auto",
          animation: "pickerSlideUp 0.25s ease-out",
        }}
      >
        <style>{`
          @keyframes pickerSlideUp {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
        `}</style>

        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
        </div>

        {/* Title */}
        <div style={{
          fontFamily: "'Permanent Marker', cursive", fontSize: 16,
          color: accent, textAlign: "center", marginBottom: 16,
          letterSpacing: "0.04em",
        }}>
          Pick a trophy
        </div>

        {/* Clear option if slot currently has a badge */}
        {currentIds[slotIndex] && (
          <div
            onClick={onClear}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 8, padding: "10px 0", marginBottom: 12,
              fontFamily: "var(--font-mono)", fontSize: 12,
              color: "var(--text-faint)", cursor: "pointer",
              borderBottom: "0.5px solid rgba(255,255,255,0.06)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Remove from mantlpiece
          </div>
        )}

        {/* Badge grid */}
        {earnedBadges.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "24px 0",
            fontFamily: "var(--font-body)", fontSize: 13,
            color: "var(--text-muted)", fontStyle: "italic",
          }}>
            No badges earned yet
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
            gap: 12, justifyItems: "center",
          }}>
            {earnedBadges.map(badge => {
              const isPinned = alreadyPinned.has(badge.id);
              const badgeAccent = badge.accent_color || accent;
              return (
                <div
                  key={badge.id}
                  onClick={() => !isPinned && onPick(badge.id)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    cursor: isPinned ? "not-allowed" : "pointer",
                    opacity: isPinned ? 0.3 : 1,
                    transition: "opacity 0.15s, transform 0.15s",
                  }}
                >
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    border: `2px solid ${badgeAccent}`,
                    overflow: "hidden", background: "#1a1714",
                  }}>
                    {badge.image_url ? (
                      <img src={badge.image_url} alt={badge.name} style={{
                        width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.1)",
                      }} />
                    ) : (
                      <div style={{
                        width: "100%", height: "100%",
                        background: `radial-gradient(circle, ${badgeAccent}30, ${badgeAccent}10)`,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                      }}>🏆</div>
                    )}
                  </div>
                  <div style={{
                    marginTop: 5, fontSize: 10, fontWeight: 600,
                    color: "rgba(255,255,255,0.6)", textAlign: "center",
                    lineHeight: 1.2, maxWidth: 72,
                    fontFamily: "var(--font-display)",
                  }}>
                    {badge.name}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function BadgeShelf({ session, profile, onUpdateProfile, onToast }) {
  const userId = session?.user?.id;
  const { earnedBadges, loading } = useGlobalBadges(userId);
  const [pickerSlot, setPickerSlot] = useState(null); // null | 0 | 1 | 2

  // Resolve display slots: custom picks or default to 3 most recent
  const customPicks = profile?.mantlpiece_badges; // array of badge IDs or null
  const isCustomized = Array.isArray(customPicks);

  const displayBadges = useMemo(() => {
    if (!isCustomized) {
      // Default: 3 most recent earned
      return earnedBadges.slice(0, 3);
    }
    // Custom: look up each pinned badge ID from earned badges
    const earnedMap = new Map(earnedBadges.map(b => [b.id, b]));
    return customPicks.slice(0, 3).map(id => earnedMap.get(id) || null);
  }, [earnedBadges, customPicks, isCustomized]);

  // Current slot IDs for the picker (to grey out already-pinned ones)
  const currentSlotIds = useMemo(() => {
    if (isCustomized) return [...customPicks.slice(0, 3)];
    return displayBadges.map(b => b?.id || null);
  }, [displayBadges, customPicks, isCustomized]);

  const hasAnyBadges = earnedBadges.length > 0;

  // ── Save mantlpiece picks ──
  const savePicks = async (newPicks) => {
    if (!userId) return;
    // Update local state immediately
    if (onUpdateProfile) onUpdateProfile({ mantlpiece_badges: newPicks });
    // Persist to DB
    const { error } = await supabase
      .from("profiles")
      .update({ mantlpiece_badges: newPicks })
      .eq("id", userId);
    if (error) {
      console.error("[Mantlpiece] Save error:", error.message);
      if (onToast) onToast("Couldn't save — try again");
    }
  };

  const handlePick = (badgeId) => {
    const newPicks = [...currentSlotIds];
    // Ensure array is 3 long
    while (newPicks.length < 3) newPicks.push(null);
    newPicks[pickerSlot] = badgeId;
    savePicks(newPicks);
    setPickerSlot(null);
  };

  const handleClear = () => {
    const newPicks = [...currentSlotIds];
    while (newPicks.length < 3) newPicks.push(null);
    newPicks[pickerSlot] = null;
    // If all slots empty, reset to null (back to default behavior)
    const allEmpty = newPicks.every(id => !id);
    savePicks(allEmpty ? null : newPicks);
    setPickerSlot(null);
  };

  return (
    <div style={{ padding: "0 16px", marginBottom: 0 }}>
      <style>{`
        @keyframes badgeShelfIn {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* ── Glass case ── */}
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "0.5px solid rgba(255,255,255,0.06)",
        borderBottom: "none",
        borderRadius: "12px 12px 0 0",
        padding: "22px 8px 16px",
      }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", gap: 20, padding: "8px 0" }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div className="skeleton-dark" style={{ width: SIZE, height: SIZE, borderRadius: "50%" }} />
                <div className="skeleton-dark" style={{ width: 28, height: 20, borderRadius: 2 }} />
              </div>
            ))}
          </div>
        ) : !hasAnyBadges ? (
          <div style={{ textAlign: "center", padding: "12px 16px" }}>
            <div style={{
              fontSize: 13, color: "var(--text-muted)",
              fontFamily: "var(--font-body)", fontStyle: "italic", lineHeight: 1.5,
            }}>
              Join a community and start tracking to earn badges
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "nowrap" }}>
            {[0, 1, 2].map(i => {
              const badge = displayBadges[i];
              return badge ? (
                <BadgeSlot
                  key={badge.id} badge={badge}
                  delay={i * 0.08}
                  onTap={() => setPickerSlot(i)}
                />
              ) : (
                <EmptySlot
                  key={`empty-${i}`}
                  delay={i * 0.08}
                  onTap={() => earnedBadges.length > 0 ? setPickerSlot(i) : null}
                />
              );
            })}
          </div>
        )}

        {/* Nudge to explore communities when shelf isn't full */}
        {!loading && hasAnyBadges && displayBadges.filter(Boolean).length < 3 && (
          <div style={{
            textAlign: "center", marginTop: 12,
            fontSize: 11, color: "var(--text-faint)",
            fontFamily: "var(--font-mono)", letterSpacing: "0.02em",
            fontStyle: "italic",
          }}>
            Explore communities to earn more
          </div>
        )}
      </div>

      {/* ── Wood shelf ── */}
      <div style={{
        height: 12,
        background: "linear-gradient(180deg, #6b4c2a 0%, #5a3f22 40%, #4a331c 100%)",
        borderRadius: "0 0 4px 4px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        position: "relative",
      }}>
        <div style={{ position: "absolute", top: 3, left: 0, right: 0, height: "0.5px", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", top: 7, left: 0, right: 0, height: "0.5px", background: "rgba(255,255,255,0.04)" }} />
      </div>

      {/* ── MANTLPIECE label ── */}
      <div style={{ textAlign: "center", padding: "12px 0 6px" }}>
        <div style={{
          fontFamily: "'Permanent Marker', cursive",
          fontSize: 18, color: `${accent}88`,
          letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1,
        }}>
          mantlpiece
        </div>
      </div>

      {/* ── Badge Picker ── */}
      {pickerSlot !== null && (
        <BadgePicker
          earnedBadges={earnedBadges}
          currentIds={currentSlotIds}
          slotIndex={pickerSlot}
          onPick={handlePick}
          onClear={handleClear}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </div>
  );
}
