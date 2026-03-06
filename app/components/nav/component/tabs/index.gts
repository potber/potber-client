import type { TOC } from '@ember/component/template-only';
import ButtonLink from 'potber-client/components/common/button-link';

export interface NavHeaderTab {
  title: string;
  route: string;
}

const NavTabs: TOC<{
  Args: { tabs: NavHeaderTab[] };
}> = <template>
  <div class='nav-tabs'>
    {{#each @tabs as |tab|}}
      <ButtonLink @route={{tab.route}}>
        {{tab.title}}
      </ButtonLink>
    {{/each}}
  </div>
</template>;

export default NavTabs;
