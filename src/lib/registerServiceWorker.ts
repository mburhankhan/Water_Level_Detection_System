/**
 * Service Worker Registration for Water Monitor PWA
 * Caches the App Shell only, never database responses.
 */
export function registerServiceWorker(): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Resolve base relative path for sw.js
      const swUrl = `${import.meta.env.BASE_URL}sw.js`;
      navigator.serviceWorker
        .register(swUrl)
        .then((reg) => {
          // Check for periodic updates
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.info('[SW] New version available.');
                }
              };
            }
          };
        })
        .catch((err) => {
          // Non-fatal if offline or untrusted origin
          console.debug('[SW] Registration note:', err);
        });
    });
  }
}
