import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabase";
import { t } from "../theme";
import { parseFile, importMovies } from "../utils/importUtils";
import JSZip from "jszip";

const dk = {
  bg:         "#0f0d0b",
  card:       "#1a1a2e",
  border:     "rgba(255,255,255,0.08)",
  text:       "#f0f0f5",
  textDim:    "#7a7a9a",
  textMuted:  "#55557a",
  terracotta: "#c97849",
  sage:       "#7a9a6a",
  red:        "#c0392b",
  accent:     "rgba(201,120,73,0.10)",
};

const STYLES = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .lb-portal-screen {
    position: fixed; inset: 0; z-index: 9999;
    background: ${dk.bg};
    display: flex; flex-direction: column;
    padding: 60px 24px 40px;
    overflow-y: auto;
    font-family: 'Barlow Condensed', sans-serif;
  }
  .lb-portal-title {
    font-size: 38px; font-weight: 900;
    text-transform: uppercase; letter-spacing: 0.02em;
    color: #f5f0eb; margin-bottom: 8px;
  }
  .lb-portal-sub {
    font-size: 17px; font-style: italic;
    color: rgba(255,255,255,0.8);
    margin-bottom: 32px; line-height: 1.5;
  }
`;

// ── File upload zone (zip or csv) ────────────────────────
function FileUploadZone({ file, onFileSelect, fileInputRef }) {
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
      <input ref={fileInputRef} type="file"
        accept=".csv,.zip,text/csv,application/zip,application/x-zip-compressed,*/*"
        style={{ display: "none" }} onChange={handleFileChange} />
      <div onClick={() => fileInputRef.current?.click()} style={{
        border: `2px dashed ${file ? dk.terracotta : dk.border}`,
        borderRadius: 12, padding: "16px 14px",
        textAlign: "center", cursor: "pointer",
        background: file ? "rgba(201,120,73,0.12)" : "transparent",
      }}>
        {extracting ? (
          <>
            <div style={{ fontSize: 20, marginBottom: 4 }}>⏳</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: dk.text, textTransform: "uppercase" }}>Extracting diary.csv…</div>
          </>
        ) : file ? (
          <>
            <div style={{ fontSize: 20, marginBottom: 4, color: dk.terracotta }}>✓</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: dk.terracotta, textTransform: "uppercase" }}>{file.name}</div>
            <div style={{ fontSize: 12, color: dk.textMuted, marginTop: 3 }}>Tap to change</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 20, marginBottom: 4 }}>📦</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: dk.text, textTransform: "uppercase" }}>Tap to upload export</div>
            <div style={{ fontSize: 12, color: dk.textMuted, marginTop: 3 }}>Upload the .zip, or drop in diary.csv if already extracted</div>
          </>
        )}
      </div>
      {extractError && (
        <div style={{ fontSize: 12, color: dk.red, marginTop: 6, textAlign: "center" }}>{extractError}</div>
      )}
    </>
  );
}

// ── Task row (processing screen) ─────────────────────────
function TaskRow({ task }) {
  const statusColor = { pending: dk.textMuted, running: dk.terracotta, done: dk.sage, error: dk.red };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", opacity: task.status === "pending" ? 0.5 : 1 }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%",
        border: `2px solid ${statusColor[task.status]}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, flexShrink: 0,
        background: task.status === "done" ? statusColor.done : "transparent",
        color: task.status === "done" ? dk.text : statusColor[task.status],
      }}>
        {task.status === "running" ? (
          <div style={{ width: 10, height: 10, border: `2px solid ${dk.terracotta}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        ) : task.status === "done" ? "✓" : task.status === "error" ? "✕" : "○"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.02em", color: task.status === "pending" ? dk.textMuted : dk.text }}>
          {task.label}
        </div>
        {task.status === "running" && task.total > 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ width: "100%", background: dk.border, borderRadius: 3, height: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", background: dk.terracotta, borderRadius: 3, width: `${(task.progress / task.total) * 100}%`, transition: "width 0.3s ease" }} />
            </div>
            <div style={{ fontSize: 13, color: dk.textMuted, marginTop: 3 }}>{task.progress} / {task.total}</div>
          </div>
        )}
        {(task.status === "done" || task.status === "error") && task.result && (
          <div style={{ fontSize: 13, color: task.status === "error" ? dk.red : dk.textDim, marginTop: 2 }}>{task.result}</div>
        )}
      </div>
    </div>
  );
}

// ── RSS preview — shows last 3 films to confirm correct username ──
function RssPreview({ username, dk }) {
  const [state, setState] = useState(null);

  useEffect(() => {
    if (!username || username.length < 2) { setState(null); return; }
    setState("loading");
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-letterboxd", {
          body: { username },
        });
        if (error || !data) { setState(null); return; }
        if (!data.found) { setState("notfound"); return; }
        setState(data.films || []);
      } catch {
        setState(null);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [username]);

  if (!state) return null;

  if (state === "loading") return (
    <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Checking…</div>
  );

  if (state === "notfound") return (
    <div style={{ marginTop: 10, fontSize: 13, color: "#c0392b" }}>
      ✕ Username not found — double check your Letterboxd username
    </div>
  );

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        ✓ Found — recent films
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {state.map((film, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center" }}>
            {film.poster ? (
              <img src={film.poster} alt={film.title} style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 6, display: "block", marginBottom: 4 }} />
            ) : (
              <div style={{ width: "100%", aspectRatio: "2/3", background: "rgba(255,255,255,0.06)", borderRadius: 6, marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 18 }}>🎬</span>
              </div>
            )}
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {film.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main portal ──────────────────────────────────────────
export default function LetterboxdSetupPortal({ session, profile, onClose, onComplete }) {
  const [phase, setPhase] = useState("setup"); // setup | processing
  const [letterboxdUsername, setLetterboxdUsername] = useState(profile?.letterboxd_username || "");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [processingTasks, setProcessingTasks] = useState([]);
  const [processingDone, setProcessingDone] = useState(false);
  const fileInputRef = useRef(null);

  const rssUrl = letterboxdUsername ? `https://letterboxd.com/${letterboxdUsername}/rss/` : "";
  const hasAnything = letterboxdUsername || uploadedFile;

  const beginProcessing = () => {
    const tasks = [];
    if (letterboxdUsername) {
      tasks.push({ id: "letterboxd-rss", label: "Connecting Letterboxd RSS", status: "pending", progress: 0, total: 0, result: null });
    }
    if (uploadedFile) {
      tasks.push({ id: "letterboxd-csv", label: "Importing film history", status: "pending", progress: 0, total: 0, result: null });
    }
    if (tasks.length === 0) { onClose(); return; }
    setProcessingTasks(tasks);
    setPhase("processing");
  };

  useEffect(() => {
    if (phase !== "processing" || processingDone || processingTasks.length === 0) return;
    let cancelled = false;

    const updateTask = (taskId, updates) =>
      setProcessingTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));

    const runTasks = async () => {
      const userId = session.user.id;
      for (const task of processingTasks) {
        if (cancelled) break;
        updateTask(task.id, { status: "running" });
        try {
          if (task.id === "letterboxd-rss") {
            const { error } = await supabase.from("profiles").update({ letterboxd_username: letterboxdUsername }).eq("id", userId);
            if (error) throw error;
            updateTask(task.id, { status: "done", result: `@${letterboxdUsername} linked` });
          } else if (task.id === "letterboxd-csv") {
            const { error: parseError, items } = await parseFile(uploadedFile, userId);
            if (parseError) throw new Error(parseError);
            if (items.length === 0) { updateTask(task.id, { status: "done", result: "No new films to import" }); continue; }
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
          updateTask(task.id, { status: "error", result: err.message || "Something went wrong" });
        }
      }
      if (!cancelled) setProcessingDone(true);
    };

    runTasks();
    return () => { cancelled = true; };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <div className="lb-portal-screen">
      <style>{STYLES}</style>

      {/* Back / close */}
      {!processingDone && (
        <button onClick={phase === "processing" ? undefined : onClose} style={{
          alignSelf: "flex-start", background: "none", border: "none",
          color: dk.textDim, fontSize: 13, cursor: phase === "processing" ? "default" : "pointer",
          marginBottom: 24, padding: 0, opacity: phase === "processing" ? 0.3 : 1,
        }}>← Back</button>
      )}

      {phase === "setup" && (
        <>
          <div style={{ fontSize: 36, textAlign: "center", marginBottom: 12 }}>🎬</div>
          <div className="lb-portal-title">Letterboxd</div>
          <div className="lb-portal-sub">Connect your account to sync your history.</div>

          {/* Live Sync */}
          <div style={{ marginBottom: 14, padding: 14, background: dk.accent, border: "1px solid " + dk.border, borderRadius: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 15, textTransform: "uppercase", color: dk.text, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <span>📡</span> Live Sync
            </div>
            <div style={{ fontSize: 14, color: "#ffffff", lineHeight: 1.6, marginBottom: 10 }}>
              Enter your username to auto-sync new logs going forward.
            </div>
            <label style={{ fontSize: 13, letterSpacing: "0.2em", color: dk.terracotta, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Letterboxd Username</label>
            <input
              type="text" placeholder="e.g. deniro"
              value={letterboxdUsername}
              onChange={e => setLetterboxdUsername(e.target.value.trim().toLowerCase())}
              style={{ width: "100%", background: dk.card, border: "1px solid " + dk.border, color: dk.text, fontSize: 17, padding: "14px 16px", borderRadius: 10, outline: "none", boxSizing: "border-box" }}
            />
            <RssPreview username={letterboxdUsername} dk={dk} />
          </div>

          {/* Import Full History */}
          <div style={{ marginBottom: 24, padding: 14, background: dk.accent, border: "1px solid " + dk.border, borderRadius: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 15, textTransform: "uppercase", color: dk.text, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <span>📦</span> Import Full History
            </div>
            <div style={{ fontSize: 14, color: "#ffffff", lineHeight: 1.6, marginBottom: 10 }}>
              This brings in everything you've ever logged — ratings, dates, the works.
            </div>
            <div style={{ fontSize: 13, color: "#ffffff", lineHeight: 1.9, marginBottom: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
              <div><span style={{ color: dk.terracotta }}>1.</span> Go to <span style={{ color: dk.terracotta, textDecoration: "underline" }}
                onClick={() => { navigator.clipboard.writeText("https://letterboxd.com/data/export/"); }}>
                letterboxd.com/data/export</span></div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginLeft: 14 }}>⚠️ Use your browser, not the app</div>
              <div><span style={{ color: dk.terracotta }}>2.</span> Click <strong>Export Your Data</strong></div>
              <div><span style={{ color: dk.terracotta }}>3.</span> Upload the .zip below — we'll extract it automatically</div>
            </div>
            <FileUploadZone file={uploadedFile} onFileSelect={setUploadedFile} fileInputRef={fileInputRef} />
          </div>

          <div style={{ flex: 1 }} />

          <button
            onClick={beginProcessing}
            disabled={!hasAnything}
            style={{
              width: "100%", padding: "16px", borderRadius: 12, border: "none",
              background: hasAnything ? dk.terracotta : "rgba(255,255,255,0.08)",
              color: hasAnything ? "#fff" : dk.textMuted,
              fontSize: 16, fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: "uppercase", letterSpacing: "0.05em", cursor: hasAnything ? "pointer" : "default",
            }}
          >
            {hasAnything ? "Let's Go 🚀" : "Add username or file above"}
          </button>
          {!hasAnything && (
            <button onClick={onClose} style={{
              width: "100%", marginTop: 12, background: "none", border: "none",
              color: dk.textDim, fontSize: 14, cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif",
            }}>Cancel</button>
          )}
        </>
      )}

      {phase === "processing" && (
        <>
          <div style={{ fontSize: 48, textAlign: "center", marginBottom: 16 }}>{processingDone ? "🎉" : "⚡"}</div>
          <div className="lb-portal-title">{processingDone ? "You're all set!" : "Setting up your library"}</div>
          <div className="lb-portal-sub">
            {processingDone ? "Your library is loaded and ready to go." : "Hang tight — importing your data."}
          </div>

          <div style={{ padding: 16, background: dk.card, border: "1px solid " + dk.border, borderRadius: 14, marginBottom: 24 }}>
            {processingTasks.map(task => <TaskRow key={task.id} task={task} />)}
          </div>

          {!processingDone && (
            <div style={{ fontSize: 13, color: dk.textDim, textAlign: "center" }}>Large libraries may take a few minutes</div>
          )}

          {processingDone && (
            <button onClick={() => { onComplete?.(); onClose(); }} style={{
              width: "100%", padding: "16px", borderRadius: 12, border: "none",
              background: dk.terracotta, color: "#fff",
              fontSize: 16, fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer",
            }}>
              Done 🚀
            </button>
          )}
        </>
      )}
    </div>,
    document.body
  );
}
