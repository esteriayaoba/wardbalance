"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Check for push subscription updates
          reg.pushManager.getSubscription().then((sub) => {
            if (!sub) return;
            // Send current subscription to server
            fetch("/api/portal/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                endpoint: sub.endpoint,
                keys: {
                  p256dh: arrayBufferToBase64(sub.getKey("p256dh")!),
                  auth: arrayBufferToBase64(sub.getKey("auth")!),
                },
              }),
            }).catch(() => {});
          });
        })
        .catch(() => {});
    }
  }, []);

  return null;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
