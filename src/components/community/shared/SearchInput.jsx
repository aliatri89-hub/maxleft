import { useRef, useId } from "react";

/**
 * SearchInput — always-visible search bar with 🔍 icon and clear button.
 *
 * Used in tab sub-components (PatreonTab, BooksTab, PatronTab, etc.)
 * where search is always visible (not collapsible).
 *
 * Props:
 *   value       — current search string
 *   onChange    — (newValue) => void
 *   placeholder — placeholder text (e.g. "Search commentaries...")
 *   accent      — focus border color (defaults to community accent)
 *   inputRef    — optional ref to the input element
 */
export default function SearchInput({ value, onChange, placeholder = "Search...", accent, inputRef }) {
  const fallbackRef = useRef(null);
  const ref = inputRef || fallbackRef;
  const uid = useId().replace(/:/g, "");

  return (
    <div style={{ padding: "12px 16px 0" }}>
      <style>{`
        .cs-search-${uid}::placeholder { color: rgba(255,255,255,0.25); }
        .cs-search-${uid}:focus { border-color: ${accent ? `${accent}66` : "rgba(255,255,255,0.3)"}; outline: none; }
      `}</style>
      <div style={{ position: "relative" }}>
        <input
          ref={ref}
          className={`cs-search-${uid}`}
          type="text"
          placeholder={placeholder}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px 10px 36px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            color: "#e0e0e0",
            fontSize: 14,
            fontFamily: "inherit",
            WebkitAppearance: "none",
          }}
        />
        <div style={{
          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          fontSize: 14, color: "rgba(255,255,255,0.25)", pointerEvents: "none",
        }}>🔍</div>
        {value && (
          <button
            onClick={() => onChange("")}
            style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%",
              width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
              color: "#888", fontSize: 12, cursor: "pointer",
            }}
          >✕</button>
        )}
      </div>
    </div>
  );
}
