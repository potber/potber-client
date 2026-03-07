import { htmlSafe } from '@ember/template';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import NotificationMessage from 'potber-client/components/notification-message';
import type NotificationsService from 'potber-client/services/notifications';
import './styles.css';

type NotificationPosition =
  | 'top'
  | 'top-left'
  | 'top-right'
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right';

interface Signature {
  Args: {
    position?: NotificationPosition;
    zindex?: string | number;
  };
}

export default class NotificationContainerComponent extends Component<Signature> {
  @service declare notifications: NotificationsService;
  declare args: Signature['Args'];

  get position(): NotificationPosition {
    return this.args.position ?? 'top';
  }

  get positionClass(): string {
    return `ember-cli-notifications-notification__container--${this.position}`;
  }

  get inlineStyle() {
    return htmlSafe(`z-index: ${this.args.zindex ?? '1060'};`);
  }

  <template>
    <div
      class='ember-cli-notifications-notification__container
        {{this.positionClass}}'
      style={{this.inlineStyle}}
      data-test-notification-container={{this.position}}
    >
      {{#each this.notifications.content as |notification|}}
        <NotificationMessage @notification={{notification}} />
      {{/each}}
    </div>
  </template>
}
