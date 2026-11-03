const CACHE = "calendar-shell-v1";

const cacheableResponse = async (response) => {
    if (!response || response.status !== 200) {
        return null;
    }
    const headers = new Headers(response.headers);
    headers.delete("set-cookie");
    headers.delete("content-encoding");
    headers.delete("content-length");
    headers.delete("vary");
    return new Response(await response.blob(), {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
};

const storeResponse = async (cacheKey, response) => {
    try {
        const copy = await cacheableResponse(response);
        if (!copy) {
            return;
        }
        const cache = await caches.open(CACHE);
        await cache.put(cacheKey, copy);
    } catch {
        // Ignore quota errors. The page still receives the network response.
    }
};

const isCalendarNavigation = (request) => {
    if (request.mode !== "navigate" || request.method !== "GET") {
        return false;
    }
    const url = new URL(request.url);
    return url.origin === self.location.origin
        && (url.pathname === "/calendar" || url.pathname.startsWith("/calendar/"));
};

const isShellAsset = (request) => {
    if (request.method !== "GET") {
        return false;
    }
    const url = new URL(request.url);
    if (url.origin !== self.location.origin || url.pathname.startsWith("/v1/")) {
        return false;
    }
    return ["script", "style", "font", "image", "worker", "manifest"].includes(request.destination)
        || url.pathname.startsWith("/assets/")
        || url.pathname.startsWith("/pwa/")
        || url.pathname.startsWith("/fonts/")
        || url.pathname.startsWith("/images/");
};

const networkFirst = async (request, cacheKey) => {
    const cache = await caches.open(CACHE);
    try {
        const response = await fetch(request);
        void storeResponse(cacheKey, response.clone());
        return response;
    } catch (error) {
        const cached = await cache.match(cacheKey);
        if (cached) {
            return cached;
        }
        throw error;
    }
};

self.addEventListener("install", (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(
            keys
                .filter((key) => key.startsWith("calendar-shell-") && key !== CACHE)
                .map((key) => caches.delete(key))
        );
        await self.clients.claim();
    })());
});

self.addEventListener("fetch", (event) => {
    if (isCalendarNavigation(event.request)) {
        const cacheKey = new Request(new URL("/calendar", self.location.origin).toString());
        event.respondWith(networkFirst(event.request, cacheKey));
        return;
    }
    if (isShellAsset(event.request)) {
        event.respondWith(networkFirst(event.request, event.request));
    }
});

self.addEventListener("message", (event) => {
    const urls = event.data?.type === "cache-urls" && Array.isArray(event.data.urls) ? event.data.urls : null;
    if (!urls) {
        return;
    }
    event.waitUntil((async () => {
        const origin = self.location.origin;
        await Promise.all(urls.map(async (raw) => {
            let url;
            try {
                url = new URL(raw, origin);
            } catch {
                return;
            }
            if (url.origin !== origin || url.pathname.startsWith("/v1/")) {
                return;
            }
            try {
                const response = await fetch(url.toString());
                const cacheKey = url.pathname === "/" || url.pathname === "/calendar" || url.pathname.endsWith(".html")
                    ? new Request(new URL("/calendar", origin).toString())
                    : url.toString();
                await storeResponse(cacheKey, response);
            } catch {
                // A missing file can be cached on the next visit.
            }
        }));
    })());
});
