self.addEventListener("install", (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);
    const calendarRequest = url.origin === self.location.origin
        && (url.pathname === "/calendar" || url.pathname.startsWith("/calendar/"));
    if (!calendarRequest) {
        return;
    }
    event.respondWith(fetch(event.request));
});
