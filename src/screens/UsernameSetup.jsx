import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import { parseFile, importMovies, importBooks } from "../utils/importUtils";
import OnboardingShowcase from "./OnboardingShowcase";

// ═══════════════════════════════════════════════════════════
//  DARK THEME PALETTE
// ═══════════════════════════════════════════════════════════
const dk = {
  bg:         "#0f0f1a",
  card:       "#1a1a2e",
  cardActive: "#252542",
  border:     "rgba(255,255,255,0.08)",
  text:       "#f0f0f5",
  textDim:    "#7a7a9a",
  textMuted:  "#55557a",
  terracotta: "#c97849",
  sage:       "#7a9a6a",
  red:        "#c0392b",
  accent:     "rgba(201,120,73,0.10)",
};

// Injected once at the top of setup-screen to override class-based styles
const DARK_STYLES = `
  .setup-screen {
    background: ${dk.bg} !important;
    color: ${dk.text} !important;
    min-height: 100vh;
  }
  .setup-title {
    color: ${dk.text} !important;
  }
  .setup-sub {
    color: ${dk.textDim} !important;
  }
  .field-label {
    color: ${dk.textDim} !important;
  }
  .field-input {
    background: ${dk.card} !important;
    color: ${dk.text} !important;
    border-color: ${dk.border} !important;
  }
  .field-input::placeholder {
    color: ${dk.textMuted} !important;
  }
  .field-input:focus {
    border-color: ${dk.terracotta} !important;
  }
  .field-error {
    color: ${dk.red} !important;
  }
  .field-hint {
    color: ${dk.textMuted} !important;
  }
  .btn-primary {
    background: ${dk.terracotta} !important;
    color: #fff !important;
    border: none !important;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

// ═══════════════════════════════════════════════════════════
//  STEP INDICATOR
// ═══════════════════════════════════════════════════════════
function StepDots({ total, current }) {
  if (total <= 1) return null;
  return (
    <div style={{
      display: "flex", justifyContent: "center", gap: 6,
      marginBottom: 24,
    }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i === current ? 18 : 6, height: 6, borderRadius: 3,
          background: i === current ? dk.terracotta : i < current ? dk.terracotta : dk.border,
          opacity: i < current ? 0.4 : 1,
          transition: "all 0.3s ease",
        }} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  SKIP BUTTON
// ═══════════════════════════════════════════════════════════
function SkipButton({ onClick, label = "I'll do this later" }) {
  return (
    <div
      onClick={onClick}
      style={{
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
        color: dk.textMuted, textAlign: "center",
        marginTop: 12, cursor: "pointer", letterSpacing: "0.02em",
        padding: "8px 0",
      }}
    >
      {label}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  BACK BUTTON
// ═══════════════════════════════════════════════════════════
function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: "0 0 auto",
        padding: "14px 20px",
        background: dk.card,
        border: `2px solid ${dk.border}`,
        borderRadius: 12,
        color: dk.textDim,
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 700, fontSize: 15,
        cursor: "pointer",
        letterSpacing: "0.02em",
      }}
    >
      ←
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
//  FILE UPLOAD ZONE
// ═══════════════════════════════════════════════════════════
function FileUploadZone({ file, onFileSelect, fileInputRef, label = "Tap to upload CSV" }) {
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelect(f);
        }}
      />
      <div
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${file ? dk.terracotta : dk.border}`,
          borderRadius: 12, padding: "16px 14px",
          textAlign: "center", cursor: "pointer",
          background: file ? "rgba(201,120,73,0.12)" : "transparent",
          transition: "all 0.15s",
        }}
      >
        {file ? (
          <>
            <div style={{ fontSize: 20, marginBottom: 4, color: dk.terracotta }}>✓</div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13,
              color: dk.terracotta, textTransform: "uppercase",
            }}>{file.name}</div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
              color: dk.textMuted, marginTop: 3,
            }}>Tap to change file</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 20, marginBottom: 4 }}>📄</div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13,
              color: dk.text, textTransform: "uppercase",
            }}>{label}</div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
              color: dk.textMuted, marginTop: 3,
            }}>.csv files only</div>
          </>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
