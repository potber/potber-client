import eq from 'ember-truth-helpers/helpers/eq';
import { on } from '@ember/modifier';
import { service } from '@ember/service';
import Component from '@glimmer/component';
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

  get openSwipeType(): Gesture['type'] {
    return getSidebarSwipeType({
      isRightSidebar: this.settings.isRightSidebar(),
      action: 'open',
    });
  }

  handleSidebarBackdropClick = () => {
    this.renderer.toggleLeftSidebar(false);
  };

  handleSwipeInner = ({ gesture }: GestureEvent) => {
    if (!gesture.velocityX) return;
    this.renderer.toggleLeftSidebar(false);
  };

  handleSwipeOuter = ({ gesture }: GestureEvent) => {
    if (!gesture.velocityX) return;
    this.renderer.toggleLeftSidebar(true);
  };

  private isVerticalPan = (gesture: GestureEvent['gesture']) =>
    gesture.swipingDirection === 'vertical' ||
    gesture.swipingDirection === 'pre-vertical';

  handlePanendInner = ({ gesture }: GestureEvent) => {
    // Keep the sidebar state unchanged for vertical drags/scrolling.
    if (gesture.touchMoveX === null || this.isVerticalPan(gesture)) {
      return;
    }

    const draggedWidth = this.maxWidth - Math.abs(gesture.touchMoveX);
    this.renderer.toggleLeftSidebar(draggedWidth > this.maxWidth / 2);
  };

  handlePanendOuter = ({ gesture }: GestureEvent) => {
    if (gesture.touchMoveX === null || this.isVerticalPan(gesture)) {
      return;
    }

    const draggedWidth = Math.abs(gesture.touchMoveX);
    this.renderer.toggleLeftSidebar(draggedWidth > this.maxWidth / 2);
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

    this.renderer.dragLeftSidebar(this.maxWidth - Math.abs(gesture.touchMoveX));
  };

  handlePanmoveOuter = ({ gesture }: GestureEvent) => {
    if (
      gesture.touchMoveX === null ||
      this.isVerticalPan(gesture) ||
      (this.settings.isRightSidebar() && gesture.touchMoveX > 0) ||
      (!this.settings.isRightSidebar() && gesture.touchMoveX < 0) ||
      (gesture.touchMoveX && Math.abs(gesture.touchMoveX) > this.maxWidth)
    ) {
      return;
    }

    this.renderer.dragLeftSidebar(Math.abs(gesture.touchMoveX));
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

  get outerGestures() {
    return [
      {
        type: this.openSwipeType,
        onGesture: this.handleSwipeOuter,
      },
      {
        type: 'panmove' as const,
        onGesture: this.handlePanmoveOuter,
      },
      {
        type: 'panend' as const,
        onGesture: this.handlePanendOuter,
      },
    ];
  }

  <template>
    <div id='sidebar' role='navigation'>
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
      <GesturesContainer
        @id='sidebar-gestures-container-outer'
        @gestures={{this.outerGestures}}
      />
    </div>
    <button
      id='sidebar-backdrop'
      type='button'
      aria-hidden='true'
      {{on 'click' this.handleSidebarBackdropClick}}
    />
  </template>
}
