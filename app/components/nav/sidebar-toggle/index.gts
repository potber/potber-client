import { action } from '@ember/object';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import Button from 'potber-client/components/common/control/button';
import NewsfeedIndicator from 'potber-client/components/features/quickstart/newsfeed/indicator';
import RendererService from 'potber-client/services/renderer';
import SettingsService, {
  SidebarLayout,
} from 'potber-client/services/settings';

export default class SidebarToggleComponent extends Component {
  @service declare renderer: RendererService;
  @service declare settings: SettingsService;

  get sidebarCollapseIcon() {
    if (
      this.settings.sidebarLayout === SidebarLayout.rightTop ||
      this.settings.sidebarLayout === SidebarLayout.rightBottom
    ) {
      return 'chevron-right';
    }
    return 'chevron-left';
  }

  @action toggleSidebar() {
    this.renderer.toggleSidebar();
  }

  <template>
    <Button
      class='sidebar-toggle'
      @icon={{if this.renderer.sidebarExpanded this.sidebarCollapseIcon 'bars'}}
      @text='Navigation'
      @size='square'
      @variant='primary-transparent'
      @iconSize='large'
      @onClick={{this.toggleSidebar}}
    >
      <NewsfeedIndicator />
    </Button>
  </template>
}
