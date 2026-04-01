import { t } from "../../theme";
// src/features/movie-night/MovieNightPublic.jsx
//
// Public landing page for /night/CODE links — no auth required.
// Shows an invite screen with "Sign up & Play" CTA.
// After auth, user is redirected back to /night/CODE where
// the normal deep link handler auto-opens Movie Night.
//
import { useCallback } from "react";
import { supabase } from "../../supabase";

const CREAM = "#f0ebe1";
const DARK = "#0f0d0b";
const PURPLE = "#9b59b6";

export default function MovieNightPublic({ code }) {
  const handleSignIn = useCallback(async () => {
    // Redirect back to /night/CODE after auth so the deep link handler picks it up
    const redirectUrl = `${window.location.origin}/night/${code}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl },
    });
    if (error) console.error("[MovieNightPublic] auth error:", error);
  }, [code]);

  return (
    <div style={{
      minHeight: "100vh", background: DARK,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "32px 24px",
      fontFamily: t.fontDisplay,
    }}>
      {/* Logo */}
      <div style={{
        fontFamily: t.fontHeadline, fontSize: 22, color: CREAM,
        letterSpacing: 3, marginBottom: 32, opacity: 0.7,
      }}>M▶NTL</div>

      {/* Invite card */}
      <div style={{
        width: "100%", maxWidth: 360, padding: "32px 24px",
        background: "rgba(240,235,225,0.03)",
        border: "1px solid rgba(240,235,225,0.08)",
        borderRadius: 20, textAlign: "center",
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🍿</div>
        <div style={{
          fontFamily: t.fontHeadline, fontSize: 24, color: PURPLE,
          letterSpacing: 1, lineHeight: 1.2, marginBottom: 8,
        }}>MOVIE NIGHT</div>
        <div style={{
          color: CREAM, opacity: 0.6, fontSize: 15, lineHeight: 1.5,
          marginBottom: 24, maxWidth: 280, margin: "0 auto 24px",
        }}>
          You've been invited to swipe through movies together.
          Only the films you BOTH pick get revealed.
        </div>

        <div style={{
          padding: "12px 16px", borderRadius: 12, marginBottom: 24,
          background: "rgba(155,89,182,0.08)", border: "1px solid rgba(155,89,182,0.15)",
        }}>
          <div style={{ fontSize: 11, color: CREAM, opacity: 0.4, marginBottom: 4 }}>Session code</div>
          <div style={{
            fontSize: 28, fontWeight: 800, fontFamily: t.fontDisplay,
            letterSpacing: 8, color: PURPLE,
          }}>{code}</div>
        </div>

        <button onClick={handleSignIn} style={{
          width: "100%", padding: "16px 0", borderRadius: 14,
          background: PURPLE, color: "#fff", border: "none",
          fontSize: 17, fontWeight: 700, cursor: "pointer",
          fontFamily: t.fontDisplay, letterSpacing: 0.5,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google to play
        </button>
      </div>

      {/* How it works */}
      <div style={{
        marginTop: 32, maxWidth: 360, width: "100%",
        display: "flex", gap: 16, justifyContent: "center",
      }}>
        {[
          { emoji: "👆", text: "Swipe movies" },
          { emoji: "🤫", text: "Picks are private" },
          { emoji: "✨", text: "Matches revealed" },
        ].map((step, i) => (
          <div key={i} style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{step.emoji}</div>
            <div style={{ fontSize: 12, color: CREAM, opacity: 0.5, lineHeight: 1.3 }}>{step.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
