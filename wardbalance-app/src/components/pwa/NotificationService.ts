/**
 * NotificationService
 *
 * Provider-agnostic abstraction layer for push notifications.
 *
 * Current implementation: No-op (Phase 2B Sprint 4 will wire in FCM).
 *
 * To add a provider in Sprint 4:
 *   1. Create a class implementing NotificationProvider
 *   2. Replace `new NoOpNotificationProvider()` with the new provider
 *   3. No component changes required
 *
 * Parent Portal only — not used in Admin Platform.
 */

export interface NotificationProvider {
  /** Check if push notifications are supported in this environment */
  isSupported(): boolean;

  /** Subscribe the parent to push notifications */
  subscribe(parentId: string, schoolId: string): Promise<void>;

  /** Unsubscribe the parent from push notifications */
  unsubscribe(parentId: string): Promise<void>;

  /** Request notification permission from the browser */
  requestPermission(): Promise<NotificationPermission>;
}

/** Placeholder — does nothing until FCM is integrated in Sprint 4 */
class NoOpNotificationProvider implements NotificationProvider {
  isSupported(): boolean {
    return false;
  }

  subscribe(_parentId: string, _schoolId: string): Promise<void> {
    return Promise.resolve();
  }

  unsubscribe(_parentId: string): Promise<void> {
    return Promise.resolve();
  }

  requestPermission(): Promise<NotificationPermission> {
    return Promise.resolve("default");
  }
}

export const NotificationService: NotificationProvider = new NoOpNotificationProvider();

/**
 * Notification event types that WardBalance will support.
 * These are defined now so the schema is stable when FCM is wired in.
 */
export type NotificationEventType =
  | "invoice_issued"
  | "payment_received"
  | "payment_confirmed"
  | "payment_rejected"
  | "overdue_reminder"
  | "school_announcement";
