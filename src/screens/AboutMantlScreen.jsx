import React from "react";

const AMBER = "#EF9F27";

function AboutMantlScreen({ onBack }) {
  return (
    <div className="profile-screen" style={{ paddingBottom: "calc(80px + var(--sab, 0px))" }}>
      <div className="profile-screen-header">
        <button className="profile-back" onClick={onBack}>← Back</button>
      </div>

      {/* ── About Mantl ── */}
      <div className="profile-group">
        <div className="profile-group-label">About Mantl</div>
        <div className="profile-group-card" style={{ padding: "16px 18px" }}>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)",
            lineHeight: 1.7, margin: 0,
          }}>
            Mantl recaptures that feeling of discovering a film because someone you trusted lent you a VHS tape. Or browsing the aisles of Blockbuster, reading the backs of tapes and checking out the staff picks.
          </p>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)",
            lineHeight: 1.7, margin: "14px 0 0",
          }}>
            Both involve voices you trust helping you pick the next thing to watch.
          </p>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)",
            lineHeight: 1.7, margin: "14px 0 0",
          }}>
            Today, film podcasts are our trusted voice. The hosts spend hours pulling apart a movie — why it works, why it doesn't, what it meant to them — and why you do or don't need to see it.
          </p>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)",
            lineHeight: 1.7, margin: "14px 0 0",
          }}>
            Mantl is built around that trust and connecting what you hear to what you watch.
          </p>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)",
            lineHeight: 1.7, margin: "14px 0 0",
          }}>
            Helping you find another reason to press play.
          </p>
        </div>
      </div>

      {/* ── Who Mantl is For ── */}
      <div className="profile-group">
        <div className="profile-group-label">Who Mantl is For</div>
        <div className="profile-group-card" style={{ padding: "16px 18px" }}>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)",
            lineHeight: 1.7, margin: 0,
          }}>
            If you see a pod drop and can't listen till you watch the movie — Mantl is for you.
          </p>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)",
            lineHeight: 1.7, margin: "14px 0 0",
          }}>
            Track the films your favorite podcasts cover. See what's new, what's streaming, and what your community is watching.
          </p>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)",
            lineHeight: 1.7, margin: "14px 0 0",
          }}>
            Earn badges for completing series and deep dives, play daily film games, and connect your Letterboxd to bring your watch history along.
          </p>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)",
            lineHeight: 1.7, margin: "14px 0 0",
          }}>
            If a new podcast drops and the film is already in your watch history, we'll let you know.
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
            I built Mantl as a film lover and podcast listener. From the podcast side, I love pairing what to watch next with something to listen to.
          </p>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)",
            lineHeight: 1.7, margin: "14px 0 0",
          }}>
            When I pick my own movies, I'm always curious who covered it — and got sick of wading through Spotify search results to find out.
          </p>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)",
            lineHeight: 1.7, margin: "14px 0 0",
          }}>
            Mantl is designed, built, and maintained by one person. Every feature, badge, and game — built by hand with a rich pool of TMDB data.
          </p>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)",
            lineHeight: 1.7, margin: "14px 0 0",
          }}>
            If you have ideas, feedback, or just want to say hi — reach out at{" "}
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
