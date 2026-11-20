import type { TOC } from '@ember/component/template-only';
import Portal from 'ember-stargate/components/portal';
import NavHeader from 'potber-client/components/nav/component/header';

const NavBoardOverview: TOC<Record<string, never>> = <template>
  <Portal @target='top-nav'>
    <NavHeader @title='Forenübersicht' />
  </Portal>
</template>;

export default NavBoardOverview;
