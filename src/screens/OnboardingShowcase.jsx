import { useState } from "react";

/*
 * ═══════════════════════════════════════════════════════════
 *  ONBOARDING SHOWCASE — "Here's What You Unlock"
 *  
 *  DROP-IN READY. Dark theme. All cover URLs from DB.
 *  No runtime API fetching. No emoji placeholders.
 *
 *  Sits between Shelf Picker and the first import step.
 *  Three user-controlled tabs: Movies, Books, Games.
 * ═══════════════════════════════════════════════════════════
 */

// ── Real poster/cover URLs from DB ─────────────────────────
const COVERS = {
  // Movies (from movies table, poster_url)
  alien:         "https://image.tmdb.org/t/p/w342/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg",
  halloween:     "https://image.tmdb.org/t/p/w342/wijlZ3HaYMvlDTPqJoTCWKFkCPU.jpg",
  nightmareElm:  "https://image.tmdb.org/t/p/w342/wGTpGGRMZmyFCcrY2YoxVTIBlli.jpg",
  fridayThe13th: "https://image.tmdb.org/t/p/w342/uGGpnWHOmWTARVN9wbC1nPxNgps.jpg",
  scream:        "https://image.tmdb.org/t/p/w342/lr9ZIrmuwVmZhpZuTCW8D9g0ZJe.jpg",
  fightClub:     "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
  pulpFiction:   "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
  raiders:       "https://image.tmdb.org/t/p/w342/ceG9VzoRAVGwivFU403Wc3AHRys.jpg",
  casablanca:    "https://image.tmdb.org/t/p/w342/lGCEKlJo2CnWydQj7aamY7s1S7Q.jpg",
  noCountry:     "https://image.tmdb.org/t/p/w342/6d5XOczc226jECq0LIX0siKtgHR.jpg",
  fullMetal:     "https://image.tmdb.org/t/p/w342/kMKyx1k8hWWscYFnPbnxxN4Eqo4.jpg",

  // Books (from books table, cover_url)
  hobbit:        "https://books.google.com/books/content?id=U799AY3yfqcC&printsec=frontcover&img=1&zoom=1&source=gbs_api",
  bloodSweat:    "http://books.google.com/books/content?id=dfW4zgEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
  rebecca:       "http://books.google.com/books/content?id=IAVT6awraTAC&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
  empireFalls:   "http://books.google.com/books/content?id=x6eU4gwtnOEC&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
  stillness:     "http://books.google.com/books/content?id=qcfueLfqxR8C&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",

  // Games (from games table, cover_url)
  residentEvil2: "https://media.rawg.io/media/games/053/053fc543bf488349610f1ae2d0c1b51b.jpg",
  stray:         "https://media.rawg.io/media/games/cd3/cd3c9c7d3e95cb1608fd6250f1b90b7a.jpg",
  daysGone:      "https://cdn.akamai.steamstatic.com/steam/apps/1259420/library_600x900_2x.jpg",
  mother3:       "https://media.rawg.io/media/games/ab7/ab7f986a92bb56a7574ad8ad3d607227.jpg",
};

// ── Dark theme palette ─────────────────────────────────────
const dark = {
  bg:        "#0f0f1a",
  card:      "#1a1a2e",
  cardHover: "#222240",
  border:    "rgba(255,255,255,0.08)",
  text:      "#f0f0f5",
  textDim:   "#7a7a9a",
  textMuted: "#55557a",
  terracotta:"#c97849",
  gold:      "#d4a017",
  green:     "#4ade80",
  orange:    "#ff6a00",
  purple:    "#a78bfa",
  blue:      "#4ea8de",
  indigo:    "#6366f1",
  red:       "#e94560",
};

// ── Shared fonts ───────────────────────────────────────────
const fonts = {
  heading: "'Barlow Condensed', sans-serif",
  body: "'Lora', serif",
  mono: "'IBM Plex Mono', monospace",
};

