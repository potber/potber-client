import Component from '@glimmer/component';
import FaIcon from '@fortawesome/ember-fontawesome/components/fa-icon';
import t from 'ember-intl/helpers/t';
import Portal from 'ember-stargate/components/portal';
import ButtonLink from 'potber-client/components/common/button-link';
import NavHeader from '../../../component/header';
import NavTabs from '../../../component/tabs';
import type { NavHeaderTab } from '../../../component/tabs';

interface Signature {
  Args: {
    folder: string;
  };
}

export default class NavRoutesPrivateMessagesListComponent extends Component<Signature> {
  tabs: NavHeaderTab[] = [
    {
      title: 'Eingang',
      route: 'authenticated.private-messages.inbound',
    },
    {
      title: 'Ausgang',
      route: 'authenticated.private-messages.outbound',
    },
    {
      title: 'System',
      route: 'authenticated.private-messages.system',
    },
  ];

  <template>
    <Portal @target='top-nav'>
      <NavHeader
        @title={{t 'route.private-messages.title'}}
        @subtitle={{@folder}}
      />
    </Portal>

    <Portal @target='bottom-nav'>
      <NavTabs @tabs={{this.tabs}} />
      <ButtonLink
        @route='authenticated.private-messages.create'
        @size='square'
        class='nav-element-right'
      >
        <FaIcon @icon='file-pen' />
      </ButtonLink>
    </Portal>
  </template>
}