//  TASK ROW — processing phase status line
// ═══════════════════════════════════════════════════════════
function TaskRow({ task }) {
  const statusColor = {
    pending: dk.textMuted,
    running: dk.terracotta,
    done: dk.sage,
    error: dk.red,
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 0",
      opacity: task.status === "pending" ? 0.5 : 1,
      transition: "opacity 0.3s ease",
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%",
        border: `2px solid ${statusColor[task.status]}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, flexShrink: 0,
        background: task.status === "done" ? statusColor.done : "transparent",
        color: task.status === "done" ? "#fff" : statusColor[task.status],
        transition: "all 0.3s ease",
      }}>
        {task.status === "running" ? (
          <div style={{
            width: 10, height: 10, border: `2px solid ${dk.terracotta}`,
            borderTopColor: "transparent", borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
        ) : task.status === "done" ? "✓" : task.status === "error" ? "✕" : "○"}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14,
          textTransform: "uppercase", letterSpacing: "0.02em",
          color: task.status === "pending" ? dk.textMuted : dk.text,
        }}>
          {task.label}
        </div>

        {task.status === "running" && task.total > 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{
              width: "100%", background: dk.border, borderRadius: 3, height: 4, overflow: "hidden",
            }}>
              <div style={{
                height: "100%", background: dk.terracotta, borderRadius: 3,
                width: `${(task.progress / task.total) * 100}%`,
                transition: "width 0.3s ease",
              }} />
            </div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
              color: dk.textMuted, marginTop: 3,
            }}>
              {task.progress} / {task.total}
            </div>
          </div>
        )}

        {task.status === "done" && task.result && (
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
            color: dk.textDim, marginTop: 2,
          }}>
            {task.result}
          </div>
        )}

        {task.status === "error" && task.result && (
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
            color: dk.red, marginTop: 2,
          }}>
            {task.result}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
function UsernameSetup({ name, session, onComplete }) {
  // ── Core flow ────────────────────────────────────────────
  const [phase, setPhase] = useState("username"); // username | shelves | letterboxd | books | games | communities | processing
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const [selectedShelves, setSelectedShelves] = useState({
    books: true, movies: true, shows: true, games: true, communities: true,
  });

  // ── Letterboxd (single screen) ───────────────────────────
  const [letterboxdUsername, setLetterboxdUsername] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);

  // ── Books (single screen) ────────────────────────────────
  const [bookPlatform, setBookPlatform] = useState(null); // goodreads | storygraph
  const [bookUploadedFile, setBookUploadedFile] = useState(null);
  const bookFileInputRef = useRef(null);

  // ── Games (single screen) ────────────────────────────────
  const [steamId, setSteamId] = useState("");

  // ── Community picker ─────────────────────────────────────
  const [communities, setCommunities] = useState([]);
  const [selectedCommunities, setSelectedCommunities] = useState({});
  const [loadingCommunities, setLoadingCommunities] = useState(false);

  // ── Processing phase ─────────────────────────────────────
  const [processingTasks, setProcessingTasks] = useState([]);
  const [processingDone, setProcessingDone] = useState(false);
  const [savedCommunityIds, setSavedCommunityIds] = useState([]);

  // Load communities
  const isDev = new URLSearchParams(window.location.search).has("dev");
  const LIVE_SLUGS = new Set(["blankcheck", "nowplaying"]);

  useEffect(() => {
    if (phase !== "communities") return;
    let cancelled = false;
    (async () => {
      setLoadingCommunities(true);
      const { data, error } = await supabase
        .from("community_pages")
        .select("id, name, slug, description, theme_config")
        .order("sort_order", { ascending: true });

      if (!cancelled && !error && data) {
        const live = isDev ? data : data.filter(c => LIVE_SLUGS.has(c.slug));
        setCommunities(live);
        const defaults = {};
        live.forEach(c => { defaults[c.id] = true; });
        setSelectedCommunities(defaults);
      }
      if (!cancelled) setLoadingCommunities(false);
    })();
    return () => { cancelled = true; };
  }, [phase]);

  // ── Step dots ────────────────────────────────────────────
  const allSteps = (() => {
    const steps = ["username", "shelves", "showcase"];
    if (selectedShelves.movies) steps.push("letterboxd");
    if (selectedShelves.books) steps.push("books");
    if (selectedShelves.games) steps.push("games");
    if (selectedShelves.communities) steps.push("communities");
    return steps;
  })();

  const currentStepIndex = allSteps.indexOf(phase);

  // ── Navigation ───────────────────────────────────────────
  const nextPhaseAfter = (current) => {
    const idx = allSteps.indexOf(current);
    return idx < allSteps.length - 1 ? allSteps[idx + 1] : null;
  };

  const prevPhaseBefore = (current) => {
    const idx = allSteps.indexOf(current);
    return idx > 0 ? allSteps[idx - 1] : null;
  };

  const advanceFrom = (current) => {
    const next = nextPhaseAfter(current);
    if (next) {
      setPhase(next);
    } else {
      beginProcessing([]);
    }
  };

  // ── Processing ───────────────────────────────────────────
  const beginProcessing = (communityIds) => {
    setSavedCommunityIds(communityIds);
    const tasks = [];

    if (letterboxdUsername) {
      tasks.push({
        id: "letterboxd-rss",
        label: "Connecting Letterboxd RSS",
        status: "pending",
        progress: 0, total: 0, result: null,
      });
    }

    if (uploadedFile) {
      tasks.push({
        id: "letterboxd-csv",
        label: "Importing film history",
        status: "pending",
        progress: 0, total: 0, result: null,
      });
    }

    if (bookUploadedFile) {
      const platformName = bookPlatform === "storygraph" ? "StoryGraph" : "Goodreads";
      tasks.push({
        id: "book-csv",
        label: `Importing from ${platformName}`,
        status: "pending",
        progress: 0, total: 0, result: null,
      });
    }

    if (steamId) {
      tasks.push({
        id: "steam",
        label: "Connecting Steam",
        status: "pending",
        progress: 0, total: 0, result: null,
      });
    }

    if (tasks.length === 0) {
      const { communities: _, ...shelvesToSave } = selectedShelves;
      onComplete(username, shelvesToSave, communityIds);
      return;
    }

    setProcessingTasks(tasks);
    setPhase("processing");
  };

  // Run processing tasks
  useEffect(() => {
    if (phase !== "processing" || processingDone) return;
    if (processingTasks.length === 0) return;

    let cancelled = false;

    const updateTask = (taskId, updates) => {
      setProcessingTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      ));
    };

    const runTasks = async () => {
      const userId = session.user.id;

      for (const task of processingTasks) {
        if (cancelled) break;
        updateTask(task.id, { status: "running" });

        try {
          if (task.id === "letterboxd-rss") {
            const { error } = await supabase
              .from("profiles")
              .update({ letterboxd_username: letterboxdUsername })
              .eq("id", userId);

            if (error) throw error;
            updateTask(task.id, { status: "done", result: `@${letterboxdUsername} linked` });
          }

          else if (task.id === "letterboxd-csv") {
            const { error: parseError, items } = await parseFile(uploadedFile, userId);
            if (parseError) throw new Error(parseError);
            if (items.length === 0) {
              updateTask(task.id, { status: "done", result: "No new films to import" });
              continue;
            }

            updateTask(task.id, { total: items.length });

            const result = await importMovies(items, userId, (progress, total) => {
              if (!cancelled) updateTask(task.id, { progress, total });
            });

            updateTask(task.id, {
              status: "done",
              result: `${result.count} film${result.count !== 1 ? "s" : ""} imported${result.errs > 0 ? `, ${result.errs} skipped` : ""}`,
            });
          }

          else if (task.id === "book-csv") {
            const { error: parseError, items } = await parseFile(bookUploadedFile, userId);
            if (parseError) throw new Error(parseError);
            if (items.length === 0) {
              updateTask(task.id, { status: "done", result: "No new books to import" });
              continue;
            }

            updateTask(task.id, { total: items.length });

            const result = await importBooks(items, userId, (progress, total) => {
              if (!cancelled) updateTask(task.id, { progress, total });
            });

            updateTask(task.id, {
              status: "done",
              result: `${result.count} book${result.count !== 1 ? "s" : ""} imported${result.errs > 0 ? `, ${result.errs} skipped` : ""}`,
            });
          }

          else if (task.id === "steam") {
            const { error } = await supabase
              .from("profiles")
              .update({ steam_id: steamId })
              .eq("id", userId);

            if (error) throw error;
            updateTask(task.id, { status: "done", result: "Steam ID saved" });
          }
        } catch (err) {
          console.error(`[Onboarding] Task ${task.id} failed:`, err);
          updateTask(task.id, { status: "error", result: err.message || "Something went wrong" });
        }
      }

      if (!cancelled) setProcessingDone(true);
    };

    runTasks();
    return () => { cancelled = true; };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFinalComplete = () => {
    const { communities: _, ...shelvesToSave } = selectedShelves;
    onComplete(username, shelvesToSave, savedCommunityIds);
  };

  // ═════════════════════════════════════════════════════════
  //  STEP 1 — Username
  // ═════════════════════════════════════════════════════════
  const handleUsernameSubmit = async () => {
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (clean.length < 3) { setError("At least 3 characters"); return; }
    if (clean.length > 20) { setError("20 characters max"); return; }

    setChecking(true);
    setError("");

    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", clean)
      .maybeSingle();

    if (data) { setError("Already taken — try another"); setChecking(false); return; }

    // Save username + set name to username (so feed/profile aren't stuck on Google auth name)
    const userId = session?.user?.id;
    if (userId) {
      await supabase.from("profiles").update({ username: clean, name: clean }).eq("id", userId);
    }

    setChecking(false);
    setUsername(clean);
    setPhase("shelves");
  };

  if (phase === "username") {
    return (
      <div className="setup-screen">
        <style>{DARK_STYLES}</style>
        <StepDots total={allSteps.length} current={0} />
        <div className="setup-title">
          Welcome{name ? `, ${name.split(" ")[0]}` : ""}
        </div>
        <div className="setup-sub">
          Pick a username. This is your identity on Mantl.
        </div>

        <div>
          <label className="field-label">Username</label>
          <input
            className="field-input"
            type="text"
            placeholder="yourname"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleUsernameSubmit()}
            maxLength={20}
            autoFocus
          />
          {error && <div className="field-error">{error}</div>}
          {!error && <div className="field-hint">Letters, numbers, underscores only</div>}
        </div>

        <div className="setup-spacer" />

        <button
          className="btn-primary"
          onClick={handleUsernameSubmit}
          disabled={checking || username.length < 3}
          style={{ opacity: checking || username.length < 3 ? 0.4 : 1 }}
        >
          {checking ? "Checking..." : "Next →"}
        </button>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  //  STEP 2 — Shelf Picker
  // ═════════════════════════════════════════════════════════
  const shelfOptions = [
    { key: "movies", emoji: "🎬", label: "Films", desc: "Log movies you watch" },
    { key: "shows", emoji: "📺", label: "Shows", desc: "Follow series progress" },
    { key: "books", emoji: "📖", label: "Books", desc: "Track what you read" },
    { key: "games", emoji: "🎮", label: "Games", desc: "Track what you play" },
    { key: "communities", emoji: "🎙️", label: "Podcast\nCommunities", desc: "Track along with your favorite podcasts" },
  ];

  const toggleShelf = (key) => {
    setSelectedShelves(prev => {
      const next = { ...prev, [key]: !prev[key] };
      const contentKeys = ["books", "movies", "shows", "games", "communities"];
      if (contentKeys.every(k => !next[k])) return prev;
      return next;
    });
  };

  if (phase === "shelves") {
    return (
      <div className="setup-screen">
        <style>{DARK_STYLES}</style>
        <StepDots total={allSteps.length} current={1} />
        <div className="setup-title">Your Library</div>
        <div className="setup-sub">
          What do you want to track? Pick what interests you — you can always change this later in settings.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
          {shelfOptions.map(opt => {
            const on = selectedShelves[opt.key];
            const isCommunities = opt.key === "communities";
            return (
              <div key={opt.key} onClick={() => toggleShelf(opt.key)}
                style={{
                  background: on ? dk.cardActive : dk.card,
                  border: `2px solid ${on ? (isCommunities ? "#e94560" : dk.terracotta) : dk.border}`,
                  borderRadius: 14, padding: "16px 14px", cursor: "pointer",
                  transition: "all 0.15s", position: "relative",
                  ...(isCommunities ? { gridColumn: "1 / -1" } : {}),
                }}>
                {on && (
                  <div style={{
                    position: "absolute", top: 8, right: 10, fontSize: 12,
                    color: isCommunities ? "#e94560" : dk.terracotta,
                  }}>✓</div>
                )}
                <div style={{ fontSize: 28, marginBottom: 6 }}>{opt.emoji}</div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16,
                  textTransform: "uppercase", letterSpacing: "0.02em",
                  color: on ? "#fff" : dk.text,
                  whiteSpace: "pre-line",
                }}>{opt.label}</div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontStyle: "italic",
                  color: on ? "rgba(255,255,255,0.5)" : dk.textDim, marginTop: 2,
                }}>{opt.desc}</div>
              </div>
            );
          })}
        </div>

        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
          color: dk.textDim, textAlign: "center", marginBottom: 16, letterSpacing: "0.03em",
        }}>
          Tap to toggle · At least one required
        </div>

        <div className="setup-spacer" />

        <div style={{ display: "flex", gap: 10 }}>
          <BackButton onClick={() => setPhase("username")} />
          <button className="btn-primary" onClick={() => advanceFrom("shelves")} style={{ flex: 1 }}>
            Next →
          </button>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  //  STEP — Showcase ("Here's What You Unlock")
  // ═════════════════════════════════════════════════════════
  if (phase === "showcase") {
    return (
      <OnboardingShowcase
        onContinue={() => advanceFrom("showcase")}
        onBack={() => setPhase("shelves")}
      />
    );
  }

  // ═════════════════════════════════════════════════════════
  //  STEP 3 — Letterboxd (single screen)
  // ═════════════════════════════════════════════════════════
  if (phase === "letterboxd") {
    const rssUrl = letterboxdUsername ? `https://letterboxd.com/${letterboxdUsername}/rss/` : "";
    const hasAnything = letterboxdUsername || uploadedFile;

    return (
      <div className="setup-screen">
        <style>{DARK_STYLES}</style>
        <StepDots total={allSteps.length} current={allSteps.indexOf("letterboxd")} />
        <div style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>🎬</div>
        <div className="setup-title">Connect Letterboxd</div>
        <div className="setup-sub">
          Two ways to bring your watch history into Mantl. Do both for the best experience.
        </div>

        {/* 1. Username / RSS */}
        <div style={{
          marginBottom: 14, padding: 14,
          background: dk.accent,
          border: "1px solid " + dk.border,
          borderRadius: 12,
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13,
            textTransform: "uppercase", color: dk.text, marginBottom: 4,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 15 }}>📡</span> Live Sync
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: dk.textDim,
            lineHeight: 1.5, marginBottom: 10,
          }}>
            Enter your username to auto-sync new logs going forward. Every time you log a film on Letterboxd, it appears on Mantl.
          </div>
          <label className="field-label" style={{ marginBottom: 4 }}>Letterboxd Username</label>
          <input
            className="field-input"
            type="text"
            placeholder="e.g. ali"
            value={letterboxdUsername}
            onChange={(e) => setLetterboxdUsername(e.target.value.trim().toLowerCase())}
            autoFocus
          />
          {letterboxdUsername && (
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
              color: dk.textDim, marginTop: 6, letterSpacing: "0.02em",
              wordBreak: "break-all",
            }}>
              RSS: {rssUrl}
            </div>
          )}
        </div>

        {/* 2. CSV Export */}
        <div style={{
          marginBottom: 16, padding: 14,
          background: dk.accent,
          border: "1px solid " + dk.border,
          borderRadius: 12,
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13,
            textTransform: "uppercase", color: dk.text, marginBottom: 4,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 15 }}>📦</span> Import Full History
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: dk.textDim,
            lineHeight: 1.5, marginBottom: 10,
          }}>
            This brings in everything you've ever logged — ratings, dates, the works.
          </div>

          {/* How-to steps */}
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
            color: dk.text, lineHeight: 1.8, marginBottom: 12,
            padding: "10px 12px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.05)",
          }}>
            <div><span style={{ color: dk.terracotta }}>1.</span> Open your browser and go to:<br />
              <span
                onClick={() => {
                  navigator.clipboard.writeText("https://letterboxd.com/data/export/");
                  const el = document.getElementById("lb-copy-confirm");
                  if (el) { el.textContent = "Copied!"; setTimeout(() => { el.textContent = "tap to copy link"; }, 1500); }
                }}
                style={{ color: dk.terracotta, textDecoration: "underline", cursor: "pointer", wordBreak: "break-all" }}
              >letterboxd.com/data/export</span>{" "}
              <span id="lb-copy-confirm" style={{ fontSize: 9, color: dk.textDim }}>(tap to copy link)</span>
            </div>
            <div style={{ fontSize: 9, color: dk.textDim, marginLeft: 14, marginTop: -4 }}>
              ⚠️ Use your browser, not the Letterboxd app
            </div>
            <div><span style={{ color: dk.terracotta }}>2.</span> Click <strong>Export Your Data</strong></div>
            <div><span style={{ color: dk.terracotta }}>3.</span> Unzip the download</div>
            <div><span style={{ color: dk.terracotta }}>4.</span> Upload <strong>diary.csv</strong> below</div>
          </div>

          <FileUploadZone
            file={uploadedFile}
            onFileSelect={(f) => setUploadedFile(f)}
            fileInputRef={fileInputRef}
            label="Tap to upload diary.csv"
          />
        </div>

        <div className="setup-spacer" />

        <div style={{ display: "flex", gap: 10 }}>
          <BackButton onClick={() => setPhase("shelves")} />
          <button
            className="btn-primary"
            onClick={() => advanceFrom("letterboxd")}
            style={{ flex: 1 }}
          >
            Next →
          </button>
        </div>
        {!letterboxdUsername && !uploadedFile && (
          <SkipButton onClick={() => advanceFrom("letterboxd")} label="Skip — I don't use Letterboxd" />
        )}
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  //  STEP 4 — Books (single screen)
  // ═════════════════════════════════════════════════════════
  if (phase === "books") {
    return (
      <div className="setup-screen">
        <style>{DARK_STYLES}</style>
        <StepDots total={allSteps.length} current={allSteps.indexOf("books")} />
        <div style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>📚</div>
        <div className="setup-title">Import Your Library</div>
        <div className="setup-sub">
          Bring your reading history into Mantl from Goodreads or StoryGraph.
        </div>

        {/* Platform toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[
            { key: "goodreads", label: "Goodreads" },
            { key: "storygraph", label: "StoryGraph" },
          ].map(opt => (
            <div
              key={opt.key}
              onClick={() => setBookPlatform(opt.key)}
              style={{
                flex: 1, padding: "12px 10px", textAlign: "center",
                borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                background: bookPlatform === opt.key ? dk.cardActive : dk.card,
                border: `2px solid ${bookPlatform === opt.key ? dk.terracotta : dk.border}`,
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14,
                textTransform: "uppercase", letterSpacing: "0.02em",
                color: bookPlatform === opt.key ? "#fff" : dk.text,
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>

        {/* Instructions + upload (shown after platform pick) */}
        {bookPlatform && (
          <div style={{
            padding: 14,
            background: dk.accent,
            border: "1px solid " + dk.border,
            borderRadius: 12,
            marginBottom: 16,
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: dk.textDim,
              lineHeight: 1.5, marginBottom: 12,
            }}>
              {bookPlatform === "goodreads" ? (
                <>
                  Go to{" "}
                  <span
                    onClick={() => window.open("https://www.goodreads.com/review/import", "_blank")}
                    style={{ color: dk.terracotta, textDecoration: "underline", cursor: "pointer" }}
                  >
                    goodreads.com/review/import
                  </span>
                  , click <strong>"Export Library"</strong>, then upload the CSV below.
                </>
              ) : (
                <>
                  Go to{" "}
                  <span
                    onClick={() => window.open("https://app.thestorygraph.com/export", "_blank")}
                    style={{ color: dk.terracotta, textDecoration: "underline", cursor: "pointer" }}
                  >
                    app.thestorygraph.com/export
                  </span>
                  , click <strong>"Generate Export"</strong>, then upload the CSV below.
                </>
              )}
            </div>
            <FileUploadZone
              file={bookUploadedFile}
              onFileSelect={(f) => setBookUploadedFile(f)}
              fileInputRef={bookFileInputRef}
            />
          </div>
        )}

        <div className="setup-spacer" />

        <div style={{ display: "flex", gap: 10 }}>
          <BackButton onClick={() => setPhase(prevPhaseBefore("books") || "shelves")} />
          <button
            className="btn-primary"
            onClick={() => advanceFrom("books")}
            style={{ flex: 1 }}
          >
            Next →
          </button>
        </div>
        <SkipButton onClick={() => advanceFrom("books")} label="Skip — I'll import later" />
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  //  STEP 5 — Games (single screen)
  // ═════════════════════════════════════════════════════════
  if (phase === "games") {
    return (
      <div className="setup-screen">
        <style>{DARK_STYLES}</style>
        <StepDots total={allSteps.length} current={allSteps.indexOf("games")} />
        <div style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>🎮</div>
        <div className="setup-title">Connect Steam</div>
        <div className="setup-sub">
          Enter your Steam ID to sync your game library. We'll keep your shelf up to date automatically.
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Steam ID</label>
          <input
            className="field-input"
            type="text"
            placeholder="76561198XXXXXXXX"
            value={steamId}
            onChange={(e) => setSteamId(e.target.value.trim())}
            autoFocus
          />
          {steamId && (
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
              color: dk.textDim, marginTop: 6, letterSpacing: "0.02em",
              wordBreak: "break-all",
            }}>
              Feed: https://steamcommunity.com/profiles/{steamId}/games/?xml=1
            </div>
          )}
        </div>

        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: dk.textDim,
          lineHeight: 1.5, marginBottom: 16,
          padding: 14,
          background: dk.accent,
          border: "1px solid " + dk.border,
          borderRadius: 12,
        }}>
          Find your Steam ID by going to your Steam profile — it's the long number in the URL{" "}
          (<span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>
            steamcommunity.com/profiles/<strong>76561198...</strong>
          </span>).
          If you see a custom URL instead, enable the Steam URL bar in <strong>Settings → Interface</strong>.
        </div>

        <div className="setup-spacer" />

        <div style={{ display: "flex", gap: 10 }}>
          <BackButton onClick={() => setPhase(prevPhaseBefore("games") || "shelves")} />
          <button
            className="btn-primary"
            onClick={() => advanceFrom("games")}
            style={{ flex: 1 }}
          >
            Next →
          </button>
        </div>
        <SkipButton onClick={() => advanceFrom("games")} label="Skip — I don't use Steam" />
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  //  STEP 6 — Communities
  // ═════════════════════════════════════════════════════════
  if (phase === "communities") {
    const selectedCount = Object.values(selectedCommunities).filter(Boolean).length;

    const toggleCommunity = (id) => {
      setSelectedCommunities(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleCommunitiesFinish = () => {
      const ids = Object.entries(selectedCommunities)
        .filter(([, on]) => on)
        .map(([id]) => id);
      beginProcessing(ids);
    };

    const goBack = () => {
      const prev = prevPhaseBefore("communities");
      if (prev) setPhase(prev);
    };

    const hasImportWork = letterboxdUsername || uploadedFile || bookUploadedFile || steamId;

    return (
      <div className="setup-screen">
        <style>{DARK_STYLES}</style>
        <StepDots total={allSteps.length} current={allSteps.indexOf("communities")} />
        <div className="setup-title">Your Podcasts</div>
        <div className="setup-sub">
          Which podcast communities do you want to follow? You'll track films, shows, and games alongside each community.
        </div>

        {loadingCommunities ? (
          <div style={{ textAlign: "center", padding: 40, color: dk.textDim, fontSize: 13 }}>
            Loading communities...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {communities.map((c, i) => {
              const theme = c.theme_config || {};
              const accent = theme.accent || "#e94560";
              const on = selectedCommunities[c.id];

              return (
                <div
                  key={c.id}
                  onClick={() => toggleCommunity(c.id)}
                  style={{
                    background: on ? dk.cardActive : dk.card,
                    border: `2px solid ${on ? accent : dk.border}`,
                    borderRadius: 14,
                    padding: "14px 16px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    animation: `fadeSlideUp 0.3s ease ${i * 0.04}s both`,
                  }}
                >
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: on ? accent : dk.border,
                    flexShrink: 0,
                    transition: "background 0.15s",
                    boxShadow: on ? `0 0 8px ${accent}44` : "none",
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700, fontSize: 15,
                      textTransform: "uppercase", letterSpacing: "0.02em",
                      color: on ? "#fff" : dk.text,
                      lineHeight: 1.2,
                    }}>{c.name}</div>
                    {c.description && (
                      <div style={{
                        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontStyle: "italic",
                        color: on ? "rgba(255,255,255,0.4)" : dk.textDim,
                        marginTop: 2,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{c.description}</div>
                    )}
                  </div>

                  {on && (
                    <div style={{ fontSize: 12, color: accent, flexShrink: 0 }}>✓</div>
                  )}
                </div>
              );
            })}

            {/* Coming soon teaser */}
            <div style={{
              background: dk.card,
              border: `2px dashed ${dk.border}`,
              borderRadius: 14,
              padding: "20px 16px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>🎙️</div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700, fontSize: 14,
                textTransform: "uppercase", letterSpacing: "0.04em",
                color: dk.text,
              }}>More communities coming soon</div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontStyle: "italic",
                color: dk.textDim, marginTop: 4,
              }}>New podcast communities are added regularly.</div>
            </div>
          </div>
        )}

        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
          color: dk.textDim, textAlign: "center", marginBottom: 16, letterSpacing: "0.03em",
        }}>
          {selectedCount} selected · Manage anytime in settings
        </div>

        <div className="setup-spacer" />

        <div style={{ display: "flex", gap: 10 }}>
          <BackButton onClick={goBack} />
          <button
            className="btn-primary"
            onClick={handleCommunitiesFinish}
            style={{ flex: 1 }}
          >
            {hasImportWork ? "Next →" : "Let's Go 🚀"}
          </button>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  //  PROCESSING — Import data inline
  // ═════════════════════════════════════════════════════════
  if (phase === "processing") {
    const allDone = processingDone;
    const hasErrors = processingTasks.some(t => t.status === "error");
    const totalImported = processingTasks
      .filter(t => t.status === "done" && t.result)
      .map(t => {
        const match = t.result.match(/^(\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .reduce((a, b) => a + b, 0);

    return (
      <div className="setup-screen">
        <style>{DARK_STYLES}</style>
        <div style={{ fontSize: 48, textAlign: "center", marginBottom: 16 }}>
          {allDone ? "🎉" : "⚡"}
        </div>
        <div className="setup-title">
          {allDone ? "You're all set!" : "Setting up your library"}
        </div>
        <div className="setup-sub">
          {allDone
            ? totalImported > 0
              ? "Your library is loaded and ready to go."
              : "Everything's connected. Start exploring!"
            : "Hang tight — we're importing your data and connecting your accounts."}
        </div>

        <div style={{
          margin: "20px 0 24px",
          padding: "16px",
          background: dk.card,
          border: "1px solid " + dk.border,
          borderRadius: 14,
        }}>
          {processingTasks.map(task => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>

        {allDone && (
          <>
            {hasErrors && (
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                color: dk.textDim, textAlign: "center", marginBottom: 16,
              }}>
                Some items couldn't be imported — you can retry from Settings anytime.
              </div>
            )}

            <button
              className="btn-primary"
              onClick={handleFinalComplete}
              style={{ width: "100%" }}
            >
              Let's Go 🚀
            </button>
          </>
        )}

        {!allDone && (
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
            color: dk.textDim, textAlign: "center",
            letterSpacing: "0.02em",
          }}>
            Large libraries may take a few minutes
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default UsernameSetup;
