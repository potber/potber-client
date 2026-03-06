import and from 'ember-truth-helpers/helpers/and';
import eq from 'ember-truth-helpers/helpers/eq';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import PortalTarget from 'ember-stargate/components/portal-target';
import SidebarToggle from './sidebar-toggle';
import CustomSession from 'potber-client/services/custom-session';
import NewsfeedService from 'potber-client/services/newsfeed';
import RendererService from 'potber-client/services/renderer';
import SettingsService, {
  SidebarLayout,
} from 'potber-client/services/settings';

export default class NavComponent extends Component {
  @service declare renderer: RendererService;
  @service declare session: CustomSession;
  @service declare newsfeed: NewsfeedService;
  @service declare settings: SettingsService;

  get sidebarToggleVerticalPosition(): 'top' | 'bottom' {
    if (
      (this.settings.sidebarLayout === SidebarLayout.leftBottom ||
        this.settings.sidebarLayout === SidebarLayout.rightBottom) &&
      !this.renderer.isDesktop
    ) {
      return 'bottom';
    }
    return 'top';
  }

  get authenticated() {
    return this.session.isAuthenticated;
  }

  get leftSidebarExpanded() {
    return this.renderer.leftSidebarExpanded;
  }

  get isDesktop() {
    return this.renderer.isDesktop;
  }

  <template>
    <div id='top-nav' class='nav' role='toolbar'>
      {{#if
        (and this.authenticated (eq this.sidebarToggleVerticalPosition 'top'))
      }}
        <SidebarToggle />
      {{/if}}
      <PortalTarget @name='top-nav' class='nav-portal-target' />
      <span class='control-size-square' />
      {{#if this.isDesktop}}
        {{#if
          (and
            this.authenticated (eq this.sidebarToggleVerticalPosition 'bottom')
          )
        }}
          <SidebarToggle />
        {{/if}}
        <PortalTarget @name='bottom-nav' class='nav-portal-target' />
      {{/if}}
    </div>

    {{#unless this.isDesktop}}
      <div id='bottom-nav' class='nav' role='toolbar'>
        {{#if
          (and
            this.authenticated (eq this.sidebarToggleVerticalPosition 'bottom')
          )
        }}
          <SidebarToggle />
        {{/if}}
        <PortalTarget @name='bottom-nav' class='nav-portal-target' />
      </div>
    {{/unless}}
  </template>
}
