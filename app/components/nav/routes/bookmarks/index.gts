import Component from '@glimmer/component';
import Portal from 'ember-stargate/components/portal';
import NavHeader from '../../component/header';
import NavTabs from '../../component/tabs';
import type { NavHeaderTab } from '../../component/tabs';

interface Signature {
  Args: {
    tab: string;
  };
}

export default class NavRoutesBookmarksComponent extends Component<Signature> {
  tabs: NavHeaderTab[] = [
    {
      title: 'Lesezeichen',
      route: 'authenticated.bookmarks.threads',
    },
    {
      title: 'Gespeicherte Posts',
      route: 'authenticated.bookmarks.saved-posts',
    },
  ];

  <template>
    <Portal @target='top-nav'>
      <NavHeader @title={{@tab}} />
    </Portal>

    <Portal @target='bottom-nav'>
      <NavTabs @tabs={{this.tabs}} />
    </Portal>
  </template>
}