// ── Cover image with fallback ──────────────────────────────
function Cover({ src, alt, style }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <div style={{
        ...style,
        background: `linear-gradient(145deg, ${dark.card} 0%, #333 100%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, color: dark.textMuted,
        fontFamily: fonts.mono, letterSpacing: "0.02em",
        textAlign: "center", padding: 3,
      }}>
        {alt?.slice(0, 14)}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      style={{ ...style, objectFit: "cover" }}
      loading="eager"
    />
  );
}

// ── Badge progress chip (inline on feed cards) ─────────────
function BadgeChip({ icon, name, progress, total, color }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: `${color}15`,
      border: `1px solid ${color}33`,
      borderRadius: 6, padding: "3px 8px",
      marginTop: 4,
    }}>
      <span style={{ fontSize: 11 }}>{icon}</span>
      <span style={{
        fontFamily: fonts.mono, fontSize: 9, fontWeight: 700,
        color, letterSpacing: "0.02em",
      }}>
        {progress}/{total}
      </span>
      <span style={{
        fontFamily: fonts.mono, fontSize: 8,
        color: dark.textDim, letterSpacing: "0.02em",
      }}>
        {name}
      </span>
    </div>
  );
}

// ── Standalone badge pill (books) ──────────────────────────
function BadgePill({ name, icon, color, progress, total }) {
  const pct = Math.round((progress / total) * 100);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 12px",
      background: dark.card,
      border: `1px solid ${dark.border}`,
      borderRadius: 10,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: fonts.heading, fontWeight: 700, fontSize: 12,
          textTransform: "uppercase", letterSpacing: "0.02em",
          color: dark.text, marginBottom: 4,
        }}>
          {name}
        </div>
        <div style={{
          width: "100%", height: 4,
          background: "rgba(255,255,255,0.08)",
          borderRadius: 2, overflow: "hidden",
        }}>
          <div style={{
            width: `${pct}%`, height: "100%",
            background: color, borderRadius: 2,
          }} />
        </div>
      </div>
      <div style={{
        fontFamily: fonts.mono, fontSize: 10, fontWeight: 700,
        color, flexShrink: 0, letterSpacing: "0.02em",
      }}>
        {progress}/{total}
      </div>
    </div>
  );
}

// ── Film feed card ─────────────────────────────────────────
function FilmCard({ poster, title, year, rating, timeAgo, badge }) {
  return (
    <div style={{
      display: "flex", gap: 10, alignItems: "flex-start",
      padding: "8px 10px",
      background: dark.card,
      border: `1px solid ${dark.border}`,
      borderRadius: 10,
    }}>
      <div style={{ flexShrink: 0 }}>
        <Cover
          src={poster}
          alt={title}
          style={{ width: 48, height: 72, borderRadius: 6 }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1.5,
          textTransform: "uppercase", color: dark.textMuted,
          marginBottom: 1,
        }}>
          You watched
        </div>
        <div style={{
          fontFamily: fonts.heading, fontWeight: 700, fontSize: 14,
          color: dark.text,
          textTransform: "uppercase", letterSpacing: "0.02em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {title}
        </div>
        <div style={{
          fontFamily: fonts.body, fontSize: 11,
          color: dark.textDim, fontStyle: "italic",
        }}>
          {year}
          {rating && (
            <span style={{ marginLeft: 6, color: dark.gold, fontStyle: "normal" }}>
              {"★".repeat(rating)}{"☆".repeat(5 - rating)}
            </span>
          )}
          <span style={{
            marginLeft: 8, fontFamily: fonts.mono, fontSize: 9,
            fontStyle: "normal",
          }}>
            {timeAgo}
          </span>
        </div>
        {badge && (
          <BadgeChip
            icon={badge.icon}
            name={badge.name}
            progress={badge.progress}
            total={badge.total}
            color={badge.color}
          />
        )}
      </div>
    </div>
  );
}

// ── Book feed card ─────────────────────────────────────────
function BookCard({ cover, title, author, rating, timeAgo }) {
  return (
    <div style={{
      display: "flex", gap: 10, alignItems: "flex-start",
      padding: "8px 10px",
      background: dark.card,
      border: `1px solid ${dark.border}`,
      borderRadius: 10,
    }}>
      <Cover
        src={cover}
        alt={title}
        style={{ width: 48, height: 72, borderRadius: 4, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1.5,
          textTransform: "uppercase", color: dark.textMuted,
          marginBottom: 1,
        }}>
          You read
        </div>
        <div style={{
          fontFamily: fonts.heading, fontWeight: 700, fontSize: 14,
          color: dark.text, textTransform: "uppercase",
          letterSpacing: "0.02em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {title}
        </div>
        <div style={{
          fontFamily: fonts.body, fontSize: 11, fontStyle: "italic",
          color: dark.textDim,
        }}>
          {author}
          {rating && (
            <span style={{ marginLeft: 6, color: dark.gold, fontStyle: "normal" }}>
              {"★".repeat(rating)}{"☆".repeat(5 - rating)}
            </span>
          )}
          <span style={{
            marginLeft: 8, fontFamily: fonts.mono, fontSize: 9, fontStyle: "normal",
          }}>
            {timeAgo}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Game feed card ─────────────────────────────────────────
function GameCard({ cover, title, year, hours, rating }) {
  return (
    <div style={{
      display: "flex", gap: 10, alignItems: "flex-start",
      padding: "8px 10px",
      background: dark.card,
      border: `1px solid ${dark.border}`,
      borderRadius: 10,
    }}>
      <Cover
        src={cover}
        alt={title}
        style={{ width: 54, height: 54, borderRadius: 8, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1.5,
          textTransform: "uppercase", color: dark.textMuted,
          marginBottom: 1,
        }}>
          You played
        </div>
        <div style={{
          fontFamily: fonts.heading, fontWeight: 700, fontSize: 14,
          color: dark.text, textTransform: "uppercase",
          letterSpacing: "0.02em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {title}
        </div>
        <div style={{
          fontFamily: fonts.body, fontSize: 11, fontStyle: "italic",
          color: dark.textDim,
        }}>
          {year && <>{year} · </>}
          {hours && <>{hours} hours · </>}
          {rating && (
            <span style={{ color: dark.indigo, fontStyle: "normal" }}>
              {"★".repeat(rating)}{"☆".repeat(5 - rating)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab button ─────────────────────────────────────────────
function TabButton({ label, emoji, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: "10px 6px",
        background: active ? dark.terracotta : dark.card,
        border: `2px solid ${active ? dark.terracotta : dark.border}`,
        borderRadius: 10, cursor: "pointer",
        transition: "all 0.15s",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      }}
    >
      <span style={{ fontSize: 20 }}>{emoji}</span>
      <span style={{
        fontFamily: fonts.heading, fontWeight: 700, fontSize: 11,
        textTransform: "uppercase", letterSpacing: "0.04em",
        color: active ? "#fff" : dark.textDim,
      }}>
        {label}
      </span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN SHOWCASE COMPONENT
// ═══════════════════════════════════════════════════════════
export default function OnboardingShowcase({ onContinue, onBack }) {
  const [activeTab, setActiveTab] = useState("movies");

  // ── MOVIES ───────────────────────────────────────────────
  const MoviesSlide = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Letterboxd sync toast */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 2,
      }}>
        <div style={{
          background: "rgba(0,224,84,0.10)",
          border: "1px solid rgba(0,224,84,0.25)",
          borderRadius: 8, padding: "5px 12px",
          fontFamily: fonts.mono, fontSize: 10,
          color: dark.green, letterSpacing: "0.02em",
          display: "flex", alignItems: "center", gap: 5,
        }}>
          🎬 Synced 47 films from Letterboxd
        </div>
      </div>

      <FilmCard
        poster={COVERS.alien}
        title="Alien"
        year="1979"
        rating={5}
        timeAgo="2h ago"
        badge={{
          icon: "👾", color: dark.green,
          name: "Weyland-Yutani Employee",
          progress: 3, total: 4,
        }}
      />
      <FilmCard
        poster={COVERS.halloween}
        title="Halloween"
        year="1978"
        rating={5}
        timeAgo="1d ago"
        badge={{
          icon: "🎃", color: dark.orange,
          name: "Haddonfield Historian",
          progress: 8, total: 13,
        }}
      />
      <FilmCard
        poster={COVERS.nightmareElm}
        title="A Nightmare on Elm Street"
        year="1984"
        rating={4}
        timeAgo="3d ago"
        badge={{
          icon: "🗡️", color: dark.purple,
          name: "Dream Warrior",
          progress: 1, total: 7,
        }}
      />

      {/* Poster shelf strip */}
      <div style={{
        display: "flex", gap: 6, overflow: "hidden",
        padding: "8px 0 2px", justifyContent: "center",
      }}>
        {[
          { src: COVERS.fridayThe13th, alt: "Friday the 13th" },
          { src: COVERS.scream,        alt: "Scream" },
          { src: COVERS.fightClub,     alt: "Fight Club" },
          { src: COVERS.pulpFiction,   alt: "Pulp Fiction" },
          { src: COVERS.raiders,       alt: "Raiders of the Lost Ark" },
          { src: COVERS.noCountry,     alt: "No Country for Old Men" },
        ].map((film, i) => (
          <Cover
            key={i}
            src={film.src}
            alt={film.alt}
            style={{
              width: 44, height: 66, borderRadius: 5, flexShrink: 0,
              opacity: i < 4 ? 1 : 0.5,
              border: i < 2
                ? `2px solid ${dark.terracotta}`
                : `1px solid ${dark.border}`,
            }}
          />
        ))}
      </div>

      <div style={{
        fontFamily: fonts.mono, fontSize: 9,
        color: dark.textMuted, textAlign: "center",
        letterSpacing: "0.04em",
      }}>
        Your shelf fills up from day one
      </div>
    </div>
  );

  // ── BOOKS ────────────────────────────────────────────────
  const BooksSlide = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 2,
      }}>
        <div style={{
          background: "rgba(168,130,80,0.10)",
          border: "1px solid rgba(168,130,80,0.25)",
          borderRadius: 8, padding: "5px 12px",
          fontFamily: fonts.mono, fontSize: 10,
          color: "#c9a256", letterSpacing: "0.02em",
          display: "flex", alignItems: "center", gap: 5,
        }}>
          📚 Imported 83 books from Goodreads
        </div>
      </div>

      <BookCard
        cover={COVERS.hobbit}
        title="The Hobbit"
        author="J. R. R. Tolkien"
        rating={5}
        timeAgo="1w ago"
      />
      <BookCard
        cover={COVERS.rebecca}
        title="Rebecca"
        author="Daphne du Maurier"
        rating={5}
        timeAgo="2w ago"
      />
      <BookCard
        cover={COVERS.bloodSweat}
        title="Blood, Sweat & Chrome"
        author="Kyle Buchanan"
        rating={5}
        timeAgo="1mo ago"
      />

      {/* Book shelf strip */}
      <div style={{
        display: "flex", gap: 6, overflow: "hidden",
        padding: "8px 0 2px", justifyContent: "center",
      }}>
        {[
          { src: COVERS.empireFalls, alt: "Empire Falls" },
          { src: COVERS.stillness,   alt: "Stillness Speaks" },
          { src: COVERS.hobbit,      alt: "The Hobbit" },
          { src: COVERS.rebecca,     alt: "Rebecca" },
        ].map((book, i) => (
          <Cover
            key={i}
            src={book.src}
            alt={book.alt}
            style={{
              width: 44, height: 66, borderRadius: 4, flexShrink: 0,
              opacity: i < 2 ? 1 : 0.5,
              border: i < 1
                ? `2px solid ${dark.terracotta}`
                : `1px solid ${dark.border}`,
            }}
          />
        ))}
      </div>

      <div style={{
        fontFamily: fonts.mono, fontSize: 9,
        color: dark.textMuted, textAlign: "center",
        letterSpacing: "0.04em",
      }}>
        Your reading history — organized and tracked
      </div>
    </div>
  );

  // ── GAMES ────────────────────────────────────────────────
  const GamesSlide = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 2,
      }}>
        <div style={{
          background: "rgba(99,102,241,0.10)",
          border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: 8, padding: "5px 12px",
          fontFamily: fonts.mono, fontSize: 10,
          color: dark.indigo, letterSpacing: "0.02em",
          display: "flex", alignItems: "center", gap: 5,
        }}>
          🎮 Connected Steam · 124 games synced
        </div>
      </div>

      <GameCard
        cover={COVERS.residentEvil2}
        title="Resident Evil 2"
        year={2019}
        hours={28}
        rating={5}
      />
      <GameCard
        cover={COVERS.stray}
        title="Stray"
        year={2022}
        hours={12}
        rating={4}
      />
      <GameCard
        cover={COVERS.daysGone}
        title="Days Gone"
        hours={45}
        rating={4}
      />

      {/* Game community tracker */}
      <div style={{
        padding: "10px 12px",
        background: dark.card,
        border: `1px solid ${dark.border}`,
        borderRadius: 10,
      }}>
        <div style={{
          fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1.5,
          textTransform: "uppercase", color: dark.textMuted,
          marginBottom: 8,
        }}>
          Get Played · We Play You Play
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            COVERS.residentEvil2, COVERS.stray, COVERS.daysGone,
            COVERS.mother3, null, null, null, null,
          ].map((src, n) => (
            <div key={n} style={{
              flex: 1, height: 32, borderRadius: 4, overflow: "hidden",
              background: src ? "transparent" : "rgba(255,255,255,0.05)",
              opacity: src ? 1 : 0.3,
            }}>
              {src && (
                <Cover
                  src={src}
                  alt=""
                  style={{ width: "100%", height: "100%", borderRadius: 4 }}
                />
              )}
            </div>
          ))}
        </div>
        <div style={{
          fontFamily: fonts.mono, fontSize: 9,
          color: dark.terracotta, textAlign: "right",
          marginTop: 4, fontWeight: 700,
        }}>
          4/8 played
        </div>
      </div>

      <div style={{
        fontFamily: fonts.mono, fontSize: 9,
        color: dark.textMuted, textAlign: "center",
        letterSpacing: "0.04em",
      }}>
        Track your backlog alongside podcast hosts
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="setup-screen" style={{
      paddingTop: 16,
      background: dark.bg,
      minHeight: "100vh",
    }}>
      <style>{`
        @keyframes showcaseFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Eyebrow */}
      <div style={{
        fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2,
        textTransform: "uppercase", color: dark.terracotta,
        textAlign: "center", marginBottom: 6,
      }}>
        From the podcast to your shelf
      </div>

      {/* Heading */}
      <div style={{
        fontFamily: fonts.heading, fontWeight: 700, fontSize: 26,
        textTransform: "uppercase", textAlign: "center",
        color: dark.text, lineHeight: 1.15,
        letterSpacing: "0.02em", marginBottom: 4,
      }}>
        Your History,<br />Your Head Start
      </div>

      {/* Subheading */}
      <div style={{
        fontFamily: fonts.body, fontSize: 13, fontStyle: "italic",
        color: dark.textDim, textAlign: "center",
        lineHeight: 1.5, marginBottom: 20, maxWidth: 300,
        marginLeft: "auto", marginRight: "auto",
      }}>
        Import what you've already watched, read, and played.
        Badges unlock. Shelves fill. Progress starts on day one.
      </div>

      {/* Tab selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <TabButton label="Films" emoji="🎬" active={activeTab === "movies"} onClick={() => setActiveTab("movies")} />
        <TabButton label="Books" emoji="📚" active={activeTab === "books"} onClick={() => setActiveTab("books")} />
        <TabButton label="Games" emoji="🎮" active={activeTab === "games"} onClick={() => setActiveTab("games")} />
      </div>

      {/* Slide content */}
      <div key={activeTab} style={{ animation: "showcaseFadeIn 0.3s ease both" }}>
        {activeTab === "movies" && <MoviesSlide />}
        {activeTab === "books" && <BooksSlide />}
        {activeTab === "games" && <GamesSlide />}
      </div>

      <div className="setup-spacer" />

      {/* Closing line */}
      <div style={{
        fontFamily: fonts.body, fontSize: 12, fontStyle: "italic",
        color: dark.textMuted, textAlign: "center",
        marginBottom: 14, lineHeight: 1.5,
      }}>
        The best recommendations come from reviews,<br />not algorithms.
      </div>

      {/* CTA */}
      <div style={{ display: "flex", gap: 10 }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              flex: "0 0 auto", padding: "14px 20px",
              background: dark.card,
              border: `2px solid ${dark.border}`,
              borderRadius: 12, color: dark.textDim,
              fontFamily: fonts.heading, fontWeight: 700, fontSize: 15,
              cursor: "pointer", letterSpacing: "0.02em",
            }}
          >
            ←
          </button>
        )}
        <button
          onClick={onContinue}
          style={{
            flex: 1, padding: "14px 20px",
            background: dark.terracotta,
            border: "none",
            borderRadius: 12, color: "#fff",
            fontFamily: fonts.heading, fontWeight: 700, fontSize: 16,
            textTransform: "uppercase", letterSpacing: "0.04em",
            cursor: "pointer",
          }}
        >
          Let's Set It Up →
        </button>
      </div>
    </div>
  );
}
