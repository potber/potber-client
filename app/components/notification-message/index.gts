import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { service } from '@ember/service';
import { htmlSafe } from '@ember/template';
import Component from '@glimmer/component';
import FaIcon from '@fortawesome/ember-fontawesome/components/fa-icon';
import type { IconName } from '@fortawesome/fontawesome-common-types';
import type NotificationsService from 'potber-client/services/notifications';
import type { NotificationEntry } from 'potber-client/services/notifications';

interface Signature {
  Args: {
    notification: NotificationEntry;
  };
}

export default class NotificationMessageComponent extends Component<Signature> {
  @service declare notifications: NotificationsService;
  declare args: Signature['Args'];

  get clickableClass(): string {
    return this.args.notification.onClick ? 'c-notification--clickable' : '';
  }

  get dismissClass(): string {
    return this.args.notification.dismiss ? '' : 'c-notification--in';
  }

  get notificationClass(): string {
    return [
      'c-notification',
      this.dismissClass,
      this.clickableClass,
      `c-notification--${this.args.notification.type}`,
      this.args.notification.cssClasses,
    ]
      .filter(Boolean)
      .join(' ');
  }

  get icon(): IconName {
    switch (this.args.notification.type) {
      case 'success':
        return 'circle-check';
      case 'warning':
        return 'triangle-exclamation';
      case 'error':
        return 'circle-xmark';
      default:
        return 'circle-info';
    }
  }

  get notificationClearDuration() {
    return htmlSafe(
      [
        `animation-duration: ${this.args.notification.clearDuration}ms`,
        `animation-play-state: ${
          this.args.notification.paused ? 'paused' : 'running'
        }`,
      ].join(';'),
    );
  }

  @action handleOnClick(event: MouseEvent): void {
    event.preventDefault();
    this.args.notification.onClick?.(this.args.notification);
  }

  @action removeNotification(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.notifications.removeNotification(this.args.notification);
  }

  @action handleMouseEnter(): void {
    this.notifications.pauseAutoClear(this.args.notification);
  }

  @action handleMouseLeave(): void {
    this.notifications.resumeAutoClear(this.args.notification);
  }

  <template>
    <div
      class={{this.notificationClass}}
      data-test-notification-message={{@notification.type}}
      {{on 'mouseenter' this.handleMouseEnter}}
      {{on 'mouseleave' this.handleMouseLeave}}
    >
      <div class='c-notification__icon'>
        <FaIcon @icon={{this.icon}} class='c-notification__svg' />
      </div>
      <div class='c-notification__content' {{on 'click' this.handleOnClick}}>
        <span class='c-notification__message'>{{@notification.message}}</span>
        <button
          type='button'
          class='c-notification__close'
          title='Dismiss this notification'
          {{on 'click' this.removeNotification}}
        >
          <FaIcon @icon='xmark' class='c-notification__svg' />
        </button>
      </div>

      {{#if @notification.autoClear}}
        <div
          class='c-notification__countdown'
          style={{this.notificationClearDuration}}
        ></div>
      {{/if}}
    </div>
  </template>
}
