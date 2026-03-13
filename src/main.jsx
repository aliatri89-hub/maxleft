import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/base.css'
import './styles/modals-dark.css'
import './styles/shell-dark.css'
import './styles/feed-dark.css'
import './styles/explore-dark.css'
import './styles/profile-dark.css'
import './styles/challenge-dark.css'
import './styles/shelves-upgrade.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// ——— SERVICE WORKER — auto-update on every deploy ——————————
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(reg => {
    // Check for updates every 30 seconds
    setInterval(() => reg.update(), 30000);

    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'waiting' && navigator.serviceWorker.controller) {
          // New version ready — activate it
          newWorker.postMessage('SKIP_WAITING');
        }
      });
    });
  }).catch(err => console.error('SW registration failed:', err));

  // Reload when new SW takes over
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}
