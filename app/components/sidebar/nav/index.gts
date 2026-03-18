import { action } from '@ember/object';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import FaIcon from '@fortawesome/ember-fontawesome/components/fa-icon';
import ControlLink from 'potber-client/components/common/control/link';
import CustomSession from 'potber-client/services/custom-session';
import RendererService from 'potber-client/services/renderer';
import SettingsService, { LandingPage } from 'potber-client/services/settings';

export default class SidebarNavComponent extends Component {
  @service declare renderer: RendererService;
  @service declare session: CustomSession;
  @service declare settings: SettingsService;

  @action handleNavLinkClick() {
    if (this.renderer.isDesktop) return;
    this.renderer.closeSidebar();
  }

  get showBoardOverviewButton() {
    return (
      this.settings.getSetting('landingPage') !== LandingPage.boardOverview
    );
  }

  get authenticated() {
    return this.session.isAuthenticated;
  }

  <template>
    <div id='sidebar-nav'>
      <ControlLink
        @route='authenticated.home'
        @iconSize='medium'
        @onClick={{this.handleNavLinkClick}}
      >
        <FaIcon @icon='house' />
      </ControlLink>
      {{#if this.showBoardOverviewButton}}
        <ControlLink
          @route='authenticated.board-overview'
          @iconSize='medium'
          @onClick={{this.handleNavLinkClick}}
        >
          <FaIcon @icon='bars-staggered' />
        </ControlLink>
      {{/if}}
      {{#if this.authenticated}}
        <ControlLink
          @route='authenticated.private-messages.inbound'
          @iconSize='medium'
          @onClick={{this.handleNavLinkClick}}
        >
          <FaIcon @icon='envelope' />
        </ControlLink>
        <ControlLink
          @route='authenticated.bookmarks.threads'
          @iconSize='medium'
          @onClick={{this.handleNavLinkClick}}
        >
          <FaIcon @icon='bookmark' />
        </ControlLink>
      {{/if}}
      <ControlLink
        @route='authenticated.settings'
        @iconSize='medium'
        @onClick={{this.handleNavLinkClick}}
      >
        <FaIcon @icon='gear' />
      </ControlLink>
    </div>
  </template>
}
