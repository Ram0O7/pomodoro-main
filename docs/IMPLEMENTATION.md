# Implementation notes and PWA notification breakdown

## Architecture

Still is a static, dependency-free web application. `timer.js` isolates deterministic rules so they can run in Node tests. `index.js` owns browser integration. `serviceWorker.js` owns the cached app shell and persistent-notification click events. No worker is kept alive to run a timer.

## Timer and persistence

A timer contains `mode`, `duration`, `remaining`, `endAt`, `cycle` and a session `id`. Starting creates a unique ID and stores `endAt = Date.now() + remaining * 1000`. The render interval only asks how much time remains:

```js
Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000))
```

The interval does not subtract seconds. Delayed callbacks therefore do not accumulate timing drift. Pausing stores the current remainder and clears the deadline. Reset/mode changes create a fresh timer. Completing focus increments the cycle; every fourth focus selects a long break. Breaks and subsequent focus periods require an explicit start, so a sleeping device cannot invent a chain of completed sessions.

The versioned localStorage key is `still-workspace-v1`. Completion saves the new timer/history before awaiting notification delivery. History IDs prevent duplicate entries; Web Locks serialize state changes across tabs and storage events refresh other tabs. Without Web Locks, two tabs may race; deduplication and notification tags are best effort. Private browsing/storage failures fall back to a usable in-memory timer. The previous app’s theme/settings schema is intentionally not migrated because the interface and validation rules were replaced.

## Notification implementation, step by step

### 1. Check browser capabilities

`supportedNotifications()` checks secure context, `Notification`, service workers, and `ServiceWorkerRegistration.prototype.showNotification`. Feature detection is preferred to browser-name sniffing. HTTPS is required in production; localhost is suitable for development. Unsupported devices get explanatory copy instead of an unusable permission button.

### 2. Ask at the right moment

The Enable notifications click handler invokes `Notification.requestPermission()` directly from the user gesture, before waiting for any worker operation. There is no permission request on page load or timer start.

| Browser permission | App behavior |
| --- | --- |
| `default` | Explain value and let the user request permission; dismissal remains retryable |
| `granted` | Let the user switch session alerts on/off and send a test |
| `denied` | Explain browser site settings; never repeatedly prompt |
| API unavailable | Explain HTTPS/browser/Home Screen requirements |

`settings.alerts` is an independent application preference. It cannot override browser permission. Turning it off stops future app alerts without changing OS permissions. Settings can express a preference, but only the explicit Enable notifications button asks the browser for permission. Permission state refreshes when the page becomes visible again.

### 3. Register and activate the service worker

The app registers `./serviceWorker.js`, using a relative path so subdirectory deployments work. It retains the registration for notification display and waits for worker readiness to advertise offline availability. A missing active worker or rejected notification call produces an in-app explanation. There is no indefinite notification wait on `navigator.serviceWorker.ready`.

### 4. Detect completion in the page

The running page detects an expired deadline in `tick()`. The same reconciliation runs on `pageshow` and when the page returns to the foreground. It records completed focus, prepares the next timer, displays an accessible status message and optionally plays a Web Audio chime.

The page then calls:

```js
await registration.showNotification(title, {
  body,
  tag: `still-${sessionId}`,
  icon: new URL('./images/icons/icon-192.png', location.href).href,
  badge: new URL('./images/icons/badge.png', location.href).href,
  data: { url: new URL('./', location.href).href },
  silent: !settings.sound
});
```

The implementation uses this persistent-notification API instead of `new Notification()`, which is not the right cross-platform approach for mobile PWAs. The unique session tag replaces an existing same-session notification if duplicate display is attempted; it is not a durable exactly-once guarantee. Test notifications share the `still-test` tag. Icons are cached; badge rendering and `silent` support depend on the platform. The app does not expose the user’s intention text on the lock screen. Operating systems choose presentation, sound and notification lifetime.

### 5. Handle a click, even if the original page is gone

The service worker listens for `notificationclick`, closes the notification and extends the event with `event.waitUntil()`. It finds an existing same-origin window within its app scope and focuses it; otherwise it opens the app root with `clients.openWindow()`.

The target is calculated from the worker URL. Arbitrary URLs in notification payloads are never trusted. Clicking returns to the persisted timer; it does not silently start a new focus session.

### 6. Understand delivery boundaries

