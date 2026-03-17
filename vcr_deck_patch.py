#!/usr/bin/env python3
"""
VCR Deck Upgrade — Option C
Beveled play button + speaker grille ridges + green LED indicator

Apply from project root:
  python3 vcr_deck_patch.py
"""
import re

# ═══════════════════════════════════════
# 1. FeedScreen.jsx — Replace VCR deck
# ═══════════════════════════════════════

feed_path = "src/screens/FeedScreen.jsx"
with open(feed_path, "r") as f:
    feed = f.read()

OLD_DECK = '''      {/* ═══ VCR DECK — playable audio on MANTL ═══ */}
      {hasPlayableAudio && (
        <div style={{
          background: "#1a1612",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          padding: "6px 0 5px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          borderRadius: showPicker ? "0" : "0 0 4px 4px",
        }}>
          {/* Subtle VCR ridges */}
          <div style={{
            position: "absolute", top: 0, left: 16, right: 16, height: 1,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.06) 80%, transparent)",
          }} />

          {/* ▶ VCR Play button — always opens picker */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPicker(p => !p);
            }}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6,
              cursor: "pointer",
              padding: "4px 20px",
              display: "flex", alignItems: "center", gap: 6,
              transition: "background 0.15s",
            }}
          >
            {(() => {
              const activeSrc = playableSources.find(s =>
                currentEp && currentEp.enclosureUrl === s.episode_url
              );
              const isThisPlaying = activeSrc && isPlaying;
              return isThisPlaying ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)">
                  <path d="M8 5v14l11-7z" />
                </svg>
              );
            })()}
          </button>
        </div>
      )}'''

NEW_DECK = '''      {/* ═══ VCR DECK — playable audio on MANTL ═══ */}
      {hasPlayableAudio && (() => {
        const activeSrc = playableSources.find(s =>
          currentEp && currentEp.enclosureUrl === s.episode_url
        );
        const isThisPlaying = activeSrc && isPlaying;
        return (
        <div style={{
          background: "linear-gradient(180deg, #1e1a16 0%, #1a1612 50%, #161310 100%)",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          padding: "8px 16px 7px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          position: "relative",
          borderRadius: showPicker ? "0" : "0 0 4px 4px",
        }}>
          {/* Top highlight edge */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 1,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 15%, rgba(255,255,255,0.08) 85%, transparent)",
          }} />
          {/* Bottom shadow edge */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
            background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.3) 15%, rgba(0,0,0,0.3) 85%, transparent)",
            borderRadius: showPicker ? 0 : "0 0 4px 4px",
          }} />

          {/* Left speaker grille */}
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <div style={{ display: "flex", gap: 3 }}>
              {[0,1,2,3,4,5,6].map(i => (
                <div key={i} style={{
                  width: 1, height: 16,
                  background: i % 2 === 0 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)",
                }} />
              ))}
            </div>
          </div>

          {/* ▶ VCR Play button — beveled, opens picker */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPicker(p => !p);
              }}
              style={{
                background: "linear-gradient(180deg, #2a2520 0%, #1a1612 40%, #151210 100%)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderBottomColor: "rgba(0,0,0,0.4)",
                borderTopColor: "rgba(255,255,255,0.12)",
                borderRadius: 4,
                cursor: "pointer",
                padding: "5px 24px",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 4px rgba(0,0,0,0.4)",
                transition: "all 0.1s ease",
              }}
            >
              {isThisPlaying ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            {/* Green LED — pulses when playing, dim when idle */}
            <div style={{
              position: "absolute", top: -1, right: -1,
              width: 5, height: 5, borderRadius: "50%",
              background: isThisPlaying ? "#34d399" : "rgba(52,211,153,0.2)",
              border: isThisPlaying ? "none" : "0.5px solid rgba(52,211,153,0.15)",
              boxShadow: isThisPlaying ? "0 0 4px #34d399, 0 0 8px rgba(52,211,153,0.3)" : "none",
              animation: isThisPlaying ? "ledPulse 2s ease infinite" : "none",
              transition: "all 0.3s ease",
            }} />
          </div>

          {/* Right speaker grille */}
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <div style={{ display: "flex", gap: 3 }}>
              {[0,1,2,3,4,5,6].map(i => (
                <div key={i} style={{
                  width: 1, height: 16,
                  background: i % 2 === 0 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)",
                }} />
              ))}
            </div>
          </div>
        </div>
        );
      })()}'''

assert OLD_DECK in feed, "❌ Could not find old VCR deck block in FeedScreen.jsx — has it already been patched?"
feed = feed.replace(OLD_DECK, NEW_DECK)
with open(feed_path, "w") as f:
    f.write(feed)
print("✅ FeedScreen.jsx — VCR deck upgraded to Option C")

# ═══════════════════════════════════════
# 2. App.css — Add LED pulse keyframe
# ═══════════════════════════════════════

css_path = "src/styles/App.css"
with open(css_path, "r") as f:
    css = f.read()

if "ledPulse" not in css:
    LED_KEYFRAME = """  @keyframes ledPulse {
    0%, 100% { opacity: 0.9; box-shadow: 0 0 4px #34d399, 0 0 8px rgba(52,211,153,0.3); }
    50% { opacity: 1; box-shadow: 0 0 6px #34d399, 0 0 12px rgba(52,211,153,0.5); }
  }"""
    # Insert after the fadeIn keyframe
    anchor = "@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }"
    assert anchor in css, "❌ Could not find fadeIn keyframe anchor in App.css"
    css = css.replace(anchor, anchor + "\n" + LED_KEYFRAME)
    with open(css_path, "w") as f:
        f.write(css)
    print("✅ App.css — Added ledPulse keyframe")
else:
    print("⏭  App.css — ledPulse already exists, skipping")

print("\n🎛  VCR Deck upgrade complete!")
print("   • Beveled play button with inset highlight + drop shadow")
print("   • Speaker grille ridges flanking the button")
print("   • Green LED: pulses when playing, dim dot when idle")
print("   • Gradient background for depth")
