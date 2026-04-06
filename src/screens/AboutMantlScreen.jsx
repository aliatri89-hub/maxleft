import React from "react";

const AMBER = "#EF9F27";

function AboutMantlScreen({ onBack }) {
  return (
    <div className="profile-screen" style={{ paddingBottom: "calc(80px + var(--sab, 0px))" }}>
      <div className="profile-screen-header">
        <button className="profile-back" onClick={onBack}>← Back</button>
      </div>

      {/* ── About MANTL ── */}
      <div className="profile-group">
        <div className="profile-group-label">About MANTL</div>
        <div className="profile-group-card" style={{ padding: "16px 18px" }}>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)",
            lineHeight: 1.7, margin: 0,
          }}>
            MANTL started in a basement — watching Academy screener tapes with sharpie-scrawled labels on cream-colored VHS sleeves. That feeling of discovering a film because someone you trusted pressed it into your hands is the whole point.
          </p>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)",
            lineHeight: 1.7, margin: "14px 0 0",
          }}>
            Film podcasts carry that same energy. Hosts spend hours pulling apart a movie — why it works, why it doesn't, what it meant to them — and suddenly you need to see it. MANTL is built around that moment. It connects what you hear to what you watch, so nothing falls through the cracks.
          </p>
        </div>
      </div>

      {/* ── Who MANTL is For ── */}
      <div className="profile-group">
        <div className="profile-group-label">Who MANTL is For</div>
        <div className="profile-group-card" style={{ padding: "16px 18px" }}>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)",
            lineHeight: 1.7, margin: 0,
          }}>
            If you listen to film podcasts and constantly add movies to a mental list you'll never remember — MANTL is for you.
          </p>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)",
            lineHeight: 1.7, margin: "14px 0 0",
          }}>
            Track the films your favorite podcasts cover. See what's new, what's streaming, and what your community is watching. Earn badges for completing series and deep dives. Play daily film games. Connect your Letterboxd to bring your watch history along.
          </p>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)",
            lineHeight: 1.7, margin: "14px 0 0",
          }}>
            It's your film life — organized around the conversations that drive it.
          </p>
        </div>
      </div>

      {/* ── About the Creator ── */}
      <div className="profile-group">
        <div className="profile-group-label">About the Creator</div>
        <div className="profile-group-card" style={{ padding: "16px 18px" }}>
          <div style={{
            fontFamily: "var(--font-sharpie, 'Permanent Marker', cursive)", fontSize: 22,
            color: AMBER, marginBottom: 10,
          }}>
            Ali Atri
          </div>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)",
            lineHeight: 1.7, margin: 0,
          }}>
            Solo builder. Film nerd. Podcast listener who kept losing track of what to watch next, so he built an app about it.
          </p>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)",
            lineHeight: 1.7, margin: "14px 0 0",
          }}>
            MANTL is designed, built, and maintained by one person. Every feature, every badge, every pixel. If you have ideas, feedback, or just want to say hi — reach out at{" "}
            <span
              onClick={() => window.open("mailto:hello@mymantl.app", "_blank")}
              style={{ color: AMBER, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
            >hello@mymantl.app</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AboutMantlScreen;
