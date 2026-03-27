import Component from '@glimmer/component';
import type { Message } from 'potber-client/services/messages';
import FaIcon from '@fortawesome/ember-fontawesome/components/fa-icon';
import { formatDateTime } from 'potber-client/utils/date';

interface Signature {
  Args: {
    message: Message;
  };
}
export default class MessageItemComponent extends Component<Signature> {
  declare args: Signature['Args'];

  get icon() {
    switch (this.args.message.type) {
      case 'success':
        return 'circle-check';
      case 'warning':
        return 'triangle-exclamation';
      case 'error':
        return 'circle-exclamation';
      default:
        return 'circle-info';
    }
  }

  get date() {
    return formatDateTime(this.args.message.date);
  }

  <template>
    <div class='message-item bg-{{@message.type}}'>
      <p class='subtitle'><FaIcon @icon={{this.icon}} />[{{@message.context}}]
        {{this.date}}</p>
      <p>{{@message.text}}</p>
    </div>
  </template>
}
