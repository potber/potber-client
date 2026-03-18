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
import GesturesContainer from 'potber-client/components/features/gestures/container';
import Quickstart from 'potber-client/components/features/quickstart';
import RendererService from 'potber-client/services/renderer';
import SettingsService, {
  Gestures,
  SidebarLayout,
} from 'potber-client/services/settings';
import SidebarNav from './nav';
import type {
  Gesture,
  GestureEvent,
} from 'potber-client/components/features/gestures/types';
import { getSidebarSwipeType } from 'potber-client/utils/gestures';

export default class SidebarComponent extends Component {
  @service declare settings: SettingsService;
  @service declare renderer: RendererService;

  private edgeOpenRecognizer: VanillaDragGesture | undefined;
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

  get width(): number {
    const width = parseInt(
      this.renderer.getStyleVariable('--sidebar-width').replace(/\D/g, ''),
    );
    return width;
  }

  get closeSwipeType(): Gesture['type'] {
    return getSidebarSwipeType({
      isRightSidebar: this.settings.isRightSidebar(),
      action: 'close',
    });
  }

  handleSidebarBackdropClick = () => {
    this.renderer.closeSidebar();
  };

  handleSwipeInner = ({ gesture }: GestureEvent) => {
    if (!gesture.velocityX) return;
    this.renderer.closeSidebar();
  };
  private isVerticalPan = (gesture: GestureEvent['gesture']) =>
    gesture.swipingDirection === 'vertical' ||
    gesture.swipingDirection === 'pre-vertical';

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

  willDestroy() {
    super.willDestroy();
    this.teardownEdgeOpenGestures();
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

  handlePanendInner = ({ gesture }: GestureEvent) => {
    // Keep the sidebar state unchanged for vertical drags/scrolling.
    if (gesture.touchMoveX === null || this.isVerticalPan(gesture)) {
      return;
    }

    const draggedWidth = this.maxWidth - Math.abs(gesture.touchMoveX);
    if (draggedWidth > this.maxWidth / 2) {
      this.renderer.openSidebar();
    } else {
      this.renderer.closeSidebar();
    }
  };
  handlePanmoveInner = ({ gesture }: GestureEvent) => {
    if (
      gesture.touchMoveX === null ||
      this.isVerticalPan(gesture) ||
      (this.settings.isRightSidebar() && gesture.touchMoveX < 0) ||
      (!this.settings.isRightSidebar() && gesture.touchMoveX > 0) ||
      (gesture.touchMoveX && Math.abs(gesture.touchMoveX) > this.maxWidth)
    ) {
      return;
    }

    const width = this.maxWidth - Math.abs(gesture.touchMoveX);
    this.renderer.dragSidebar(width, width / this.maxWidth);
  };
  get disableGestures() {
    return this.settings.getSetting('gestures') === Gestures.none;
  }

  get innerGestures() {
    return [
      {
        type: this.closeSwipeType,
        onGesture: this.handleSwipeInner,
      },
      {
        type: 'panmove' as const,
        onGesture: this.handlePanmoveInner,
      },
      {
        type: 'panend' as const,
        onGesture: this.handlePanendInner,
      },
    ];
  }

  get backdropGestures() {
    return [
      {
        type: this.closeSwipeType,
        onGesture: this.handleSwipeInner,
      },
      {
        type: 'panmove' as const,
        onGesture: this.handlePanmoveInner,
      },
      {
        type: 'panend' as const,
        onGesture: this.handlePanendInner,
      },
    ];
  }

  <template>
    <div
      id='sidebar'
      role='navigation'
      {{didInsert this.setupEdgeOpenGestures}}
    >
      <GesturesContainer
        @id='sidebar-gestures-container-inner'
        @disabled={{this.disableGestures}}
        @gestures={{this.innerGestures}}
      >
        {{#if (eq this.navVerticalPosition 'top')}}
          <SidebarNav />
        {{/if}}

        <div id='sidebar-content'>
          <Quickstart @inSidebar={{true}} />
        </div>

        {{#if (eq this.navVerticalPosition 'bottom')}}
          <SidebarNav />
        {{/if}}
      </GesturesContainer>
    </div>
    <GesturesContainer
      @id='sidebar-backdrop'
      aria-hidden='true'
      @disabled={{this.disableGestures}}
      @gestures={{this.backdropGestures}}
      {{on 'click' this.handleSidebarBackdropClick}}
    />
  </template>
}
