import RouterService from '@ember/routing/router-service';
import { service } from '@ember/service';
import Modifier from 'ember-modifier';
import RendererService from 'potber-client/services/renderer';
import SettingsService from 'potber-client/services/settings';
import { getAnchorId, getThreadScrollTarget } from 'potber-client/utils/misc';

const ANCHOR_RESET_EVENTS = ['keydown', 'pointerdown', 'touchstart', 'wheel'];
const MAX_SCROLL_CORRECTION_ATTEMPTS = 4;
const MEDIA_READY_EVENTS = ['load', 'loadedmetadata', 'loadeddata'];
const SCROLL_POSITION_TOLERANCE = 1;

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
  private mutationObserver?: MutationObserver;
  private resizeFrame?: number;
  private setupFrame?: number;
  private mediaContainer?: HTMLElement;
  private scrollAnchorElement: HTMLElement | null = null;
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

  private getScrollAnchorTop() {
    return document.getElementById('top-nav')?.clientHeight ?? 0;
  }

  private handleMediaReady = (event: Event) => {
    const target = event.target;
    if (
      target instanceof HTMLImageElement ||
      target instanceof HTMLVideoElement ||
      target instanceof HTMLIFrameElement
    ) {
      this.scheduleScrollStabilization();
    }
  };

  private addMediaReadyListeners(container: HTMLElement) {
    this.mediaContainer = container;
    for (const eventName of MEDIA_READY_EVENTS) {
      container.addEventListener(eventName, this.handleMediaReady, true);
    }
  }

  private removeMediaReadyListeners() {
    if (!this.mediaContainer) {
      return;
    }

    for (const eventName of MEDIA_READY_EVENTS) {
      this.mediaContainer.removeEventListener(
        eventName,
        this.handleMediaReady,
        true,
      );
    }
    this.mediaContainer = undefined;
  }

  private scheduleScrollStabilization(attempt = 0) {
    if (!this.scrollAnchorElement || typeof this.resizeFrame === 'number') {
      return;
    }

    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = undefined;
      this.stabilizeScrollAnchor(attempt);
    });
  }

  private stabilizeScrollAnchor(attempt: number) {
    if (!this.scrollAnchorElement) {
      return;
    }

    const currentTop = this.scrollAnchorElement.getBoundingClientRect().top;
    const delta = currentTop - this.getScrollAnchorTop();

    if (Math.abs(delta) < SCROLL_POSITION_TOLERANCE) {
      return;
    }

    window.scrollBy({ top: delta, behavior: 'auto' });

    if (attempt < MAX_SCROLL_CORRECTION_ATTEMPTS) {
      this.scheduleScrollStabilization(attempt + 1);
    }
  }

  private setupScrollStabilization(
    container: HTMLElement,
    anchorElement: HTMLElement,
  ) {
    this.cleanup();

    this.scrollAnchorElement = anchorElement;

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.scheduleScrollStabilization();
      });

      this.resizeObserver.observe(container);
      const topNav = document.getElementById('top-nav');
      if (topNav) {
        this.resizeObserver.observe(topNav);
      }
    }

    this.addScrollStabilizationResetListeners();
    this.addMediaReadyListeners(container);
    this.scheduleScrollStabilization();
  }

  private focusPostWhenReady(container: HTMLElement, postId: string) {
    const focusPost = () => {
      const anchorElement = document.getElementById(getAnchorId(postId));
      if (!anchorElement) {
        return false;
      }

      this.mutationObserver?.disconnect();
      this.mutationObserver = undefined;

      const didScroll = this.renderer.scrollToElement(anchorElement, {
        behavior: 'auto',
      });

      if (didScroll) {
        this.setupScrollStabilization(container, anchorElement);
      }

      return true;
    };

    if (focusPost() || typeof MutationObserver === 'undefined') {
      return;
    }

    this.mutationObserver = new MutationObserver(() => {
      focusPost();
    });
    this.mutationObserver.observe(container, {
      childList: true,
      subtree: true,
    });
    this.addScrollStabilizationResetListeners();
  }

  private cleanup() {
    this.removeMediaReadyListeners();

    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;

    this.mutationObserver?.disconnect();
    this.mutationObserver = undefined;

    if (typeof this.resizeFrame === 'number') {
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = undefined;
    }

    if (typeof this.setupFrame === 'number') {
      cancelAnimationFrame(this.setupFrame);
      this.setupFrame = undefined;
    }

    this.scrollAnchorElement = null;

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

    const lastThreadPostElement =
      target.type === 'bottom'
        ? this.getLastThreadPost(threadPageContainer)
        : null;

    if (target.type === 'post') {
      this.focusPostWhenReady(threadPageContainer, target.postId);
      return;
    }

    if (target.type === 'bottom') {
      if (lastThreadPostElement) {
        const didScroll = this.renderer.scrollToElement(lastThreadPostElement, {
          behavior: 'auto',
        });

        if (didScroll) {
          this.setupScrollStabilization(
            threadPageContainer,
            lastThreadPostElement,
          );
        }
      }

      return;
    }

    this.renderer.trySetScrollPosition({
      behavior: 'auto',
    });
  }
}
