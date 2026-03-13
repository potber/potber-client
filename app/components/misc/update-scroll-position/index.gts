import didInsert from '@ember/render-modifiers/modifiers/did-insert';
import { guidFor } from '@ember/object/internals';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import RendererService from 'potber-client/services/renderer';
import SettingsService from 'potber-client/services/settings';
import { next } from '@ember/runloop';
import { getAnchorId, getThreadScrollTarget } from 'potber-client/utils/misc';
import RouterService from '@ember/routing/router-service';

interface Signature {
  Element: HTMLSpanElement;
}

const ANCHOR_RESET_EVENTS = ['keydown', 'pointerdown', 'touchstart', 'wheel'];

export default class UpdateScrollPositionComponent extends Component<Signature> {
  @service declare renderer: RendererService;
  @service declare router: RouterService;
  @service declare settings: SettingsService;

  elementId = guidFor(this);
  private resizeObserver?: ResizeObserver;
  private resizeFrame?: number;
  private scrollAnchorElement: HTMLElement | null = null;
  private scrollAnchorTop: number | null = null;
  private cancelStabilizationListeners: Array<() => void> = [];

  willDestroy() {
    super.willDestroy();
    this.teardownScrollStabilization();
  }

  private registerScrollStabilizationResetEvents = () => {
    for (const eventName of ANCHOR_RESET_EVENTS) {
      const listener = () => this.teardownScrollStabilization();
      window.addEventListener(eventName, listener, { passive: true });
      this.cancelStabilizationListeners.push(() =>
        window.removeEventListener(eventName, listener),
      );
    }
  };

  private stabilizeScrollAnchor = () => {
    if (!this.scrollAnchorElement || this.scrollAnchorTop === null) return;

    const currentTop = this.scrollAnchorElement.getBoundingClientRect().top;
    const delta = currentTop - this.scrollAnchorTop;

    if (Math.abs(delta) < 1) return;

    window.scrollBy({ top: delta, behavior: 'auto' });
    this.scrollAnchorTop = this.scrollAnchorElement.getBoundingClientRect().top;
  };

  private setupScrollStabilization = (
    container: HTMLElement,
    anchorElement: HTMLElement,
  ) => {
    this.teardownScrollStabilization();

    if (typeof ResizeObserver === 'undefined') return;

    this.scrollAnchorElement = anchorElement;
    this.scrollAnchorTop = anchorElement.getBoundingClientRect().top;

    this.resizeObserver = new ResizeObserver(() => {
      if (typeof this.resizeFrame === 'number') return;

      this.resizeFrame = requestAnimationFrame(() => {
        this.resizeFrame = undefined;
        this.stabilizeScrollAnchor();
      });
    });
    this.resizeObserver.observe(container);
    this.registerScrollStabilizationResetEvents();
  };

  private teardownScrollStabilization = () => {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;

    if (typeof this.resizeFrame === 'number') {
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = undefined;
    }

    this.scrollAnchorElement = null;
    this.scrollAnchorTop = null;

    for (const removeListener of this.cancelStabilizationListeners) {
      removeListener();
    }
    this.cancelStabilizationListeners = [];
  };

  updateScrollPosition = async (element: HTMLSpanElement) => {
    // Schedule the scroll for the next run loop to make sure the page has already rendered
    next(this, function () {
      const threadPageContainer = (element.closest('.thread-page') ??
        document.body) as HTMLElement;
      const target = getThreadScrollTarget({
        search: window.location.search,
        hash: window.location.hash,
        currentRouteName: this.router.currentRouteName,
        goToBottomOfThreadPage: this.settings.getSetting(
          'goToBottomOfThreadPage',
        ),
      });
      const threadAnchorElement =
        target.type === 'post'
          ? document.getElementById(getAnchorId(target.postId))
          : null;

      if (threadAnchorElement) {
        // If a PID or supported thread hash has been provided and we're on /thread,
        // we need to scroll to the corresponding post.
        this.renderer.scrollToElement(threadAnchorElement, {
          behavior: 'auto',
        });
        this.setupScrollStabilization(threadPageContainer, threadAnchorElement);
      } else if (target.type === 'bottom') {
        // If 'scrollToBottom' to bottom has been provided, scroll to bottom
        this.renderer.trySetScrollPosition({
          top: document.body.scrollHeight,
          behavior: 'auto',
        });
        this.setupScrollStabilization(threadPageContainer, element);
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
      aria-hidden='true'
      style='display: block; height: 0; pointer-events: none;'
      {{didInsert this.updateScrollPosition}}
    />
  </template>
}
