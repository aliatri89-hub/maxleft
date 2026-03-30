/**
 * QueueToast.jsx
 * Brief notification when an episode is added to / removed from the queue.
 * Purely presentational — receives a toast object via props.
 */

import { useState, useEffect } from "react";
import { t } from "../../../../theme";
import { ACCENT } from "./audioHelpers";

export default function QueueToast({ toast }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    setExiting(false);
    const timer = setTimeout(() => setExiting(true), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "calc(114px + var(--sab))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10000,
        animation: exiting
          ? "nudgeSlideOut 0.35s ease forwards"
          : "nudgeSlideIn 0.3s cubic-bezier(0, 0.8, 0.2, 1) forwards",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          background: "rgba(18,18,30,0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: `1px solid ${toast.duplicate ? "rgba(255,255,255,0.08)" : `${ACCENT}30`}`,
          borderRadius: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          whiteSpace: "nowrap",
        }}
      >
        {toast.duplicate ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        ) : toast.remove ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke={ACCENT}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke={ACCENT}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: toast.duplicate ? t.textMuted : t.textPrimary,
            fontFamily: t.fontDisplay,
            textTransform: "uppercase",
            letterSpacing: "0.03em",
          }}
        >
          {toast.duplicate
            ? "Already in queue"
            : toast.custom
            ? toast.title
            : "Added to Up Next"}
        </span>
      </div>
    </div>
  );
}
