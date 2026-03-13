# Mantl PWA Setup Guide

## Files Created

| File | Location | Purpose |
|------|----------|---------|
| `sw.js` | `/public/sw.js` | Service worker — caching, offline, push notifications |
| `manifest.json` | `/public/manifest.json` | Web app manifest — installability + Play Store |
| `register-sw.js` | `/public/register-sw.js` or inline in `index.html` | Registers the service worker |

## Step 1: Place Files

Copy all three files into your Vite project's `public/` directory:

```
public/
├── sw.js
├── manifest.json
├── register-sw.js
├── icons/              ← YOU NEED TO CREATE THESE
│   ├── icon-48.png
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png
│   ├── icon-192.png
│   ├── icon-256.png
│   ├── icon-384.png
│   ├── icon-512.png
│   ├── maskable-192.png   ← Icon with safe zone padding for Android
│   ├── maskable-512.png
│   ├── badge-72.png       ← Small monochrome icon for notifications
│   ├── shortcut-shelf.png
│   └── shortcut-friends.png
└── screenshots/        ← FOR PLAY STORE / INSTALL PROMPT
    ├── mantl-home.png      (1080×1920)
    ├── mantl-friends.png   (1080×1920)
    └── mantl-recap.png     (1080×1920)
```

## Step 2: Update index.html

Add these to your `<head>`:

```html
<!-- PWA Manifest -->
<link rel="manifest" href="/manifest.json" />

<!-- Theme color (matches manifest) -->
<meta name="theme-color" content="#2c2420" />

<!-- iOS support -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Mantl" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />

<!-- Splash screen hint for iOS -->
<meta name="apple-mobile-web-app-orientations" content="portrait" />
```

Add this just before `</body>`:

```html
<!-- Service Worker Registration -->
<script src="/register-sw.js"></script>
```

## Step 3: Generate Icons

Quickest approach — use one of these:

1. **PWA Asset Generator** (recommended): https://progressier.com/pwa-icons-and-ios-splash-screen-generator
2. **Maskable.app**: https://maskable.app/editor — for testing your maskable icons have proper safe zone
3. **RealFaviconGenerator**: https://realfavicongenerator.net

Start from a **1024×1024 PNG** of the Mantl logo on the charcoal `#2c2420` background.

**Maskable icons**: Need extra padding (safe zone is a centered circle ~80% of the icon). Use `maskable.app/editor` to verify.

## Step 4: Verify PWA Readiness

1. Deploy to mymantl.app
2. Open Chrome DevTools → **Application** tab
3. Check:
   - ✅ Manifest detected (no errors)
   - ✅ Service worker registered & active
   - ✅ All icons loading
4. Run **Lighthouse** → PWA audit — aim for all green checks
5. On Android, you should see the "Install app" prompt in Chrome

## Step 5: Google Play Store via PWABuilder

1. Go to https://pwabuilder.com
2. Enter `mymantl.app`
3. It'll validate your manifest + SW
4. Choose **Android** → generates a TWA (Trusted Web Activity) APK
5. Upload the APK + signing key to Google Play Console
6. You'll need:
   - **Digital Asset Links**: Add `/.well-known/assetlinks.json` to verify your domain
   - **Play Console** developer account ($25 one-time fee)

### Asset Links File

PWABuilder will generate this for you, but you'll add it at:

```
public/.well-known/assetlinks.json
```

And add a Vercel rewrite in `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/.well-known/assetlinks.json", "destination": "/.well-known/assetlinks.json" }
  ]
}
```

## Caching Strategy Summary

| Content | Strategy | Why |
|---------|----------|-----|
| App shell (HTML, JS, CSS) | Stale-while-revalidate | Fast loads, auto-updates |
| Images (TMDB, books, flags) | Cache-first | Posters/covers rarely change |
| API data (Supabase, TMDB) | Network-first | Always fresh, cache as fallback |
| Navigation | Network-first + offline fallback | Works offline with cached shell |
| Auth / Strava | Never cached | Security-sensitive |

## Cache Versioning

When you push a breaking update, bump `CACHE_VERSION` in `sw.js`:

```js
const CACHE_VERSION = 'mantl-v2'; // was 'mantl-v1'
```

Old caches get auto-cleaned on activation.

## Push Notifications (P1 Ready)

The service worker already has push/notification handlers stubbed out. When you're ready:

1. Generate VAPID keys
2. Subscribe users via `registration.pushManager.subscribe()`
3. Store subscriptions in Supabase
4. Send pushes from a Supabase Edge Function

The SW will handle display + click-to-open automatically.
