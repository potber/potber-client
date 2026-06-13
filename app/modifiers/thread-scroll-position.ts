import RouterService from '@ember/routing/router-service';
import { service } from '@ember/service';
import Modifier from 'ember-modifier';
import RendererService from 'potber-client/services/renderer';
import SettingsService from 'potber-client/services/settings';
import { getAnchorId, getThreadScrollTarget } from 'potber-client/utils/misc';

const ANCHOR_RESET_EVENTS = ['keydown', 'pointerdown', 'touchstart', 'wheel'];

interface ThreadScrollPositionSignature {
  Element: HTMLSpanElement;
  Args: {
    Named: Record<string, never>;
    Positional: [];
  };
}

export default class ThreadScrollPositionModifier extends Modifier<ThreadScrollPositionSignature> {
  @service declare renderer: RendererService;
  @service declare router: RouterService;
  @service declare settings: SettingsService;

  private resizeObserver?: ResizeObserver;
  private resizeFrame?: number;
  private setupFrame?: number;
  private scrollAnchorElement: HTMLElement | null = null;
  private scrollAnchorTop: number | null = null;
  private removeResetListeners: Array<() => void> = [];

  modify(element: ThreadScrollPositionSignature['Element']) {
    this.cleanup();

    this.setupFrame = requestAnimationFrame(() => {
      this.setupFrame = undefined;
      this.updateScrollPosition(element);
    });

    return () => {
      this.cleanup();
    };
  }

  private addScrollStabilizationResetListeners() {
    for (const eventName of ANCHOR_RESET_EVENTS) {
      const listener = () => {
        this.cleanup();
      };

      window.addEventListener(eventName, listener, { passive: true });

      this.removeResetListeners.push(() => {
        window.removeEventListener(eventName, listener);
      });
    }
  }

  private stabilizeScrollAnchor() {
    if (!this.scrollAnchorElement || this.scrollAnchorTop === null) {
      return;
    }

    const currentTop = this.scrollAnchorElement.getBoundingClientRect().top;
    const delta = currentTop - this.scrollAnchorTop;

    if (Math.abs(delta) < 1) {
      return;
    }

    window.scrollBy({ top: delta, behavior: 'auto' });

    this.scrollAnchorTop = this.scrollAnchorElement.getBoundingClientRect().top;
  }

  private setupScrollStabilization(
    container: HTMLElement,
    anchorElement: HTMLElement,
  ) {
    this.cleanup();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this.scrollAnchorElement = anchorElement;
    this.scrollAnchorTop = anchorElement.getBoundingClientRect().top;

    this.resizeObserver = new ResizeObserver(() => {
      if (typeof this.resizeFrame === 'number') {
        return;
      }

      this.resizeFrame = requestAnimationFrame(() => {
        this.resizeFrame = undefined;
        this.stabilizeScrollAnchor();
      });
    });

    this.resizeObserver.observe(container);
    this.addScrollStabilizationResetListeners();
  }

  private cleanup() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;

    if (typeof this.resizeFrame === 'number') {
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = undefined;
    }

    if (typeof this.setupFrame === 'number') {
      cancelAnimationFrame(this.setupFrame);
      this.setupFrame = undefined;
    }

    this.scrollAnchorElement = null;
    this.scrollAnchorTop = null;

    for (const removeListener of this.removeResetListeners) {
      removeListener();
    }

    this.removeResetListeners = [];
  }

  private getLastThreadPost(container: HTMLElement) {
    const posts = container.querySelectorAll<HTMLElement>('.post');

    return posts.item(posts.length - 1) ?? null;
  }

  private updateScrollPosition(
    element: ThreadScrollPositionSignature['Element'],
  ) {
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

    const lastThreadPostElement =
      target.type === 'bottom'
        ? this.getLastThreadPost(threadPageContainer)
        : null;

    if (threadAnchorElement) {
      this.renderer.scrollToElement(threadAnchorElement, {
        behavior: 'auto',
      });

      this.setupScrollStabilization(threadPageContainer, threadAnchorElement);
      return;
    }

    if (target.type === 'bottom') {
      if (lastThreadPostElement) {
        this.renderer.scrollToElement(lastThreadPostElement, {
          behavior: 'auto',
        });
      }

      this.setupScrollStabilization(
        threadPageContainer,
        lastThreadPostElement ?? element,
      );

      return;
    }

    this.renderer.trySetScrollPosition({
      behavior: 'auto',
    });
  }
}
