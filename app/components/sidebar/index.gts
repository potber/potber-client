import eq from 'ember-truth-helpers/helpers/eq';
import { on } from '@ember/modifier';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import Quickstart from 'potber-client/components/features/quickstart';
import RendererService from 'potber-client/services/renderer';
import SettingsService, {
  SidebarLayout,
} from 'potber-client/services/settings';
import SidebarNav from './nav';
import sidebarCloseGesture from 'potber-client/modifiers/sidebar-close-gesture';
import sidebarEdgeOpenGesture from 'potber-client/modifiers/sidebar-edge-open-gesture';

export default class SidebarComponent extends Component {
  @service declare settings: SettingsService;
  @service declare renderer: RendererService;

  get navVerticalPosition(): 'top' | 'bottom' {
    if (
      (this.settings.sidebarLayout === SidebarLayout.leftBottom ||
        this.settings.sidebarLayout === SidebarLayout.rightBottom) &&
      !this.renderer.isDesktop
    ) {
      return 'bottom';
    }
    return 'top';
  }

  handleSidebarBackdropClick = () => {
    if (this.renderer.isDesktop) {
      return;
    }

    this.renderer.closeSidebar();
  };
  <template>
    <div
      id='sidebar'
      role='navigation'
      {{sidebarEdgeOpenGesture}}
      {{sidebarCloseGesture}}
    >
      <div id='sidebar-gestures-container-inner'>
        {{#if (eq this.navVerticalPosition 'top')}}
          <SidebarNav />
        {{/if}}

        <div id='sidebar-content'>
          <Quickstart @inSidebar={{true}} />
        </div>

        {{#if (eq this.navVerticalPosition 'bottom')}}
          <SidebarNav />
        {{/if}}
      </div>
    </div>
    <div
      id='sidebar-backdrop'
      aria-hidden='true'
      {{sidebarCloseGesture preventScroll=true}}
      {{on 'click' this.handleSidebarBackdropClick}}
    />
  </template>
}
