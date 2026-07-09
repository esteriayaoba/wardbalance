/// Push notification utilities (PWA)
/// Requires NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars
/// Generate keys: npx web-push generate-vapid-keys

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushNotification(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: PushPayload,
): Promise<boolean> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.NEXT_PUBLIC_APP_URL || "mailto:support@wardbalance.com";

  if (!publicKey || !privateKey) {
    return false;
  }

  try {
    const webpush = await import("web-push");
    webpush.setVapidDetails(subject, publicKey, privateKey);

    await webpush.sendNotification(
      { endpoint, keys: { p256dh, auth } },
      JSON.stringify(payload),
    );
    return true;
  } catch {
    return false;
  }
}

export async function sendPushToParent(
  parentId: string,
  payload: PushPayload,
): Promise<number> {
  const { prisma } = await import("@/lib/prisma");

  const subs = await prisma.pushSubscription.findMany({
    where: { parentId },
  });

  let sent = 0;
  for (const sub of subs) {
    const ok = await sendPushNotification(sub.endpoint, sub.p256dh, sub.auth, payload);
    if (ok) sent++;
  }
  return sent;
}
