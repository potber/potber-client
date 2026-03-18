import Component from '@glimmer/component';
import { service } from '@ember/service';
import didInsert from '@ember/render-modifiers/modifiers/did-insert';
import didUpdate from '@ember/render-modifiers/modifiers/did-update';
import { guidFor } from '@ember/object/internals';
import { DragGesture } from '@use-gesture/vanilla';
import type {
  DragGesture as VanillaDragGesture,
  DragState,
  UserDragConfig,
} from '@use-gesture/vanilla';
import type {
  Gesture,
  GestureOptions,
  GestureState,
  GestureType,
} from 'potber-client/components/features/gestures/types';
import SettingsService, { Gestures } from 'potber-client/services/settings';

interface Signature {
  Element: HTMLDivElement;
  Args: {
    /**
     * A single `Gesture` or a list of `Gesture`s the container should listen to.
     */
    gestures: Array<Gesture> | Gesture;
    /**
     * Optional id for the container. If none is provided, an id will be randomly generated.
     */
    id?: string;
    /**
     * Whether gestures are disabled.
     */
    disabled?: boolean;
    /**
     * Optional drag options.
     */
    options?: GestureOptions;
  };
  Blocks: {
    default: [];
  };
}

export default class GesturesContainer extends Component<Signature> {
  @service declare settings: SettingsService;

  private gestureRecognizer: VanillaDragGesture | undefined;

  willDestroy() {
    super.willDestroy();
    this.teardownGestures();
  }

  get id() {
    return this.args.id ?? `${guidFor(this)}-gestures-container`;
  }

  get container() {
    return document.getElementById(this.id) as HTMLElement | null;
  }

  get gestures(): Array<Gesture> {
    if (!this.args.gestures) {
      throw new Error(
        'You must provide at least one gesture to GesturesContainer.',
      );
    }

    return Array.isArray(this.args.gestures)
      ? this.args.gestures
      : [this.args.gestures];
  }

  get disabled(): boolean {
    if (this.settings.getSetting('gestures') === Gestures.none) return true;
    return this.args.disabled ?? false;
  }

  get gestureSignature() {
    return this.gestures.map((gesture) => gesture.type).join('|');
  }

  get optionsSignature() {
    return JSON.stringify(this.args.options ?? {});
  }

  get gestureOptions(): UserDragConfig {
    return {
      filterTaps: false,
      triggerAllEvents: true,
      ...this.args.options,
    };
  }

  private teardownGestures = () => {
    this.gestureRecognizer?.destroy();
    this.gestureRecognizer = undefined;
  };

  private normalizeThreshold = (axis: 'x' | 'y') => {
    const threshold = this.args.options?.threshold;

    if (Array.isArray(threshold)) {
      return threshold[axis === 'x' ? 0 : 1] ?? 0;
    }

    if (typeof threshold === 'number') {
      return threshold;
    }

    return 0;
  };

  private createGestureState = (state: DragState): GestureState => {
    const [touchMoveX, touchMoveY] = state.movement;
    const [velocityX, velocityY] = state.velocity;
    const absX = Math.abs(touchMoveX);
    const absY = Math.abs(touchMoveY);
    const thresholdX = this.normalizeThreshold('x');
    const thresholdY = this.normalizeThreshold('y');

    let swipingDirection: GestureState['swipingDirection'] = null;
    if (absX > absY) {
      swipingDirection = absX > thresholdX ? 'horizontal' : 'pre-horizontal';
    } else if (absY > absX) {
      swipingDirection = absY > thresholdY ? 'vertical' : 'pre-vertical';
    }

    return {
      touchMoveX,
      touchMoveY,
      velocityX,
      velocityY,
      swipingHorizontal: absX > thresholdX,
      swipingVertical: absY > thresholdY,
      swipingDirection,
    };
  };

  private dispatchGesture = (type: GestureType, state: DragState) => {
    const gesture = this.createGestureState(state);

    for (const handler of this.gestures) {
      if (handler.type !== type) continue;

      handler.onGesture({
        type,
        gesture,
        nativeEvent: state.event,
      });
    }
  };

  private handleDrag = (state: DragState) => {
    if (state.first) {
      this.dispatchGesture('panstart', state);
    }

    if (state.active && !state.first && !state.last) {
      this.dispatchGesture('panmove', state);
    }

    if (!state.last) {
      return;
    }

    this.dispatchGesture('panend', state);

    if (state.tap) {
      this.dispatchGesture('tap', state);
    }

    const [swipeX, swipeY] = state.swipe;
    if (swipeX < 0) {
      this.dispatchGesture('swipeleft', state);
    } else if (swipeX > 0) {
      this.dispatchGesture('swiperight', state);
    }

    if (swipeY < 0) {
      this.dispatchGesture('swipeup', state);
    } else if (swipeY > 0) {
      this.dispatchGesture('swipedown', state);
    }
  };

  syncGestures = () => {
    this.teardownGestures();

    if (this.disabled || !this.container) {
      return;
    }

    this.gestureRecognizer = new DragGesture(
      this.container,
      this.handleDrag,
      this.gestureOptions,
    );
  };

  <template>
    <div
      ...attributes
      class='gestures-container'
      {{didInsert this.syncGestures}}
      {{didUpdate
        this.syncGestures
        this.disabled
        this.gestureSignature
        this.optionsSignature
      }}
      id={{this.id}}
    >
      {{yield}}
    </div>
  </template>
}
