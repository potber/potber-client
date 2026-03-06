import Component from '@glimmer/component';
import FaIcon from '@fortawesome/ember-fontawesome/components/fa-icon';
import ControlLink from 'potber-client/components/common/control/link';
import { PrivateMessage } from 'potber-client/services/api/models/private-message';
import { createPrivateMessageSubtitle } from 'potber-client/utils/private-messages';

interface Signature {
  Args: {
    message: PrivateMessage;
  };
}

export default class PrivateMessageListItemComponent extends Component<Signature> {
  get subtitle() {
    return createPrivateMessageSubtitle(this.args.message);
  }

  <template>
    <div
      class='private-messages-list-item
        {{if @message.unread " private-messages-list-item-unread"}}'
    >
      <ControlLink
        class='private-messages-list-item-link'
        @route='authenticated.private-messages.view'
        @model={{@message.id}}
      >
        {{#if @message.unread}}
          <FaIcon @icon='envelope' class='private-message-unread-indicator' />
        {{/if}}
        {{#if @message.important}}
          <FaIcon
            @icon='circle-exclamation'
            class='private-message-important-indicator'
          />
        {{/if}}
        <div class='private-messages-list-item-title'>
          <p class='title'>{{@message.title}}</p>
          <p class='subtitle'>{{this.subtitle}}</p>
        </div>
      </ControlLink>
    </div>
  </template>
}
