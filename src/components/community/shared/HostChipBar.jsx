import React, { useRef, useEffect } from "react";

/**
 * HostChipBar — horizontally scrollable host filter chips.
 *
 * Matches the existing pill-button aesthetic from view mode toggles.
 * Multi-select: tap hosts to filter, tap again to deselect.
 * "All" chip clears the selection.
 */
export default function HostChipBar({
  hosts,
  selectedHostIds,
  onToggle,
  onClear,
  accent = "#1DB954",
  maxVisible = 12,
}) {
  const scrollRef = useRef(null);
  const hasSelection = selectedHostIds.size > 0;

  // Split visible hosts and "others" rollup
  const visibleHosts = hosts.slice(0, maxVisible);
  const otherHosts = hosts.slice(maxVisible);
  const otherCount = otherHosts.reduce((sum, h) => sum + h.itemCount, 0);
  const anyOtherSelected = otherHosts.some((h) => selectedHostIds.has(h.id));

  if (!hosts.length) return null;

  const chipStyle = (active) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "5px 12px",
    borderRadius: 20,
    border: `1.5px solid ${active ? accent : "rgba(255,255,255,0.1)"}`,
    background: active ? `${accent}25` : "rgba(255,255,255,0.05)",
    color: active ? accent : "#888",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
    transition: "all 0.2s",
    outline: "none",
    fontFamily: "inherit",
    WebkitTapHighlightColor: "transparent",
  });

  const countStyle = (active) => ({
    fontSize: 10,
    fontWeight: 500,
    opacity: 0.55,
    color: active ? accent : "#666",
  });

  return (
    <div
      ref={scrollRef}
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        overflowY: "hidden",
        padding: "6px 16px 2px",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* All chip */}
      <button onClick={onClear} style={chipStyle(!hasSelection)}>
        All
      </button>

      {/* Host chips */}
      {visibleHosts.map((host) => {
        const isSelected = selectedHostIds.has(host.id);
        const firstName = host.name.split(" ")[0];
        return (
          <button
            key={host.id}
            onClick={() => onToggle(host.id)}
            style={chipStyle(isSelected)}
          >
            {firstName}
            <span style={countStyle(isSelected)}>{host.itemCount}</span>
          </button>
        );
      })}

      {/* Others rollup */}
      {otherHosts.length > 0 && (
        <button
          onClick={() => {
            // Toggle: if any other selected, clear them; else select all others
            if (anyOtherSelected) {
              otherHosts.forEach((h) => {
                if (selectedHostIds.has(h.id)) onToggle(h.id);
              });
            } else {
              otherHosts.forEach((h) => onToggle(h.id));
            }
          }}
          style={chipStyle(anyOtherSelected)}
        >
          Others
          <span style={countStyle(anyOtherSelected)}>{otherCount}</span>
        </button>
      )}
    </div>
  );
}
