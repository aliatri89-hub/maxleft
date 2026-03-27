import { t } from "../../../theme";
import CommunityLogModal from "../shared/CommunityLogModal";
import { useState } from "react";

const PATREON_URL = "https://www.patreon.com/blankcheck";

/**
 * BlankCheckLogModal — thin wrapper for Blank Check community.
 *
 * Community-specific:
 *   - "Listened with commentary" toggle (Patreon items only)
 *   - Commentary status badge when logged
 *   - Listen platforms: Spotify, Apple Podcasts, Patreon
 */
export default function BlankCheckLogModal({
  isPatreon, onToggleCommentary, ...props
}) {
  const [listenedWithCommentary, setListenedWithCommentary] = useState(
    props.progressData?.listened_with_commentary || false
  );

  return (
    <CommunityLogModal
      {...props}
      config={{
        communitySlug: "blankcheck",
        communityName: "Blank Check",
        platforms: [
          { type: "spotify" },
          { type: "apple" },
          { type: "patreon", url: PATREON_URL },
        ],
        isPatreon,
      }}
      buildLogPayload={(base) => ({
        ...base,
        listened_with_commentary: listenedWithCommentary,
      })}
      renderStatusBadges={(pd) =>
        pd?.listened_with_commentary ? (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 10px",
            background: "rgba(250,204,21,0.1)",
            border: "1px solid rgba(250,204,21,0.3)",
            borderRadius: 20, fontSize: 11, color: t.gold, fontWeight: 600,
          }}>
            Commentary
          </div>
        ) : null
      }
      renderCustomSection={({ saving }) =>
        isPatreon ? (
          <div style={{ marginBottom: 16 }}>
            <style>{`
              .clm-commentary-toggle {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 12px;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 10px;
                cursor: pointer;
                -webkit-tap-highlight-color: transparent;
                transition: background 0.2s, border-color 0.2s;
                user-select: none;
              }
              .clm-commentary-toggle.active {
                background: rgba(250,204,21,0.1);
                border-color: rgba(250,204,21,0.35);
              }
              .clm-commentary-toggle:active {
                background: rgba(255,255,255,0.06);
              }
            `}</style>
            <div
              className={`clm-commentary-toggle${listenedWithCommentary ? " active" : ""}`}
              onClick={async () => {
                if (saving) return;
                const newValue = !listenedWithCommentary;
                setListenedWithCommentary(newValue);
                try {
                  await onToggleCommentary(props.item?.id, newValue);
                } catch (e) {
                  console.error("[BlankCheckLog] Commentary toggle error:", e);
                  setListenedWithCommentary(!newValue);
                }
              }}
            >
              {/* Toggle switch */}
              <div style={{
                width: 40, height: 22, borderRadius: 11,
                background: listenedWithCommentary
                  ? "linear-gradient(135deg, #facc15, #eab308)"
                  : "rgba(255,255,255,0.12)",
                position: "relative",
                transition: "background 0.2s",
                flexShrink: 0,
              }}>
                <div style={{
                  position: "absolute",
                  top: 2, left: listenedWithCommentary ? 20 : 2,
                  width: 18, height: 18, borderRadius: "50%",
                  background: listenedWithCommentary ? t.textPrimary : t.textMuted,
                  transition: "left 0.2s, background 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }} />
              </div>

              {/* Label */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: listenedWithCommentary ? t.gold : t.textMuted,
                  transition: "color 0.2s",
                }}>
                  Listened to commentary
                </div>
                <div style={{
                  fontSize: 10,
                  color: listenedWithCommentary ? "rgba(250,204,21,0.5)" : t.textFaint,
                  marginTop: 1, transition: "color 0.2s",
                }}>
                  Listened to the Patreon commentary episode
                </div>
              </div>
            </div>
          </div>
        ) : null
      }
    />
  );
}
