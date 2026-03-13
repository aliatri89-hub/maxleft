import { useState, useRef } from "react";
import { parseFile, importMovies, importBooks, FORMAT_LABELS } from "../utils/importUtils";

function ImportCSVModal({ session, onClose, onToast, onComplete }) {
  const [step, setStep] = useState("pick"); // pick, preview, importing, done
  const [format, setFormat] = useState(null); // goodreads, storygraph, letterboxd
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

    if (result.error) {
      onToast(result.error);
      return;
    }

    setFormat(result.format);
    setDupeCount(result.dupeCount);
    setParsed(result.items);
    setStep("preview");
  };

  const startImport = async () => {
    setStep("importing");
    setProgress(0);
    setTotal(parsed.length);
    setImported(0);
    setErrors(0);

    const onProgress = (current, total) => {
      setProgress(current);
      setTotal(total);
    };

    let result;
    if (format === "letterboxd") {
      result = await importMovies(parsed, session.user.id, onProgress);
    } else {
      result = await importBooks(parsed, session.user.id, onProgress);
    }

    setImported(result.count);
    setErrors(result.errs);
    setStep("done");
    if (result.count > 0 && onComplete) onComplete();
  };

  const typeLabel = format === "letterboxd" ? "films" : "books";

  return (
    <div className="overlay" onClick={() => step !== "importing" && onClose()}>
      <div className="pin-picker" onClick={e => e.stopPropagation()} style={{ maxHeight: "85vh", overflow: "auto" }}>
        <div className="pin-picker-header">
          <div className="pin-picker-title">
            {step === "pick" ? "Import Library" : step === "preview" ? `${FORMAT_LABELS[format]} Import` : step === "importing" ? "Importing..." : "Import Complete"}
          </div>
          {step !== "importing" && <div className="pin-picker-close" onClick={onClose}>✕</div>}
        </div>

        <div style={{ padding: "0 16px 24px" }}>
          {step === "pick" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="mono" style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6 }}>
                Import your library from another platform. We'll match what you've already got and skip duplicates.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { key: "goodreads", emoji: "📚", label: "Goodreads", hint: "My Books → Import/Export → Export Library" },
                  { key: "storygraph", emoji: "📖", label: "StoryGraph", hint: "Settings → Export StoryGraph Library" },
                  { key: "letterboxd", emoji: "🎬", label: "Letterboxd", hint: "Settings → Import & Export → Export Your Data → diary.csv" },
                ].map(opt => (
                  <div key={opt.key} onClick={() => fileRef.current?.click()} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                    background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, cursor: "pointer",
                  }}>
                    <span style={{ fontSize: 24 }}>{opt.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div className="bb" style={{ fontSize: 14 }}>{opt.label}</div>
                      <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)", lineHeight: 1.5 }}>{opt.hint}</div>
                    </div>
                    <div style={{ color: "var(--text-faint)" }}>→</div>
                  </div>
                ))}
              </div>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: "none" }} />
              <button className="btn-shelf-it" onClick={() => fileRef.current?.click()} style={{ marginTop: 4 }}>
                📂 Choose CSV File
              </button>
              <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)", textAlign: "center", lineHeight: 1.5 }}>
                We auto-detect the format from the CSV headers
              </div>
            </div>
          )}

          {step === "preview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 12, padding: "16px",
                background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border)",
              }}>
                <span style={{ fontSize: 32 }}>{format === "letterboxd" ? "🎬" : "📚"}</span>
                <div>
                  <div className="bb" style={{ fontSize: 20 }}>{parsed.length}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--text-dim)" }}>
                    new {typeLabel} from {FORMAT_LABELS[format]}
                  </div>
                </div>
              </div>
              {dupeCount > 0 && (
                <div className="mono" style={{ fontSize: 11, color: "var(--sage)", padding: "8px 12px", background: "rgba(122,154,106,0.08)", borderRadius: 8 }}>
                  ✓ {dupeCount} duplicate{dupeCount !== 1 ? "s" : ""} already on your shelf — skipped
                </div>
              )}
              {parsed.length > 0 && (
                <div style={{ maxHeight: 200, overflow: "auto", borderRadius: 10, border: "1px solid var(--border)" }}>
                  {parsed.slice(0, 50).map((item, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 12px", borderBottom: i < Math.min(parsed.length, 50) - 1 ? "1px solid var(--border)" : "none",
                      fontSize: 12,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>{item.title}</div>
                        <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)" }}>
                          {item.author || item.year || ""}
                          {item.rating ? ` · ${"★".repeat(item.rating)}` : ""}
                        </div>
                      </div>
                      {item.isReading && <span className="mono" style={{ fontSize: 9, color: "var(--terracotta)" }}>READING</span>}
                    </div>
                  ))}
                  {parsed.length > 50 && (
                    <div className="mono" style={{ padding: "8px 12px", fontSize: 10, color: "var(--text-faint)", textAlign: "center" }}>
                      + {parsed.length - 50} more
                    </div>
                  )}
                </div>
              )}
              {format === "letterboxd" && (
                <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)", lineHeight: 1.5 }}>
                  Each film needs a TMDB lookup for poster art. This may take a minute for large libraries.
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-shelf-it" disabled={parsed.length === 0} onClick={startImport} style={{ flex: 1 }}>
                  Import {parsed.length} {typeLabel}
                </button>
                <button onClick={() => { setStep("pick"); setParsed([]); setFormat(null); }}
                  style={{ padding: "10px 16px", background: "none", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", fontSize: 12 }}>
                  Back
                </button>
              </div>
            </div>
          )}

          {step === "importing" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0" }}>
              <div className="spinner" />
              <div className="bb" style={{ fontSize: 16 }}>
                {format === "letterboxd" ? "Looking up films..." : "Importing books & fetching covers..."}
              </div>
              <div style={{ width: "100%", background: "var(--border)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                <div style={{
                  height: "100%", background: "var(--terracotta)", borderRadius: 4,
                  width: `${total > 0 ? (progress / total) * 100 : 0}%`,
                  transition: "width 0.3s ease",
                }} />
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>
                {progress} / {total} {typeLabel}
              </div>
            </div>
          )}

          {step === "done" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "24px 0" }}>
              <div style={{ fontSize: 48 }}>{imported > 0 ? "🎉" : "😅"}</div>
              <div className="bb" style={{ fontSize: 18 }}>
                {imported > 0 ? `${imported} ${typeLabel} imported!` : `No new ${typeLabel} to import`}
              </div>
              {errors > 0 && (
                <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>
                  {errors} couldn't be matched{format === "letterboxd" ? " on TMDB" : ""}
                </div>
              )}
              <button className="btn-shelf-it" onClick={onClose} style={{ marginTop: 8, width: "100%" }}>
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
