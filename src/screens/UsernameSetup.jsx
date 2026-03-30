import { t } from "../theme";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import { parseFile, importMovies } from "../utils/importUtils";
import JSZip from "jszip";

// ═══════════════════════════════════════════════════════════
//  DARK THEME PALETTE
// ═══════════════════════════════════════════════════════════
const dk = {
  bg:         "#0f0d0b",
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
        fontFamily: t.fontBody, fontSize: 12,
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
        fontFamily: t.fontDisplay,
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
function FileUploadZone({ file, onFileSelect, fileInputRef, label = "Tap to upload" }) {
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState(null);

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setExtractError(null);

    const isZip = f.name.endsWith(".zip") || f.type === "application/zip" || f.type === "application/x-zip-compressed";
    if (isZip) {
      setExtracting(true);
      try {
        const zip = await JSZip.loadAsync(f);
        const diaryEntry = Object.values(zip.files).find(
          entry => !entry.dir && entry.name.toLowerCase().endsWith("diary.csv")
        );
        if (!diaryEntry) {
          setExtractError("No diary.csv found in zip — make sure it's the Letterboxd export.");
          setExtracting(false);
          return;
        }
        const csvBlob = await diaryEntry.async("blob");
        onFileSelect(new File([csvBlob], "diary.csv", { type: "text/csv" }));
      } catch {
        setExtractError("Couldn't read zip. Try uploading diary.csv directly.");
      }
      setExtracting(false);
      return;
    }

    onFileSelect(f);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.zip,text/csv,application/zip,application/x-zip-compressed,*/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
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
        {extracting ? (
          <>
            <div style={{ fontSize: 20, marginBottom: 4 }}>⏳</div>
            <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 13, color: dk.text, textTransform: "uppercase" }}>
              Extracting diary.csv…
            </div>
          </>
        ) : file ? (
          <>
            <div style={{ fontSize: 20, marginBottom: 4, color: dk.terracotta }}>✓</div>
            <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 13, color: dk.terracotta, textTransform: "uppercase" }}>
              {file.name}
            </div>
            <div style={{ fontFamily: t.fontBody, fontSize: 11, color: dk.textMuted, marginTop: 3 }}>Tap to change</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 20, marginBottom: 4 }}>📦</div>
            <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 13, color: dk.text, textTransform: "uppercase" }}>
              {label}
            </div>
            <div style={{ fontFamily: t.fontBody, fontSize: 12, color: dk.textMuted, marginTop: 3 }}>
              Upload the .zip export or diary.csv directly
            </div>
          </>
        )}
      </div>
      {extractError && (
        <div style={{ fontFamily: t.fontBody, fontSize: 12, color: dk.red, marginTop: 6, textAlign: "center" }}>
          {extractError}
        </div>
      )}
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
        color: task.status === "done" ? t.textPrimary : statusColor[task.status],
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
          fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 14,
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
              fontFamily: t.fontBody, fontSize: 13,
              color: dk.textMuted, marginTop: 3,
            }}>
              {task.progress} / {task.total}
            </div>
          </div>
        )}

        {task.status === "done" && task.result && (
          <div style={{
            fontFamily: t.fontBody, fontSize: 13,
            color: dk.textDim, marginTop: 2,
          }}>
            {task.result}
          </div>
        )}

        {task.status === "error" && task.result && (
          <div style={{
            fontFamily: t.fontBody, fontSize: 13,
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
  // ── Core flow: username → communities → letterboxd → processing
  const [phase, setPhase] = useState("username");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  // ── Letterboxd ───────────────────────────────────────────
  const [letterboxdUsername, setLetterboxdUsername] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);

  // ── Podcast picker ──────────────────────────────────────
  const [podcasts, setPodcasts] = useState([]);
  const [selectedPodcasts, setSelectedPodcasts] = useState({});
  const [loadingPodcasts, setLoadingPodcasts] = useState(false);

  // ── Processing phase ─────────────────────────────────────
  const [processingTasks, setProcessingTasks] = useState([]);
  const [processingDone, setProcessingDone] = useState(false);
  const [savedCommunityIds, setSavedCommunityIds] = useState([]);

  // Load podcasts (with community launch status)
  useEffect(() => {
    if (phase !== "communities") return;
    let cancelled = false;
    (async () => {
      setLoadingPodcasts(true);
      const { data, error } = await supabase
        .from("podcasts")
        .select("id, name, slug, artwork_url, community_page_id, community_pages(id, launched)")
        .eq("active", true)
        .order("name", { ascending: true });

      if (!cancelled && !error && data) {
        const sortKey = n => n.replace(/^(the|a|an)\s+/i, "").trim();
        const sorted = [...data].sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name)));
        setPodcasts(sorted);
        // Pre-select all — more podcasts = better experience
        const allSelected = {};
        data.forEach(p => { allSelected[p.id] = true; });
        setSelectedPodcasts(allSelected);
      }
      if (!cancelled) setLoadingPodcasts(false);
    })();
    return () => { cancelled = true; };
  }, [phase]);

  // ── Steps ────────────────────────────────────────────────
  const allSteps = ["username", "communities", "letterboxd"];

  // ── Default shelves — all on, user can toggle in settings later
  const defaultShelves = { movies: true, shows: true };

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

    if (tasks.length === 0) {
      onComplete(username, defaultShelves, communityIds);
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
    onComplete(username, defaultShelves, savedCommunityIds);
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
      .neq("id", session?.user?.id)
      .maybeSingle();

    if (data) { setError("Already taken — try another"); setChecking(false); return; }

    const userId = session?.user?.id;
    if (userId) {
      const { error: updateErr } = await supabase.from("profiles").update({ username: clean, name: clean }).eq("id", userId);
      if (updateErr) { setError("Couldn't save — try again"); setChecking(false); return; }
    }

    setChecking(false);
    setUsername(clean);
    setPhase("communities");
  };

  if (phase === "username") {
    return (
      <div className="setup-screen" style={{ overflowY: "auto" }}>
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
  //  STEP 2 — Communities
  // ═════════════════════════════════════════════════════════
  if (phase === "communities") {
    const selectedCount = Object.values(selectedPodcasts).filter(Boolean).length;

    const togglePodcast = (id) => {
      setSelectedPodcasts(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleCommunitiesDone = async () => {
      const selectedPodcastIds = Object.entries(selectedPodcasts)
        .filter(([, on]) => on)
        .map(([id]) => id);

      // 1. Save podcast favorites
      if (selectedPodcastIds.length > 0) {
        const userId = session.user.id;
        const rows = selectedPodcastIds.map(pid => ({
          user_id: userId,
          podcast_id: pid,
        }));
        const { error: favErr } = await supabase
          .from("user_podcast_favorites")
          .upsert(rows, { onConflict: "user_id,podcast_id" });
        if (favErr) console.error("[Onboarding] Failed to save podcast favorites:", favErr);
      }

      // 2. Derive launched community IDs from selected podcasts
      const communityIds = podcasts
        .filter(p => selectedPodcasts[p.id] && p.community_pages?.launched)
        .map(p => p.community_page_id);

      setSavedCommunityIds(communityIds);
      setPhase("letterboxd");
    };

    return (
      <div className="setup-screen" style={{ paddingLeft: 16, paddingRight: 16 }}>
        <style>{DARK_STYLES}</style>
        <StepDots total={allSteps.length} current={1} />
        <div className="setup-title">Your Podcasts</div>
        <div className="setup-sub">
          We've selected all our podcasts. Deselect any you don't listen to.
        </div>

        {loadingPodcasts ? (
          <div style={{ textAlign: "center", padding: 40, color: dk.textDim, fontSize: 13 }}>
            Loading podcasts...
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
            marginBottom: 24,
            maxWidth: "100%",
            overflow: "hidden",
          }}>
            {podcasts.map((p, i) => {
              const on = selectedPodcasts[p.id];
              const hasLaunchedCommunity = p.community_pages?.launched;

              return (
                <div
                  key={p.id}
                  onClick={() => togglePodcast(p.id)}
                  style={{
                    background: on ? dk.cardActive : dk.card,
                    border: `2px solid ${on ? dk.terracotta : dk.border}`,
                    borderRadius: 12,
                    padding: 6,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    textAlign: "center",
                    position: "relative",
                    minWidth: 0,
                    animation: `fadeSlideUp 0.3s ease ${i * 0.03}s both`,
                  }}
                >
                  {/* Artwork */}
                  {p.artwork_url ? (
                    <img
                      src={p.artwork_url}
                      alt={p.name}
                      style={{
                        width: "100%",
                        aspectRatio: "1",
                        objectFit: "cover",
                        borderRadius: 8,
                        marginBottom: 6,
                        opacity: on ? 1 : 0.7,
                        transition: "opacity 0.15s",
                      }}
                    />
                  ) : (
                    <div style={{
                      width: "100%", aspectRatio: "1",
                      background: dk.border, borderRadius: 8,
                      marginBottom: 6,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 28,
                    }}>🎙️</div>
                  )}

                  {/* Name */}
                  <div style={{
                    fontFamily: t.fontDisplay,
                    fontWeight: 700, fontSize: 10,
                    textTransform: "uppercase", letterSpacing: "0.02em",
                    color: on ? t.textPrimary : dk.text,
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>{p.name}</div>

                  {/* Community badge */}
                  {hasLaunchedCommunity && (
                    <div style={{
                      fontFamily: t.fontBody, fontSize: 7,
                      color: dk.terracotta, marginTop: 2,
                      letterSpacing: "0.04em", textTransform: "uppercase",
                    }}>Community</div>
                  )}

                  {/* Check indicator */}
                  {on && (
                    <div style={{
                      position: "absolute", top: 4, right: 4,
                      width: 16, height: 16, borderRadius: "50%",
                      background: dk.terracotta,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, color: t.textPrimary, fontWeight: 700,
                    }}>✓</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{
          fontFamily: t.fontBody, fontSize: 13,
          color: "#ffffff", textAlign: "center", marginBottom: 16,
          lineHeight: 1.6,
        }}>
          <div style={{ fontWeight: 600 }}>{selectedCount} selected</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Manage anytime in settings</div>
        </div>

        <div className="setup-spacer" />

        <div style={{ display: "flex", gap: 10 }}>
          <BackButton onClick={() => setPhase("username")} />
          <button
            className="btn-primary"
            onClick={handleCommunitiesDone}
            style={{ flex: 1 }}
          >
            Next →
          </button>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  //  STEP 3 — Letterboxd
  // ═════════════════════════════════════════════════════════
  if (phase === "letterboxd") {
    const rssUrl = letterboxdUsername ? `https://letterboxd.com/${letterboxdUsername}/rss/` : "";
    const hasAnything = letterboxdUsername || uploadedFile;

    return (
      <div className="setup-screen">
        <style>{DARK_STYLES}</style>
        <StepDots total={allSteps.length} current={2} />
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
            fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 15,
            textTransform: "uppercase", color: dk.text, marginBottom: 6,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 17 }}>📡</span> Live Sync
          </div>
          <div style={{
            fontFamily: t.fontDisplay, fontSize: 14, color: "#ffffff",
            lineHeight: 1.6, marginBottom: 10,
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
              fontFamily: t.fontBody, fontSize: 12,
              color: "rgba(255,255,255,0.5)", marginTop: 6,
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
            fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 15,
            textTransform: "uppercase", color: dk.text, marginBottom: 6,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 17 }}>📦</span> Import Full History
          </div>
          <div style={{
            fontFamily: t.fontDisplay, fontSize: 14, color: "#ffffff",
            lineHeight: 1.6, marginBottom: 10,
          }}>
            This brings in everything you've ever logged — ratings, dates, the works.
          </div>

          <div style={{
            fontFamily: t.fontBody, fontSize: 13,
            color: "#ffffff", lineHeight: 1.9, marginBottom: 12,
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
              <span id="lb-copy-confirm" style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>(tap to copy link)</span>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginLeft: 14, marginTop: -4 }}>
              ⚠️ Use your browser, not the Letterboxd app
            </div>
            <div><span style={{ color: dk.terracotta }}>2.</span> Click <strong>Export Your Data</strong></div>
            <div><span style={{ color: dk.terracotta }}>3.</span> Download and upload the .zip below — we'll extract it automatically</div>
          </div>

          <FileUploadZone
            file={uploadedFile}
            onFileSelect={(f) => setUploadedFile(f)}
            fileInputRef={fileInputRef}
            label="Tap to upload export"
          />
        </div>

        <div className="setup-spacer" />

        <div style={{ display: "flex", gap: 10 }}>
          <BackButton onClick={() => setPhase("communities")} />
          <button
            className="btn-primary"
            onClick={() => beginProcessing(savedCommunityIds)}
            style={{ flex: 1 }}
          >
            {hasAnything ? "Let's Go 🚀" : "Finish"}
          </button>
        </div>
        {!letterboxdUsername && !uploadedFile && (
          <>
            <SkipButton onClick={() => beginProcessing(savedCommunityIds)} label="Skip — I don't use Letterboxd" />
            <div style={{
              textAlign: "center", fontSize: 12,
              color: "rgba(255,255,255,0.35)",
              fontFamily: t.fontBody, marginTop: 8,
            }}>
              You can always connect Letterboxd later in Settings
            </div>
          </>
        )}
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
                fontFamily: t.fontBody, fontSize: 13,
                color: "rgba(255,255,255,0.6)", textAlign: "center", marginBottom: 16,
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
            fontFamily: t.fontBody, fontSize: 10,
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
