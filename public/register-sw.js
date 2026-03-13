// ─── SERVICE WORKER REGISTRATION ───────────────────────────
// Add to index.html just before </body>, or import in main.jsx
// ────────────────────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[Mantl] SW registered, scope:', registration.scope);

        // Check for updates every 30 minutes
        setInterval(() => registration.update(), 30 * 60 * 1000);

        // Notify user when new version is available
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
              // New version available — you can show an in-app toast here
              console.log('[Mantl] New version available — refresh to update');
            }
          });
        });
      })
      .catch((error) => {
        console.warn('[Mantl] SW registration failed:', error);
      });
  });
}