| Situation | Expected behavior |
| --- | --- |
| Visible app, allowed notifications, active worker | Completion message and attempted system notification |
| Background tab still executing | Notification after a callback observes the deadline; timing may be delayed |
| Browser suspends the tab/device sleeps | No guaranteed alert at the deadline; reconcile when execution resumes |
| App fully closed | No scheduled local notification; reconcile on reopening |
| Offline with installed cache | Timer/UI and local notification attempt work without a server |
| Permission denied or unsupported | Visible completion message; optional available audio |
| Focus/Do Not Disturb or OS notification restrictions | OS may hide or suppress notifications even when the API succeeds |

A service worker can be terminated after an event. A `setTimeout` inside it is not a reliable scheduler. Background Sync and Periodic Background Sync are not exact alarm APIs either. Installing a PWA alone does not grant persistent execution. This project intentionally makes no closed-app delivery promise.

On iOS/iPadOS, WebKit introduced Web Push for Home Screen web apps in 16.4. A normal Safari tab should not be assumed to have the same capabilities; use Add to Home Screen and feature detection. This implementation does not register push subscriptions, and local page-triggered notification behavior still needs testing on the target installed app/device. Desktop browser support and OS settings vary as well.

### 7. What true closed-app reminders would require

This is a future extension, **not included in the current static app**:

1. After an explicit opt-in and permission grant, obtain a `PushSubscription` with `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`.
2. Send the subscription to an authenticated HTTPS backend. Treat endpoint/key material as sensitive; restrict ownership, validate input, apply rate limits and provide deletion/retention controls. Keep VAPID private keys on the server.
3. When a timer starts or resumes, schedule a durable server job with its session ID, revision and deadline. Pause/reset/skip must cancel or supersede that job; stale revisions must not deliver. Offline starts cannot create reliable server jobs and must report that limitation.
4. At the deadline, send an encrypted Web Push message through the browser’s push service. Expire stale subscriptions on 404/410 and use bounded retries and a short TTL so old reminders do not arrive much later.
5. Handle `push` in the worker and call `showNotification()` inside `event.waitUntil()`. Validate payloads and use the same session tag and click handler. Coordinate local versus remote alerts to avoid duplicate messages.
6. Test closed-app delivery on installed iOS, Android and desktop targets. Push remains best effort: connectivity, expiration and OS policies can still delay or suppress it. It is not a hard real-time alarm.

Do not add a decorative `push` handler and claim Web Push works: without subscription management, a sender and durable scheduling/cancellation there is no closed-app delivery path.

## Offline and update lifecycle

The install event awaits `cache.addAll()` for the complete shell. Activation removes obsolete owned caches and claims clients. Same-origin GET app-shell requests are cache-first to avoid mixing HTML and JavaScript from different releases. Navigation uses cached `index.html`; unknown resources and cross-origin requests are left to the network. Cache contents exclude user history/preferences, which live in localStorage.

The worker deliberately does not skip waiting on installation. The page offers Update now when a waiting worker exists. Acceptance sends `SKIP_WAITING`; a controller change reloads that page. Other open tabs can finish on their existing in-memory code until reloaded. Keep persisted state backwards-compatible or migrate it when introducing a future schema.

The manifest declares stable relative identity/scope/start URL, standalone display, theme/background colors and separate real-size 192/512 icons. The maskable icon keeps its mark inside the safe central area. The Apple touch icon is 180px; the monochrome transparent badge is 96px. No external font or icon CDN is required for offline rendering.

## Validation and manual release checks

Run `node --test` for timer and worker tests. Browser testing should include:

- Start, pause, resume, reset, mode switch and reload during a running session.
- One-minute completion: exactly one focus record, next break ready, no automatic next start.
- Four completions select long break; skipping does not increment history.
- Permission allow, deny, dismiss, app toggle, test notification and notification click with/without an open window.
- Stop the local server after offline readiness; reload and use the app.
- Deploy under a subfolder and inspect worker scope, manifest and icon requests.
- Bump cache version, reload, accept update, verify persisted active timer survives.
- Two open tabs: synchronized pause/reset and one completion where Web Locks is available.
- Mobile viewport, keyboard controls, dialog focus/Escape, reduced motion and text zoom.

Mocked worker tests do not verify actual OS notification display. Native installation, permission UI and system notification delivery must be tested in the target browser/OS; embedded preview browsers may not expose them.

## Primary references

- [MDN: Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [MDN: ServiceWorkerRegistration.showNotification](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification)
- [WebKit: Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [Apple: Sending web push notifications in web apps and browsers](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers)
