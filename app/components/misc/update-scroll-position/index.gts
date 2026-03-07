import didInsert from '@ember/render-modifiers/modifiers/did-insert';
import { guidFor } from '@ember/object/internals';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import RendererService from 'potber-client/services/renderer';
import SettingsService from 'potber-client/services/settings';
import { next } from '@ember/runloop';
import { getAnchorId, getPostIdFromHash } from 'potber-client/utils/misc';

export default class UpdateScrollPositionComponent extends Component {
  @service declare renderer: RendererService;
  @service declare router: any;
  @service declare settings: SettingsService;

  elementId = guidFor(this);

  updateScrollPosition = async () => {
    // Schedule the scroll for the next run loop to make sure the page has already rendered
    next(this, function () {
      // Read URL parameters
      const params = new URLSearchParams(window.location.search);
      const postId =
        params.get('PID') ?? getPostIdFromHash(window.location.hash);

      if (postId && this.router.currentRouteName === 'authenticated.thread') {
        // If a PID or supported thread hash has been provided and we're on /thread,
        // we need to scroll to the corresponding post.
        this.renderer.scrollToElement(getAnchorId(postId));
      } else if (
        params.has('scrollToBottom') &&
        this.settings.getSetting('goToBottomOfThreadPage')
      ) {
        // If 'scrollToBottom' to bottom has been provided, scroll to bottom
        this.renderer.trySetScrollPosition({
          top: document.body.scrollHeight,
          behavior: 'auto',
        });
      } else {
        // By default, scroll to top
        this.renderer.trySetScrollPosition({
          behavior: 'auto',
        });
      }
    });
  };

  <template>
    <span
      id={{this.elementId}}
      class='hidden'
      {{didInsert this.updateScrollPosition}}
    />
  </template>
}
