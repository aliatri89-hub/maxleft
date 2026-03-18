import { useEffect, useState } from "react";

/**
 * LetterboxdSyncToast
 * VHS tape-label style toast for Letterboxd sync events.
 * Slides down from the top. Tap to dismiss, or auto-dismisses after `duration` ms.
 */
export default function LetterboxdSyncToast({ synced = 0, rewatches = 0, duration = 3600, onDone }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), duration);
    const doneTimer = setTimeout(() => onDone?.(), duration + 320);
    return () => { clearTimeout(exitTimer); clearTimeout(doneTimer); };
  }, [duration, onDone]);

  const dismiss = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => onDone?.(), 320);
  };

  // Build label text
  const parts = [];
  if (synced > 0) parts.push(`${synced} film${synced !== 1 ? "s" : ""}`);
  if (rewatches > 0) parts.push(`${rewatches} rewatch${rewatches !== 1 ? "es" : ""}`);
  const mainText = parts.join(" + ");
  const subText = rewatches > 0 && synced === 0 ? "Updated in your log" : "Synced from Letterboxd";

  return (
    <>
      <style>{`
        @keyframes lbd-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-110%); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes lbd-toast-out {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to   { opacity: 0; transform: translateX(-50%) translateY(-110%); }
        }
        .lbd-toast-wrap {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 600;
          width: min(88vw, 320px);
          animation: lbd-toast-in 0.38s cubic-bezier(0.2, 0.9, 0.35, 1.05) forwards;
          cursor: pointer;
        }
        .lbd-toast-wrap.exiting {
          animation: lbd-toast-out 0.3s cubic-bezier(0.4, 0, 0.8, 0.6) forwards;
        }
        .lbd-toast-card {
          background: #f0ead8;
          border-radius: 7px;
          overflow: hidden;
          box-shadow: 0 6px 28px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.3);
        }
        .lbd-stripe {
          height: 5px;
          background: linear-gradient(to right, #f7a13a 33%, #42c75a 33% 66%, #5ab5ef 66%);
        }
        .lbd-body {
          display: flex;
          align-items: stretch;
          padding: 10px 0 11px 0;
        }
        .lbd-brand-l {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          font-family: 'IBM Plex Mono', 'Share Tech Mono', monospace;
          font-size: 7px;
          letter-spacing: 2.5px;
          color: #8a7a60;
          text-transform: uppercase;
          padding: 0 7px 0 9px;
          border-right: 1px solid #d8cfb8;
          flex-shrink: 0;
          white-space: nowrap;
          display: flex;
          align-items: center;
        }
        .lbd-content {
          flex: 1;
          padding: 2px 12px 0;
          min-width: 0;
        }
        .lbd-logo {
          margin-bottom: 6px;
        }
        .lbd-main-text {
          font-family: 'Permanent Marker', cursive;
          font-size: 22px;
          color: #1a100a;
          line-height: 1.1;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .lbd-sub-text {
          font-family: 'IBM Plex Mono', 'Share Tech Mono', monospace;
          font-size: 8px;
          letter-spacing: 1.5px;
          color: #7a6a50;
          text-transform: uppercase;
        }
        .lbd-dismiss-hint {
          font-family: 'IBM Plex Mono', 'Share Tech Mono', monospace;
          font-size: 7px;
          letter-spacing: 1px;
          color: #b0a080;
          text-transform: uppercase;
          margin-top: 5px;
        }
        .lbd-brand-r {
          writing-mode: vertical-rl;
          font-family: 'IBM Plex Mono', 'Share Tech Mono', monospace;
          font-size: 7px;
          letter-spacing: 2px;
          color: #b0a080;
          text-transform: uppercase;
          padding: 0 9px;
          border-left: 1px solid #d8cfb8;
          flex-shrink: 0;
          white-space: nowrap;
          display: flex;
          align-items: center;
        }
      `}</style>

      <div
        className={`lbd-toast-wrap${exiting ? " exiting" : ""}`}
        onClick={dismiss}
      >
        <div className="lbd-toast-card">
          <div className="lbd-stripe" />
          <div className="lbd-body">
            <div className="lbd-brand-l">Synced</div>
            <div className="lbd-content">
              <div className="lbd-logo">
                <svg width="36" height="14" viewBox="0 0 54 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10.5" cy="10.5" r="10.5" fill="#F7A13A"/>
                  <circle cx="27"   cy="10.5" r="10.5" fill="#42C75A"/>
                  <circle cx="43.5" cy="10.5" r="10.5" fill="#5AB5EF"/>
                  <ellipse cx="18.75" cy="10.5" rx="2.25" ry="10.5" fill="#c8882e" opacity="0.5"/>
                  <ellipse cx="35.25" cy="10.5" rx="2.25" ry="10.5" fill="#2da048" opacity="0.5"/>
                </svg>
              </div>
              <div className="lbd-main-text">{mainText}</div>
              <div className="lbd-sub-text">{subText}</div>
              <div className="lbd-dismiss-hint">tap to dismiss ×</div>
            </div>
            <div className="lbd-brand-r">VHS · SP</div>
          </div>
        </div>
      </div>
    </>
  );
}
