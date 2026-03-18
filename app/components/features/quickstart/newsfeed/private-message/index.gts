import { action } from '@ember/object';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import FaIcon from '@fortawesome/ember-fontawesome/components/fa-icon';
import ControlLink from 'potber-client/components/common/control/link';
import { PrivateMessage } from 'potber-client/services/api/models/private-message';
import ModalService from 'potber-client/services/modal';
import RendererService from 'potber-client/services/renderer';

interface Signature {
  Args: {
    privateMessage: PrivateMessage;
    inSidebar: boolean;
  };
}

export default class QuickstartNewsfeedPrivateMessageComponent extends Component<Signature> {
  @service declare renderer: RendererService;
  @service declare modal: ModalService;
  declare args: Signature['Args'];

  get subtitle() {
    return `${this.args.privateMessage.sender?.name}`;
  }

  @action handleLinkClick() {
    if (this.args.inSidebar && !this.renderer.isDesktop) {
      this.renderer.closeSidebar();
    }
  }

  <template>
    <div class='quickstart-item'>
      <ControlLink
        class='flex-row align-items-center justify-content-start'
        @size='max'
        @variant='primary'
        @route='authenticated.private-messages.view'
        @model={{@privateMessage.id}}
        @onClick={{this.handleLinkClick}}
      >
        <FaIcon @icon='envelope' class='fg-text-subtle' />
        <div class='text-start'>
          <p class='title max-lines-2'> {{@privateMessage.title}}</p>
          <p class='subtitle'>{{this.subtitle}}</p>
        </div>
      </ControlLink>
    </div>
  </template>
}
