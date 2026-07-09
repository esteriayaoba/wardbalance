import { defaultCache } from "@serwist/next/worker";
import { Serwist, type PrecacheEntry } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
    // Cache parent portal API responses for offline balance viewing
    {
      urlPattern: /\/api\/portal\/dashboard/,
      handler: "NetworkFirst",
      method: "GET",
      options: {
        cacheName: "portal-dashboard",
        expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 },
      },
    },
    {
      urlPattern: /\/api\/portal\/invoices/,
      handler: "NetworkFirst",
      method: "GET",
      options: {
        cacheName: "portal-invoices",
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
      },
    },
    {
      urlPattern: /\/api\/portal\/payments/,
      handler: "NetworkFirst",
      method: "GET",
      options: {
        cacheName: "portal-payments",
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
      },
    },
  ],
});

serwist.addEventListeners();

// Push notification event: display notification when received
self.addEventListener("push", (event) => {
  const data = event.data?.json();
  if (!data) return;

  const { title, body, icon, badge, data: notificationData } = data;

  event.waitUntil(
    self.registration.showNotification(title || "WardBalance", {
      body: body || "",
      icon: icon || "/icons/icon-192.png",
      badge: badge || "/icons/icon-192.png",
      data: notificationData || {},
      vibrate: [200, 100, 200],
    }),
  );
});

// Notification click event: navigate to relevant page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/parent/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const matchingClient = clients.find((c) => c.url.includes("/parent/"));
      if (matchingClient) {
        return matchingClient.focus().then((client) => client.navigate(urlToOpen));
      }
      return self.clients.openWindow(urlToOpen);
    }),
  );
});
