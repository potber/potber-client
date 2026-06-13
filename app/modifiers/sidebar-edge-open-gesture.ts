import { service } from '@ember/service';
import Modifier from 'ember-modifier';
import { DragGesture } from '@use-gesture/vanilla';
import type { DragState } from '@use-gesture/vanilla';
import RendererService from 'potber-client/services/renderer';
import SettingsService, { Gestures } from 'potber-client/services/settings';

interface SidebarEdgeOpenGestureSignature {
  Element: HTMLElement;
  Args: {
    Named: Record<string, never>;
    Positional: [];
  };
}

export default class SidebarEdgeOpenGestureModifier extends Modifier<SidebarEdgeOpenGestureSignature> {
  @service declare settings: SettingsService;
  @service declare renderer: RendererService;

  private gestureStartedInEdgeZone = false;
  private dragActivated = false;

  private gestureMaxWidth = 0;
  private gestureEdgeZoneWidth = 0;
  private gestureEdgeInset = 0;

  modify() {
    const recognizer = new DragGesture(document, this.handleDrag, {
      eventOptions: { passive: false },
      filterTaps: true,
      triggerAllEvents: true,
      pointer: {
        capture: false,
        touch: true,
      },
    });

    return () => {
      recognizer.destroy();
      this.resetGesture();
    };
  }

  private readMaxWidth() {
    return Number.parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--sidebar-expanded-width')
        .replace(/\D/g, ''),
      10,
    );
  }

  private readEdgeZoneWidth() {
    const rootFontSize = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );

    return rootFontSize * 5;
  }

  private readEdgeInset() {
    const variable = this.settings.isRightSidebar()
      ? '--sidebar-gesture-edge-inset-right'
      : '--sidebar-gesture-edge-inset-left';

    return (
      (Number.parseFloat(this.renderer.getStyleVariable(variable)) || 0) + 24
    );
  }

  private captureGestureMeasurements() {
    this.gestureMaxWidth = this.readMaxWidth();
    this.gestureEdgeZoneWidth = this.readEdgeZoneWidth();
    this.gestureEdgeInset = this.readEdgeInset();
  }

  private resetGesture() {
    this.gestureStartedInEdgeZone = false;
    this.dragActivated = false;

    this.gestureMaxWidth = 0;
    this.gestureEdgeZoneWidth = 0;
    this.gestureEdgeInset = 0;
  }

  private gesturesDisabled() {
    return this.settings.getSetting('gestures') === Gestures.none;
  }

  private isWithinEdgeZone(x: number) {
    const zoneStart = this.gestureEdgeInset;
    const zoneEnd = zoneStart + this.gestureEdgeZoneWidth;

    if (this.settings.isRightSidebar()) {
      const rightDistance = window.innerWidth - x;

      return rightDistance >= zoneStart && rightDistance <= zoneEnd;
    }

    return x >= zoneStart && x <= zoneEnd;
  }

  private isGestureFinished(state: DragState) {
    return state.last || state.canceled || /(up|end|cancel)$/.test(state.type);
  }

  private getHorizontalOpeningDelta(state: DragState) {
    const [deltaX] = state.movement;

    return this.settings.isRightSidebar() ? -deltaX : deltaX;
  }

  private shouldCancelAsVerticalDrag(state: DragState) {
    const [deltaX, deltaY] = state.movement;

    return Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8;
  }

  private hasOpeningDragIntent(state: DragState) {
    const [deltaX, deltaY] = state.movement;
    const horizontalDelta = this.getHorizontalOpeningDelta(state);

    return horizontalDelta > 8 && Math.abs(deltaX) > Math.abs(deltaY);
  }

  private handleDrag = (state: DragState) => {
    if (state.first) {
      this.captureGestureMeasurements();

      this.gestureStartedInEdgeZone =
        !this.gesturesDisabled() &&
        !this.renderer.isDesktop &&
        !this.renderer.sidebarExpanded &&
        this.isWithinEdgeZone(state.initial[0]);

      this.dragActivated = false;
    }

    if (!this.gestureStartedInEdgeZone) {
      return;
    }

    if (!this.dragActivated) {
      if (this.shouldCancelAsVerticalDrag(state)) {
        this.resetGesture();
        return;
      }

      if (!this.hasOpeningDragIntent(state)) {
        if (this.isGestureFinished(state)) {
          this.renderer.closeSidebar();
          this.resetGesture();
        }

        return;
      }

      this.dragActivated = true;
    }

    const horizontalDelta = this.getHorizontalOpeningDelta(state);

    if (this.isGestureFinished(state)) {
      if (horizontalDelta > this.gestureMaxWidth / 2) {
        this.renderer.openSidebar();
      } else {
        this.renderer.closeSidebar();
      }

      this.resetGesture();
      return;
    }

    if (state.event.cancelable) {
      state.event.preventDefault();
    }

    const width = Math.min(
      this.gestureMaxWidth,
      Math.max(0, horizontalDelta),
    );

    this.renderer.dragSidebar(width, width / this.gestureMaxWidth);
  };
}