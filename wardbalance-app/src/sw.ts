// @ts-nocheck — This file is compiled by @serwist/next at build time using webworker lib
import { defaultCache } from "@serwist/next/worker";
import { Serwist, NetworkFirst, ExpirationPlugin } from "serwist";

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
    {
      matcher: /\/api\/portal\/dashboard/,
      handler: new NetworkFirst({
        cacheName: "portal-dashboard",
        plugins: [
          new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 }),
        ],
      }),
    },
    {
      matcher: /\/api\/portal\/invoices/,
      handler: new NetworkFirst({
        cacheName: "portal-invoices",
        plugins: [
          new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 }),
        ],
      }),
    },
    {
      matcher: /\/api\/portal\/payments/,
      handler: new NetworkFirst({
        cacheName: "portal-payments",
        plugins: [
          new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();

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
