import Service, { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { sleep } from 'potber-client/utils/misc';
import MessagesService from './messages';
import SettingsService, { SidebarLayout, Theme } from './settings';
import NewsfeedService from './newsfeed';
import { next } from '@ember/runloop';

const LOADING_INDICATOR_DELAY = 500;
const DESKTOP_MIN_WIDTH = 1200;

export interface ScrollToElementOptions {
  highlight?: boolean;
  behavior?: ScrollBehavior;
}

export default class RendererService extends Service {
  @service declare settings: SettingsService;
  @service declare messages: MessagesService;
  @service declare newsfeed: NewsfeedService;
  @tracked sidebarExpanded = false;
  @tracked isDesktop = false;
  private rootStyle = document.documentElement.style;
  private computedStyle = getComputedStyle(document.documentElement);

  preventScrollReset = false;

  private setSidebarShellOffset = (width: string) => {
    if (this.isDesktop) {
      this.setStyleVariable('--sidebar-shell-offset', '0px');
      this.setStyleVariable('--sidebar-inner-offset', '0px');
      return;
    }

    const value =
      this.settings.isRightSidebar() && width !== '0px'
        ? `calc(-1 * ${width})`
        : width;
    this.setStyleVariable('--sidebar-shell-offset', value);

    const innerOffset = this.settings.isRightSidebar()
      ? '0px'
      : `calc(${width} - var(--sidebar-expanded-width))`;
    this.setStyleVariable('--sidebar-inner-offset', innerOffset);
  };

  private setSidebarDragging = (dragging: boolean) => {
    document.documentElement.toggleAttribute('data-sidebar-dragging', dragging);
  };

  /**
   * Initializes the service.
   */
  initialize = () => {
    this.updateTheme();
    this.updateFontSize();
    this.updateSidebarLayout();
    addEventListener('resize', this.updateIsDesktop);
    this.updateIsDesktop();
  };

  /**
   * Gets a specific variable on the root style and returns its value.
   */
  getStyleVariable = (key: string) => {
    return this.computedStyle.getPropertyValue(key).trim();
  };

  /**
   * Sets a specific variable on the root style.
   */
  setStyleVariable = (key: string, value: string) => {
    return this.rootStyle.setProperty(key, value);
  };

  /**
   * Handles window resize events and updates renderer.isDesktop.
   */
  updateIsDesktop = () => {
    const wasDesktop = this.isDesktop;
    const isDesktop = window.innerWidth >= DESKTOP_MIN_WIDTH;

    this.isDesktop = isDesktop;

    if (isDesktop && !wasDesktop && !this.sidebarExpanded) {
      this.sidebarExpanded = true;
    }

    if (isDesktop !== wasDesktop) {
      this.updateSidebar();
    }
  };

  /**
   * Updates the current theme.
   */
  updateTheme = () => {
    const theme = this.settings.getSetting('theme');
    document.documentElement.setAttribute('data-theme', `${Theme[theme]}`);
    const metaThemeColor = document.querySelector("meta[name='theme-color']");
    const metaAppleStatusBarStyle = document.querySelector(
      "meta[name='apple-mobile-web-app-status-bar-style']",
    );
    const themeColor = this.getStyleVariable('--color-nav');
    if (metaThemeColor && themeColor) {
      metaThemeColor.setAttribute('content', themeColor);
    }
    if (metaAppleStatusBarStyle && themeColor) {
      metaAppleStatusBarStyle.setAttribute('content', themeColor);
    }
  };

  /**
   * Updates the sidebar layout. Affects whether the sidebar is rendered on the left
   * or right side as well as the position of the sidebar toggle button.
   */
  updateSidebarLayout = () => {
    switch (this.settings.sidebarLayout) {
      case SidebarLayout.rightBottom:
        this.setStyleVariable('--sidebar-left', 'unset');
        this.setStyleVariable('--sidebar-right', '0px');
        this.setStyleVariable('--bottom-nav-left-gap', '0px');
        this.setStyleVariable(
          '--bottom-nav-right-gap',
          'var(--control-default-height)',
        );
        break;
      case SidebarLayout.rightTop:
        this.setStyleVariable('--sidebar-left', 'unset');
        this.setStyleVariable('--sidebar-right', '0px');
        this.setStyleVariable('--bottom-nav-left-gap', '0px');
        this.setStyleVariable('--bottom-nav-right-gap', '0px');
        break;
      case SidebarLayout.leftBottom:
        this.setStyleVariable('--sidebar-left', '0px');
        this.setStyleVariable('--sidebar-right', 'unset');
        this.setStyleVariable(
          '--bottom-nav-left-gap',
          'var(--control-default-height)',
        );
        this.setStyleVariable('--bottom-nav-right-gap', '0px');
        break;
      default:
        this.setStyleVariable('--sidebar-left', '0px');
        this.setStyleVariable('--sidebar-right', 'unset');
        this.setStyleVariable('--bottom-nav-left-gap', '0px');
        this.setStyleVariable('--bottom-nav-right-gap', '0px');
    }
  };

  /**
   * Creates a ripple animation on the event target.
   * @param event The event.
   */
  createClickRipple = async (event: Event) => {
    // Clean up existing ripples
    const existingRipples = document.body.getElementsByClassName(
      'click-ripple-container',
    );
    for (const ripple of existingRipples) {
      ripple.remove();
    }
    // Create new ripple
    const control = event.currentTarget as HTMLElement;
    if (control) {
      const rippleContainer = document.createElement('span');
      rippleContainer.classList.add('click-ripple-container');
      const ripple = document.createElement('span');
      const diameter = Math.max(control.clientWidth, control.clientHeight);
      ripple.style.width = ripple.style.height = `${diameter}px`;
      ripple.classList.add('click-ripple');
      rippleContainer.appendChild(ripple);
      control.appendChild(rippleContainer);
    }
  };

  /**
   * Toggles the sidebar.
   * @param expanded (optional) Whether the sidebar should be expanded. Will choose the opposite of the current state
   * if not provided.
   */
  toggleSidebar = async () => {
    if (this.sidebarExpanded) {
      this.closeSidebar();
    } else {
      await this.openSidebar();
    }
  };

  openSidebar = async () => {
    if (this.sidebarExpanded) {
      return;
    }

    this.sidebarExpanded = true;
    this.updateSidebar();
    if (this.settings.getSetting('autoRefreshSidebar')) {
      await this.newsfeed.refresh();
    }
  };

  closeSidebar = () => {
    this.sidebarExpanded = false;
    this.updateSidebar();
  };

  /**
   * Drags the sidebar according to the current touch move position.
   * @param touchMoveX Current touch move position on x axis.
   * @param visiblePortion The currently visible share of the sidebar between 0 and 1.
   */
  dragSidebar = (touchMoveX: number, visiblePortion: number) => {
    this.setSidebarDragging(true);
    this.setStyleVariable('--sidebar-width', `${touchMoveX}px`);
    this.setSidebarShellOffset(`${touchMoveX}px`);
    this.setStyleVariable(
      '--sidebar-backdrop-opacity',
      visiblePortion.toString(),
    );
    this.setStyleVariable('--nav-controls-opacity', '0');
  };

  /*
   * Updates the state of the sidebar.
   */
  private updateSidebar = () => {
    this.setSidebarDragging(false);

    if (this.sidebarExpanded) {
      this.setStyleVariable('--sidebar-width', 'var(--sidebar-expanded-width)');
      this.setSidebarShellOffset('var(--sidebar-expanded-width)');
      this.setStyleVariable('--sidebar-backdrop-opacity', '1');
      this.setStyleVariable('--sidebar-backdrop-pointer-events', 'all');
      this.setStyleVariable('--nav-controls-pointer-events', 'none');
      this.setStyleVariable('--nav-controls-opacity', '0');
    } else {
      this.setStyleVariable('--sidebar-width', '0px');
      this.setSidebarShellOffset('0px');
      this.setStyleVariable('--sidebar-backdrop-opacity', '0');
      this.setStyleVariable('--sidebar-backdrop-pointer-events', 'none');
      this.setStyleVariable('--nav-controls-pointer-events', 'all');
      this.setStyleVariable('--nav-controls-opacity', '1');
    }
  };

  /**
   * Shows the loading indicator.
   */
  showLoadingIndicator = () => {
    this.setStyleVariable('--loading-indicator-opacity', '1');
  };

  /**
   * Hides the loading indicator.
   */
  hideLoadingIndicator = async () => {
    await sleep(LOADING_INDICATOR_DELAY);
    this.setStyleVariable('--loading-indicator-opacity', '0');
  };

  /**
   * Prevents the next reset of the scroll position that would otherwise be
   * triggered by calling RendererService.trySetScrollPosition().
   */
  preventNextScrollReset = () => {
    this.preventScrollReset = true;
  };

  /**
   * Attempts to set the window's scroll position. Will not do anything if
   * RendererService.preventScrollReset has been set earlier. However, setting this
   * property will only prevent a scroll reset one single time.
   */
  trySetScrollPosition = (options?: Partial<ScrollToOptions>) => {
    if (this.preventScrollReset) {
      this.preventScrollReset = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'auto', ...options });
  };

  /**
   * Can be used to scroll to the bottom after a certain amount of miliseconds.
   * Useful when refreshing thread pages.
   * @param waitTime The wait time in miliseconds.
   */
  waitAndScrollToBottom = async (waitTime = 500) => {
    await sleep(waitTime);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  /**
   * Attempts to scroll to the given element.
   * @param element The element's id or the element itself.
   * @param options.highlight (optional) Whether the element should be highlighted.
   */
  scrollToElement(
    element: string | HTMLElement | null,
    options?: ScrollToElementOptions,
  ) {
    const { highlight, behavior } = {
      highlight: false,
      behavior: 'smooth' as ScrollBehavior,
      ...options,
    };

    if (typeof element === 'string') {
      element = document.getElementById(element);
    }
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const currentScrollTop =
      document.documentElement.scrollTop || document.body.scrollTop;
    const topNavHeight = (document.getElementById('top-nav') as HTMLElement)
      .clientHeight;
    this.trySetScrollPosition({
      top: currentScrollTop + rect.top - topNavHeight,
      behavior,
    });
    if (highlight) {
      element.removeAttribute('data-highlighted');
      next(() => element.setAttribute('data-highlighted', ''));
    }
  }

  /**
   * Looks for the `app-skeleton` node in the document and removes it.
   * This function may be called once the application has loaded and
   * the skeleton is no longer needed.
   * @param delay The delay after which the skeleton should be removed.
   */
  removeAppSkeleton = async (delay: number) => {
    await sleep(delay);
    const skeleton = document.getElementById('app-skeleton');
    if (skeleton) {
      skeleton.remove();
    }
  };

  /**
   * Updates the global font size according to the settings..
   */
  updateFontSize = async () => {
    const { fontSize } = this.settings.getSettings();
    this.setStyleVariable('--global-font-size', fontSize);
  };
}
