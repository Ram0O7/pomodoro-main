# Still — make room for focus

A complete redesign of the original Pomodoro project: a quiet, responsive workspace in warm paper and sage, with accurate timers and an offline-first PWA. Plain HTML, CSS and JavaScript; no framework, build step, external fonts, analytics, or runtime dependencies.

## Run

Use Node.js 20+:

```sh
node server.js
# Open http://localhost:4173
node --test
```

`npm start` and `npm test` are equivalent conveniences. No installation is needed. The development server binds to loopback only; deploy the static app files to an HTTPS host for production. Do not open `index.html` with `file://`.

## What changed

- Rebuilt interface: focus/break tabs, progress ring, intention field, daily session/minute totals, four-session milestone, keyboard shortcut, accessible settings dialogs, mobile layout, reduced-motion support.
- Replaced interval-decrement timing with a persisted wall-clock deadline. Refreshing or background throttling no longer loses elapsed time. Pausing stores the remainder; completing a session selects the next mode without starting it automatically.
- Every fourth completed focus selects a long break. Skipping/resetting does not award progress. Completed sessions belong to their completion date in the device’s local timezone.
- Preferences, timer, intention and the latest 500 completed focus sessions are saved locally. Invalid saved timer/settings values fall back safely. If storage is unavailable the app continues in memory and explains that persistence is unavailable.
- Tabs synchronize through storage events; Web Locks serialize changes where supported. Browsers without Web Locks have best-effort synchronization, not a cross-tab exactly-once guarantee.
- Opt-in persistent system notifications, test notification, permission-state guidance, an app-level notification toggle, click-to-return handling, and optional synthesized completion sound.
- Complete versioned offline shell, correctly sized regular/maskable icons, installation help, online/offline indicator and an explicit update prompt. Relative paths support root or subfolder hosting.

## PWA behavior

The first successful visit downloads the entire app shell. Installation waits for every asset; a failed asset rejects worker installation instead of claiming offline readiness. Once active, the worker serves its version’s cached shell. No remote runtime resources are required. Browser storage eviction can remove offline data; installation is not a backup.

Updates install into a new versioned cache and wait. The user chooses **Update now**, which activates the waiting worker and reloads the page. Timer state is saved before updates. Increment the cache version in `serviceWorker.js` whenever a shell asset changes. Use normal revalidation/no-cache headers for the worker; avoid serving it with immutable caching.

Serve `index.html`, `style.css`, `index.js`, `timer.js`, `serviceWorker.js`, `manifest.json` and the icons under one path on an HTTPS origin. Preserve the service-worker filename when updating an existing deployment. The old MP3 files and original icon are retained in the repository but are no longer required or cached.

## Notifications: read this first

These are **local session-completion notifications**, not server push. Permission is requested only when the user clicks Enable notifications. Completion calls `ServiceWorkerRegistration.showNotification()`; clicking the notification focuses or opens Still. The app never asks for permission on load.

**Keep the app open.** Background tabs may be throttled or suspended, and a closed app has no running JavaScript timer. A service worker is event-driven and cannot act as a durable alarm scheduler. Still reconciles an expired timer on return, records it once in supported multi-tab environments, and prepares the next session. System settings, battery policies and notification permission may suppress delivery. The visible completion message remains available even without notification support.

See [the detailed implementation and PWA notification breakdown](docs/IMPLEMENTATION.md), including permission flows, platform considerations, reliability boundaries and the architecture required for closed-app Web Push.

## Project map

| File | Responsibility |
| --- | --- |
| `index.html`, `style.css` | Responsive interface and accessible controls |
| `timer.js` | Pure timer rules, validation and date helpers |
| `index.js` | UI, persistence, synchronization, audio, notifications and installation |
| `serviceWorker.js` | Offline shell lifecycle and notification clicks |
| `manifest.json`, `images/icons/` | Install metadata and generated app icons |
| `server.js` | Dependency-free local development server |
| `tests/` | Node tests for timer rules and service-worker behavior |

## Privacy and limits

All session data stays in this browser profile. There is no account, backend, subscription endpoint or push service. Clearing site data removes progress and preferences. Daily targets are a gentle fixed four-session milestone, not a limit. Changing the device clock changes wall-clock timer behavior. Sound needs a user gesture and may be unavailable after restoring a page until the next interaction.
