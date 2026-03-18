import eq from 'ember-truth-helpers/helpers/eq';
import { on } from '@ember/modifier';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import didInsert from '@ember/render-modifiers/modifiers/did-insert';
import { DragGesture } from '@use-gesture/vanilla';
import type {
  DragGesture as VanillaDragGesture,
  DragState,
} from '@use-gesture/vanilla';
import Quickstart from 'potber-client/components/features/quickstart';
import RendererService from 'potber-client/services/renderer';
import SettingsService, {
  Gestures,
  SidebarLayout,
} from 'potber-client/services/settings';
import SidebarNav from './nav';
import { getSidebarSwipeType } from 'potber-client/utils/gestures';

export default class SidebarComponent extends Component {
  @service declare settings: SettingsService;
  @service declare renderer: RendererService;

  private edgeOpenRecognizer: VanillaDragGesture | undefined;
  private sidebarRecognizer: VanillaDragGesture | undefined;
  private backdropRecognizer: VanillaDragGesture | undefined;
  private edgeOpenGestureStarted = false;
  private edgeOpenDragActive = false;

  maxWidth = parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue('--sidebar-expanded-width')
      .replace(/\D/g, ''),
  );

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

  get closeSwipeType(): ReturnType<typeof getSidebarSwipeType> {
    return getSidebarSwipeType({
      isRightSidebar: this.settings.isRightSidebar(),
      action: 'close',
    });
  }

  handleSidebarBackdropClick = () => {
    this.renderer.closeSidebar();
  };

  private isVerticalDrag = (state: DragState) => {
    const [deltaX, deltaY] = state.movement;
    return Math.abs(deltaY) > Math.abs(deltaX);
  };

  private isCloseSwipe = (state: DragState) => {
    const [swipeX] = state.swipe;

    if (this.closeSwipeType === 'swipeleft') {
      return swipeX < 0;
    }

    return swipeX > 0;
  };

  private isInvalidCloseDrag = (state: DragState) => {
    const [deltaX] = state.movement;

    return (
      this.isVerticalDrag(state) ||
      (this.settings.isRightSidebar() && deltaX < 0) ||
      (!this.settings.isRightSidebar() && deltaX > 0) ||
      Math.abs(deltaX) > this.maxWidth
    );
  };

  private get edgeZoneWidth() {
    const rootFontSize = parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );
    return rootFontSize * 5;
  }

  private get edgeInset() {
    const variable = this.settings.isRightSidebar()
      ? '--sidebar-gesture-edge-inset-right'
      : '--sidebar-gesture-edge-inset-left';
    return parseFloat(this.renderer.getStyleVariable(variable)) || 0;
  }

  private isWithinEdgeZone = (x: number) => {
    const zoneStart = this.edgeInset;
    const zoneEnd = zoneStart + this.edgeZoneWidth;

    if (this.settings.isRightSidebar()) {
      const rightDistance = window.innerWidth - x;
      return rightDistance >= zoneStart && rightDistance <= zoneEnd;
    }

    return x >= zoneStart && x <= zoneEnd;
  };

  private resetEdgeOpenGesture = () => {
    this.edgeOpenGestureStarted = false;
    this.edgeOpenDragActive = false;
  };

  private teardownEdgeOpenGestures = () => {
    this.edgeOpenRecognizer?.destroy();
    this.edgeOpenRecognizer = undefined;
    this.resetEdgeOpenGesture();
  };

  private teardownSidebarGestures = () => {
    this.sidebarRecognizer?.destroy();
    this.sidebarRecognizer = undefined;
  };

  private teardownBackdropGestures = () => {
    this.backdropRecognizer?.destroy();
    this.backdropRecognizer = undefined;
  };

  private get sidebarElement() {
    return document.getElementById('sidebar') as HTMLElement | null;
  }

  private get backdropElement() {
    return document.getElementById('sidebar-backdrop') as HTMLElement | null;
  }

  willDestroy() {
    super.willDestroy();
    this.teardownEdgeOpenGestures();
    this.teardownSidebarGestures();
    this.teardownBackdropGestures();
  }

  setupEdgeOpenGestures = () => {
    this.teardownEdgeOpenGestures();
    this.edgeOpenRecognizer = new DragGesture(
      document,
      this.handleEdgeOpenDrag,
      {
        eventOptions: { passive: false },
        filterTaps: true,
        threshold: 8,
        pointer: {
          capture: false,
        },
      },
    );
  };

  setupSidebarGestures = () => {
    this.teardownSidebarGestures();

    if (!this.sidebarElement) {
      return;
    }

    this.sidebarRecognizer = new DragGesture(
      this.sidebarElement,
      this.handleCloseDrag,
      {
        filterTaps: false,
        triggerAllEvents: true,
      },
    );
  };

  setupBackdropGestures = () => {
    this.teardownBackdropGestures();

    if (!this.backdropElement) {
      return;
    }

    this.backdropRecognizer = new DragGesture(
      this.backdropElement,
      this.handleCloseDrag,
      {
        filterTaps: false,
        triggerAllEvents: true,
      },
    );
  };

  setupSidebar = () => {
    this.setupEdgeOpenGestures();
    this.setupSidebarGestures();
  };

  handleEdgeOpenDrag = (state: DragState) => {
    const event = state.event;

    if (state.first) {
      this.edgeOpenGestureStarted =
        !this.disableGestures &&
        !this.renderer.isDesktop &&
        !this.renderer.sidebarExpanded &&
        this.isWithinEdgeZone(state.initial[0]);
      this.edgeOpenDragActive = false;
    }

    if (!this.edgeOpenGestureStarted) {
      return;
    }

    const [deltaX, deltaY] = state.movement;
    const horizontalDelta = this.settings.isRightSidebar() ? -deltaX : deltaX;

    if (!this.edgeOpenDragActive) {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
        this.resetEdgeOpenGesture();
        return;
      }

      if (horizontalDelta <= 8 || Math.abs(deltaX) <= Math.abs(deltaY)) {
        if (state.last) {
          this.resetEdgeOpenGesture();
        }
        return;
      }

      this.edgeOpenDragActive = true;
    }

    if (state.last) {
      if (horizontalDelta > this.maxWidth / 2) {
        this.renderer.openSidebar();
      } else {
        this.renderer.closeSidebar();
      }
      this.resetEdgeOpenGesture();
      return;
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    const width = Math.min(this.maxWidth, Math.max(0, horizontalDelta));
    this.renderer.dragSidebar(width, width / this.maxWidth);
  };

  handleCloseDrag = (state: DragState) => {
    if (this.disableGestures) {
      return;
    }

    if (!state.last) {
      if (this.isInvalidCloseDrag(state)) {
        return;
      }

      const [deltaX] = state.movement;
      const width = this.maxWidth - Math.abs(deltaX);
      this.renderer.dragSidebar(width, width / this.maxWidth);
      return;
    }

    if (this.isCloseSwipe(state)) {
      this.renderer.closeSidebar();
      return;
    }

    if (this.isInvalidCloseDrag(state)) {
      return;
    }

    const [deltaX] = state.movement;
    const draggedWidth = this.maxWidth - Math.abs(deltaX);

    if (draggedWidth > this.maxWidth / 2) {
      this.renderer.openSidebar();
      return;
    }

    this.renderer.closeSidebar();
  };

  get disableGestures() {
    return this.settings.getSetting('gestures') === Gestures.none;
  }

  <template>
    <div id='sidebar' role='navigation' {{didInsert this.setupSidebar}}>
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
      {{didInsert this.setupBackdropGestures}}
      {{on 'click' this.handleSidebarBackdropClick}}
    />
  </template>
}
