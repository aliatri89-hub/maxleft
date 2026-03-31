import { t } from "../theme";
import { useState, useRef } from "react";
import { parseFile, importMovies, FORMAT_LABELS } from "../utils/importUtils";

const accent = "#EF9F27";

function ImportCSVModal({ session, onClose, onToast, onComplete }) {
  const [step, setStep] = useState("pick");
  const [format, setFormat] = useState(null);
  const [parsed, setParsed] = useState([]);
  const [dupeCount, setDupeCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [imported, setImported] = useState(0);
  const [errors, setErrors] = useState(0);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await parseFile(file, session.user.id);
    if (result.error) { onToast(result.error); return; }
    setFormat(result.format);
    setDupeCount(result.dupeCount);
    setParsed(result.items);
    setStep("preview");
  };

  const wakeLockRef = useRef(null);

  const acquireWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch (e) {
      // Wake lock not available or denied — silent fallback
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  const startImport = async () => {
    setStep("importing");
    setProgress(0);
    setTotal(parsed.length);
    setImported(0);
    setErrors(0);
    await acquireWakeLock();
    const onProgress = (current, total) => { setProgress(current); setTotal(total); };
    let result;
    try {
      result = await importMovies(parsed, session.user.id, onProgress);
    } finally {
      releaseWakeLock();
    }
    setImported(result.count);
    setErrors(result.errs);
    setStep("done");
    if (result.count > 0 && onComplete) onComplete();
  };

  const typeLabel = "films";

  return (
    <div className="overlay" onClick={() => step !== "importing" && onClose()}>
      <div className="pin-picker" onClick={e => e.stopPropagation()} style={{ maxHeight: "85vh", overflow: "auto" }}>
        <div className="pin-picker-header">
          <div className="pin-picker-title" style={{ fontFamily: t.fontSerif, fontWeight: 700, color: accent }}>
            {step === "pick" ? "Import Library" : step === "preview" ? `${FORMAT_LABELS[format]} Import` : step === "importing" ? "Importing..." : "Import Complete"}
          </div>
          {step !== "importing" && (
            <div className="pin-picker-close" onClick={onClose} style={{ cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                <path d="M3 3l6 6M9 3l-6 6" stroke="var(--text-faint)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          )}
        </div>

        <div style={{ padding: "0 16px 24px" }}>
          {step === "pick" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                Import your library from another platform. We'll match what you've already got and skip duplicates.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { key: "letterboxd", label: "Letterboxd", hint: "Settings → Import & Export → Export Your Data → diary.csv" },
                ].map(opt => (
                  <div key={opt.key} onClick={() => fileRef.current?.click()} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                    background: `${accent}06`, border: `1px solid ${accent}18`, borderRadius: 10, cursor: "pointer",
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{opt.label}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-faint)", lineHeight: 1.5, marginTop: 2 }}>{opt.hint}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                      <path d="M4.5 2.5L8 6L4.5 9.5" stroke={`${accent}80`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                ))}
              </div>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: "none" }} />
              <button onClick={() => fileRef.current?.click()} style={{
                marginTop: 4, padding: "12px 20px", border: "none", borderRadius: 8,
                background: accent, color: "var(--bg-card, #0f0d0b)",
                fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
                letterSpacing: "0.04em", cursor: "pointer", textTransform: "uppercase",
              }}>
                Choose CSV File
              </button>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-faint)", textAlign: "center", lineHeight: 1.5 }}>
                We auto-detect the format from the CSV headers
              </div>
            </div>
          )}

          {step === "preview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 12, padding: "16px",
                background: `${accent}08`, borderRadius: 10, border: `1px solid ${accent}18`,
              }}>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, color: accent }}>{parsed.length}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
                    new {typeLabel} from {FORMAT_LABELS[format]}
                  </div>
                </div>
              </div>
              {dupeCount > 0 && (
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent-green)",
                  padding: "8px 12px", background: "rgba(74,222,128,0.06)", borderRadius: 8,
                  border: "1px solid rgba(74,222,128,0.15)",
                }}>
                  {dupeCount} duplicate{dupeCount !== 1 ? "s" : ""} already on your shelf — skipped
                </div>
              )}
              {parsed.length > 0 && (
                <div style={{ maxHeight: 200, overflow: "auto", borderRadius: 8, border: `1px solid ${accent}15` }}>
                  {parsed.slice(0, 50).map((item, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 12px", borderBottom: i < Math.min(parsed.length, 50) - 1 ? `1px solid ${accent}0a` : "none",
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600, fontFamily: "var(--font-display)", fontSize: 12, color: "var(--text-primary)" }}>{item.title}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-faint)" }}>
                          {item.author || item.year || ""}
                          {item.rating ? ` · ${"★".repeat(item.rating)}` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                  {parsed.length > 50 && (
                    <div style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)", textAlign: "center" }}>
                      + {parsed.length - 50} more
                    </div>
                  )}
                </div>
              )}
              {format === "letterboxd" && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-faint)", lineHeight: 1.5 }}>
                  Each film needs a TMDB lookup for poster art. This may take a minute for large libraries.
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={parsed.length === 0} onClick={startImport} style={{
                  flex: 1, padding: "12px 20px", border: "none", borderRadius: 8,
                  background: accent, color: "var(--bg-card, #0f0d0b)",
                  fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
                  letterSpacing: "0.04em", cursor: "pointer", textTransform: "uppercase",
                  opacity: parsed.length === 0 ? 0.4 : 1,
                }}>
                  Import {parsed.length} {typeLabel}
                </button>
                <button onClick={() => { setStep("pick"); setParsed([]); setFormat(null); }}
                  style={{
                    padding: "12px 16px", background: "none",
                    border: `1px solid ${accent}30`, borderRadius: 8, cursor: "pointer",
                    fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)",
                  }}>
                  Back
                </button>
              </div>
            </div>
          )}

          {step === "importing" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0" }}>
              <div className="spinner" />
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>
                {format === "letterboxd" ? "Looking up films..." : "Importing..."}
              </div>
              <div style={{ width: "100%", background: `${accent}15`, borderRadius: 4, height: 6, overflow: "hidden" }}>
                <div style={{
                  height: "100%", background: accent, borderRadius: 4,
                  width: `${total > 0 ? (progress / total) * 100 : 0}%`,
                  transition: "width 0.3s ease",
                }} />
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
                {progress} / {total} {typeLabel}
              </div>
            </div>
          )}

          {step === "done" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "24px 0" }}>
              <div style={{
                fontFamily: t.fontHeadline, fontSize: 36, letterSpacing: 2,
                color: imported > 0 ? accent : "var(--text-faint)",
              }}>
                {imported > 0 ? "Done!" : "Hmm"}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>
                {imported > 0 ? `${imported} ${typeLabel} imported!` : `No new ${typeLabel} to import`}
              </div>
              {errors > 0 && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)" }}>
                  {errors} couldn't be matched{format === "letterboxd" ? " on TMDB" : ""}
                </div>
              )}
              <button onClick={onClose} style={{
                marginTop: 8, width: "100%", padding: "12px 20px", border: "none", borderRadius: 8,
                background: accent, color: "var(--bg-card, #0f0d0b)",
                fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
                letterSpacing: "0.04em", cursor: "pointer", textTransform: "uppercase",
              }}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ImportCSVModal;
