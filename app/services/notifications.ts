import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { cancel, later } from '@ember/runloop';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationOptions {
  autoClear?: boolean;
  clearDuration?: number;
  onClick?: (notification: NotificationEntry) => void;
  cssClasses?: string;
}

export interface AddNotificationOptions extends NotificationOptions {
  message: string;
  type?: NotificationType;
}

let nextNotificationId = 0;

export class NotificationEntry {
  readonly id = ++nextNotificationId;
  readonly message: string;
  readonly type: NotificationType;
  readonly autoClear: boolean;
  readonly clearDuration: number;
  readonly onClick?: (notification: NotificationEntry) => void;
  readonly cssClasses?: string;

  @tracked dismiss = false;
  @tracked paused = false;
  @tracked remaining: number;

  startTime = 0;
  timer: ReturnType<typeof later> | null = null;

  constructor(options: AddNotificationOptions) {
    this.message = options.message;
    this.type = options.type ?? 'info';
    this.autoClear = options.autoClear ?? false;
    this.clearDuration = options.clearDuration ?? 3200;
    this.onClick = options.onClick;
    this.cssClasses = options.cssClasses;
    this.remaining = this.clearDuration;
  }
}

export default class NotificationsService extends Service {
  @tracked content: NotificationEntry[] = [];

  defaultAutoClear = false;
  defaultClearDuration = 3200;

  addNotification(options: AddNotificationOptions): NotificationEntry {
    if (!options.message) {
      throw new Error('No notification message set');
    }

    const notification = new NotificationEntry({
      ...options,
      autoClear: options.autoClear ?? this.defaultAutoClear,
      clearDuration: options.clearDuration ?? this.defaultClearDuration,
    });

    this.content = [...this.content, notification];

    if (notification.autoClear) {
      this.setupAutoClear(notification);
    }

    return notification;
  }

  error(message: string, options?: NotificationOptions): NotificationEntry {
    return this.addNotification({
      ...options,
      message,
      type: 'error',
    });
  }

  success(message: string, options?: NotificationOptions): NotificationEntry {
    return this.addNotification({
      ...options,
      message,
      type: 'success',
    });
  }

  info(message: string, options?: NotificationOptions): NotificationEntry {
    return this.addNotification({
      ...options,
      message,
      type: 'info',
    });
  }

  warning(message: string, options?: NotificationOptions): NotificationEntry {
    return this.addNotification({
      ...options,
      message,
      type: 'warning',
    });
  }

  removeNotification(notification?: NotificationEntry): void {
    if (
      !notification ||
      notification.dismiss ||
      !this.content.includes(notification)
    ) {
      return;
    }

    this.cancelTimer(notification);
    notification.dismiss = true;

    later(
      this,
      () => {
        this.content = this.content.filter((entry) => entry !== notification);
      },
      500,
    );
  }

  setupAutoClear(notification: NotificationEntry): void {
    if (!notification.autoClear) {
      return;
    }

    this.cancelTimer(notification);
    notification.startTime = Date.now();
    notification.timer = later(
      this,
      () => {
        if (this.content.includes(notification)) {
          this.removeNotification(notification);
        }
      },
      notification.remaining,
    );
  }

  pauseAutoClear(notification: NotificationEntry): void {
    if (!notification.autoClear || !notification.timer) {
      return;
    }

    cancel(notification.timer);
    notification.timer = null;
    notification.paused = true;

    const elapsed = Date.now() - notification.startTime;
    notification.remaining = Math.max(notification.clearDuration - elapsed, 0);
  }

  resumeAutoClear(notification: NotificationEntry): void {
    if (!notification.autoClear) {
      return;
    }

    notification.paused = false;

    if (notification.remaining <= 0) {
      this.removeNotification(notification);
      return;
    }

    this.setupAutoClear(notification);
  }

  clearAll(): this {
    this.content.forEach((notification) => {
      this.removeNotification(notification);
    });

    return this;
  }

  setDefaultAutoClear(autoClear: boolean): void {
    this.defaultAutoClear = autoClear;
  }

  setDefaultClearDuration(clearDuration: number): void {
    this.defaultClearDuration = clearDuration;
  }

  private cancelTimer(notification: NotificationEntry): void {
    if (!notification.timer) {
      return;
    }

    cancel(notification.timer);
    notification.timer = null;
  }
}
