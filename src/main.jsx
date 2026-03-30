import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// ──── COLD START MARKER (remove after debugging) ────
console.warn('[MANTL-RELOAD] === MAIN.JSX EXECUTED (cold start) ===', new Date().toISOString());
// ──── END ────
import './styles/tokens.css'
import './styles/base.css'
import './styles/modals-dark.css'
import './styles/shell-dark.css'
import './styles/profile-dark.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// ——— SERVICE WORKER — auto-update on every deploy ——————————
// Skip on native — Capacitor handles its own caching
import { Capacitor } from '@capacitor/core';

// ──── RELOAD DIAGNOSTICS (remove after debugging) ────
const _reloadLog = (tag, detail) => console.warn(`[MANTL-RELOAD] ${tag}`, detail || '', new Date().toISOString());
window.addEventListener('pageshow', (e) => _reloadLog('pageshow', { persisted: e.persisted, navType: performance?.navigation?.type }));
document.addEventListener('visibilitychange', () => _reloadLog('visibility', document.visibilityState));
// ──── END DIAGNOSTICS ────

if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(reg => {
    // Check for updates every 30 seconds
    setInterval(() => reg.update(), 30000);

    reg.addEventListener('updatefound', () => {
      _reloadLog('SW updatefound — new worker installing');
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        _reloadLog('SW statechange', { state: newWorker.state, hasController: !!navigator.serviceWorker.controller });
        if (newWorker.state === 'waiting' && navigator.serviceWorker.controller) {
          // New version ready — activate it
          _reloadLog('SW SKIP_WAITING — will cause controllerchange → reload');
          newWorker.postMessage('SKIP_WAITING');
        }
      });
    });
  }).catch(err => console.error('SW registration failed:', err));

  // Reload when new SW takes over
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    _reloadLog('SW controllerchange fired — about to reload page');
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}
