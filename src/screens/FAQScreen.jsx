import React, { useState } from "react";

const AMBER = "#EF9F27";
const BG = "#0f0d0b";
const CARD = "#1a1714";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT = "#ffffff";
const MUTED = "rgba(255,255,255,0.88)";
const FAINT = "rgba(255,255,255,0.60)";

const GAMES_HUB_URL = "https://maxleft.app/play";

const sections = [
  {
    title: "Podcast Feeds",
    items: [
      {
        q: "My podcast feed isn't refreshing.",
        a: "Pull down on the feed to refresh. If episodes still seem out of date, give it a few minutes and try again.",
      },
      {
        q: "An episode isn't showing up.",
        a: "Every episode on Max Left is manually reviewed and matched to a film, so we're sometimes a few hours behind the official RSS feed. If it's not there yet, check back soon — it'll show up.",
      },
    ],
  },
  {
    title: "Badges & Progress",
    items: [
      {
        q: "I logged a film but didn't get a badge.",
        a: "Make sure you're following the community that the badge belongs to. Head to the Communities tab in the bottom nav, find the podcast, and tap Follow.",
      },
      {
        q: "I earned a badge and then lost it.",
        a: "Some badges are \"living badges\" — they break when the podcast covers new films in that set. Catch up to re-earn it.",
      },
      {
        q: "Which films do I need to complete a badge?",
        a: null, // custom render
        customKey: "badge_films",
      },
    ],
  },
  {
    title: "Communities",
    items: [
      {
        q: "How do I join a community?",
        a: "Communities are part of the Max Left subscription ($5/month).",
      },
      {
        q: "What can I do for free?",
        a: "Daily games, podcast feed listening, community browsing, and basic film tracking are all free.",
      },
    ],
  },
  {
    title: "Tracking",
    items: [
      {
        q: "Can I delete a film log?",
        a: "Yes — open the film, tap your log entry, and choose Delete.",
      },
      {
        q: "Does Max Left track TV shows?",
        a: "Yes, Max Left tracks both films and TV shows.",
      },
    ],
  },
  {
    title: "Games",
    items: [
      {
        q: "Are games free?",
        a: "Yes, all daily games are free.",
      },
      {
        q: "Can I see my game history and stats?",
        a: "Game stats and archives are available to subscribers.",
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        q: "How do I cancel my subscription?",
        a: "Manage your subscription through your App Store or Google Play account subscriptions.",
      },
      {
        q: "What happens to my data if I cancel?",
        a: "Your logs and profile are kept. Community features and badges are paused until you resubscribe.",
      },
      {
        q: "Can I change my username or profile picture?",
        a: "Yes. Tap your profile badge in the upper left corner of the app. Tap your username to change it, or tap your avatar to update your profile picture.",
      },
      {
        q: "How do I delete my account?",
        a: "Tap your profile badge in the upper left corner of the app, then scroll to the bottom of Settings and tap Delete Account. This permanently removes your profile, library, and all data and cannot be undone.",
      },
    ],
  },
];

function BadgeFilmsAnswer() {
  return (
    <p style={{ margin: 0, color: MUTED, fontSize: 16, lineHeight: 1.65, fontFamily: "'Barlow Condensed', sans-serif" }}>
      That's part of the fun — Max Left doesn't reveal the full list. Use the context clues on the{" "}
      <a
        href={GAMES_HUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: AMBER, textDecoration: "underline", textDecorationColor: "rgba(239,159,39,0.4)" }}
      >
        Badge Overview page
      </a>{" "}
      to figure out what belongs.
    </p>
  );
}

function FAQItem({ q, a, customKey }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        borderBottom: `1px solid ${BORDER}`,
        cursor: "pointer",
      }}
      onClick={() => setOpen(o => !o)}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 0",
          gap: 12,
        }}
      >
        <span
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 15,
            fontWeight: 600,
            color: TEXT,
            lineHeight: 1.3,
          }}
        >
          {q}
        </span>
        <span
          style={{
            color: AMBER,
            fontSize: 18,
            flexShrink: 0,
            transition: "transform 0.18s ease",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
            fontWeight: 300,
            lineHeight: 1,
          }}
        >
          +
        </span>
      </div>

      {open && (
        <div style={{ paddingBottom: 14 }}>
          {customKey === "badge_films" ? (
            <BadgeFilmsAnswer />
          ) : (
            <p
              style={{
                margin: 0,
                color: MUTED,
                fontSize: 16,
                lineHeight: 1.65,
                fontFamily: "'Barlow Condensed', sans-serif",
              }}
            >
              {a}
            </p>
          )}
        </div>
      )}
    </div>
  );
}



export default function FAQScreen() {
  return (
    <div
      style={{
        background: BG,
        minHeight: "100vh",
        color: TEXT,
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: `1px solid ${BORDER}`,
          padding: "24px 20px 20px",
          position: "sticky",
          top: 0,
          background: BG,
          zIndex: 10,
        }}
      >
        <a href="https://maxleft.app" style={{ textDecoration: "none" }}>
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 26,
              color: AMBER,
              letterSpacing: "0.06em",
              lineHeight: 1,
            }}
          >
            M▶NTL
          </div>
        </a>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 80px" }}>
        {/* Title */}
        <div style={{ marginBottom: 40 }}>
          <h1
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 42,
              color: TEXT,
              margin: "0 0 8px",
              letterSpacing: "0.04em",
            }}
          >
            Help & FAQ
          </h1>
          <p
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 16,
              color: MUTED,
              margin: "0 0 8px",
            }}
          >
            Can't find what you're looking for?{" "}
            <a href="mailto:hello@maxleft.app" style={{ color: AMBER, textDecoration: "none" }}>
              hello@maxleft.app
            </a>
          </p>
        </div>

        {/* FAQ Sections */}
        {sections.map((section) => (
          <div key={section.title} style={{ marginBottom: 36 }}>
            <div
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                color: AMBER,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              {section.title}
            </div>
            <div
              style={{
                background: CARD,
                borderRadius: 12,
                border: `1px solid ${BORDER}`,
                padding: "0 16px",
              }}
            >
              {section.items.map((item, i) => (
                <FAQItem key={i} {...item} />
              ))}
            </div>
          </div>
        ))}

        {/* Contact Section */}
        <div style={{ marginBottom: 36 }}>
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11,
              fontWeight: 700,
              color: AMBER,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Contact
          </div>
          <div
            style={{
              background: CARD,
              borderRadius: 12,
              border: `1px solid ${BORDER}`,
              padding: "16px",
            }}
          >
            <p
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 16,
                color: MUTED,
                lineHeight: 1.6,
                margin: "0 0 14px",
              }}
            >
              We're a small team and read every message.
            </p>
            <a
              href="mailto:hello@maxleft.app"
              style={{
                display: "inline-block",
                background: AMBER,
                color: BG,
                borderRadius: 8,
                padding: "10px 18px",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
                letterSpacing: "0.04em",
              }}
            >
              hello@maxleft.app
            </a>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12,
            color: FAINT,
            paddingTop: 8,
          }}
        >
          © {new Date().getFullYear()} maxleft.app
        </div>
      </div>
    </div>
  );
}
