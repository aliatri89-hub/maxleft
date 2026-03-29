import { useEffect, useRef } from "react";

/**
 * BottomSheet — Reusable dark bottom-sheet modal.
 * Every modal in the app uses this as its wrapper.
 *
 * Props:
 *   onClose     — () => void — close handler (backdrop tap, X button, etc.)
 *   children    — modal content
 *   maxWidth    — number (default 420) — max container width
 *   maxHeight   — string (default "85vh") — max content height
 *   showHandle  — boolean (default true) — show drag handle bar
 *   zIndex      — number (default 250) — overlay z-index
 *   className   — string — additional class on the sheet div
 *
 * Usage:
 *   <BottomSheet onClose={() => setOpen(false)}>
 *     <h2>My Modal</h2>
 *     <p>Content here</p>
 *   </BottomSheet>
 */
export default function BottomSheet({
  onClose,
  children,
  maxWidth = 420,
  maxHeight = "85vh",
  showHandle = true,
  zIndex = 250,
  className = "",
}) {
  const sheetRef = useRef(null);

  // Lock body scroll when open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ESC to close
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        top: 0,
        bottom: 0,
        left: "calc(var(--active-index, 0) * 100vw)",
        right: "calc(var(--active-index, 0) * -100vw)",
        zIndex,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        animation: "bsFadeIn 0.2s ease",
      }}
    >
      <style>{`
        @keyframes bsFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bsSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      <div
        ref={sheetRef}
        className={className}
        style={{
          width: "100%",
          maxWidth,
          background: "linear-gradient(180deg, #1a1a2e 0%, #12121f 100%)",
          borderRadius: "20px 20px 0 0",
          padding: `16px 20px calc(20px + var(--sab))`,
          animation: "bsSlideUp 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)",
          maxHeight,
          overflowY: "auto",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.5)",
        }}
      >
        {/* Handle bar */}
        {showHandle && (
          <div style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: "rgba(255,255,255,0.15)",
            margin: "0 auto 16px",
          }} />
        )}

        {children}
      </div>
    </div>
  );
}
