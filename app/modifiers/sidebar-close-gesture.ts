import { service } from '@ember/service';
import Modifier, { type NamedArgs, type PositionalArgs } from 'ember-modifier';
import { DragGesture } from '@use-gesture/vanilla';
import type { DragState } from '@use-gesture/vanilla';
import RendererService from 'potber-client/services/renderer';
import SettingsService, { Gestures } from 'potber-client/services/settings';
import { getSidebarSwipeType } from 'potber-client/utils/gestures';

interface SidebarCloseGestureSignature {
  Element: HTMLElement;
  Args: {
    Named: {
      preventScroll?: boolean;
    };
    Positional: [];
  };
}

export default class SidebarCloseGestureModifier extends Modifier<SidebarCloseGestureSignature> {
  @service declare settings: SettingsService;
  @service declare renderer: RendererService;

  modify(
    element: SidebarCloseGestureSignature['Element'],
    _positional: PositionalArgs<SidebarCloseGestureSignature>,
    named: NamedArgs<SidebarCloseGestureSignature>,
  ) {
    if (this.gesturesDisabled() || this.renderer.isDesktop) {
      return;
    }

    const recognizer = new DragGesture(element, this.handleDrag, {
      filterTaps: false,
      triggerAllEvents: true,
      ...(named.preventScroll
        ? {
            preventScroll: 0,
            preventScrollAxis: 'y' as const,
          }
        : {}),
      pointer: {
        touch: true,
      },
    });

    return () => recognizer.destroy();
  }

  private get maxWidth() {
    return Number.parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--sidebar-expanded-width')
        .replace(/\D/g, ''),
      10,
    );
  }

  private get closeSwipeType(): ReturnType<typeof getSidebarSwipeType> {
    return getSidebarSwipeType({
      isRightSidebar: this.settings.isRightSidebar(),
      action: 'close',
    });
  }

  private gesturesDisabled() {
    return this.settings.getSetting('gestures') === Gestures.none;
  }

  private isVerticalDrag(state: DragState) {
    const [deltaX, deltaY] = state.movement;

    return Math.abs(deltaY) > Math.abs(deltaX);
  }

  private isCloseSwipe(state: DragState) {
    const [swipeX] = state.swipe;

    if (this.closeSwipeType === 'swipeleft') {
      return swipeX < 0;
    }

    return swipeX > 0;
  }

  private isInvalidCloseDrag(state: DragState) {
    const [deltaX] = state.movement;

    return (
      this.isVerticalDrag(state) ||
      (this.settings.isRightSidebar() && deltaX < 0) ||
      (!this.settings.isRightSidebar() && deltaX > 0) ||
      Math.abs(deltaX) > this.maxWidth
    );
  }

  private isGestureFinished(state: DragState) {
    return state.last || state.canceled || /(up|end|cancel)$/.test(state.type);
  }

  private handleDrag = (state: DragState) => {
    if (this.gesturesDisabled() || this.renderer.isDesktop) {
      return;
    }

    if (!this.isGestureFinished(state)) {
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
      this.renderer.openSidebar();
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
}
