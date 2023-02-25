const staticPomodoroCache = "pomodoro-site-v2"
const assets = [
    "/",
    "/index.html",
    "/style.css",
    "/index.js",
    "/images/icons/icon.png",
]

self.addEventListener("install", installEvent => {
    installEvent.waitUntil(
        caches.open(staticPomodoroCache).then(cache => {
            cache.addAll(assets)
        })
    )
})

self.addEventListener("fetch", fetchEvent => {
    fetchEvent.respondWith(
        caches.match(fetchEvent.request).then(res => {
            return res || fetch(fetchEvent.request)
        })
    )
})