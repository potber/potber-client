import Component from '@glimmer/component';
import { service } from '@ember/service';
import { guidFor } from '@ember/object/internals';
import RendererService from 'potber-client/services/renderer';
import type {
  Gesture,
  GestureEvent,
  GestureOptions,
} from 'potber-client/components/features/gestures/types';
import GesturesContainer from '../container';
import OverscrollIndicator from './indicator';
import {
  normalizeOverscrollTolerance,
  shouldTriggerOverscroll,
} from 'potber-client/utils/gestures';
import { debounce } from 'potber-client/utils/misc';

interface Signature {
  Element: HTMLDivElement;
  Args: {
    /**
     * The direction of the overscroll.
     */
    direction: 'up' | 'down';
    /**
     * The callback function.
     */
    onOverscroll: () => void;
    /**
     * The container that should support overscrolling. Can be an `HTMLElement` or an element's id. If left emtpty, `document.documentElement` will be used.
     */
    scrollContainer?: HTMLElement | string;
    /**
     * Optional id for the container. If none is provided, an id will be randomly generated.
     */
    id?: string;
    /**
     * Whether gestures are disabled.
     */
    disabled?: boolean;
    /**
     * The delay in miliseconds until the container will bounce back. Defaults to 1000 miliseconds.
     */
    delay?: number;
    /**
     * The tolerance in pixels. Defaults to `5`.
     */
    tolerance?: number;
    /**
     * Optional `GestureOptions`.
     */
    options?: GestureOptions;
  };
  Blocks: {
    default: [];
  };
}

export default class OverscrollContainer extends Component<Signature> {
  @service declare renderer: RendererService;
  private debouncedHideIndicator?: () => Promise<void>;
  private gestureStartedAtOverscrollEdge = false;

  willDestroy() {
    super.willDestroy();
    this.debouncedHideIndicator = undefined;
    this.gestureStartedAtOverscrollEdge = false;
  }

  get id() {
    return this.args.id ?? `${guidFor(this)}`;
  }

  get scrollContainer() {
    if (!this.args.scrollContainer) {
      return (document.scrollingElement ??
        document.documentElement) as HTMLElement;
    } else if (typeof this.args.scrollContainer === 'string')
      return document.getElementById(this.args.scrollContainer) as HTMLElement;
    else return this.args.scrollContainer;
  }

  get gesturesContainerId() {
    return this.args.id ?? `${this.id}-overscroll-container`;
  }

  get indicatorId() {
    return `${this.id}-overscroll-indicator`;
  }

  get delay(): number {
    return this.args.delay ?? 1000;
  }

  get tolerance() {
    return normalizeOverscrollTolerance(this.args.tolerance);
  }

  get minimumPullDistance() {
    return parseInt(
      this.renderer
        .getStyleVariable('--control-default-height')
        .replaceAll(/\D/g, ''),
    );
  }

  get indicator() {
    return document.getElementById(this.indicatorId) as HTMLElement | null;
  }

  getHideIndicatorDebounced = () => {
    if (!this.debouncedHideIndicator) {
      this.debouncedHideIndicator = debounce(this.hideIndicator, this.delay);
    }

    return this.debouncedHideIndicator;
  };

  get gestures(): Gesture[] {
    return [
      {
        type: 'panstart',
        onGesture: this.handlePanStart,
      },
      {
        type: 'panend',
        onGesture: this.handlePanEnd,
      },
    ];
  }

  handlePanStart = () => {
    const { scrollTop, clientHeight, scrollHeight } = this.scrollContainer;

    this.gestureStartedAtOverscrollEdge = shouldTriggerOverscroll({
      direction: this.args.direction,
      scrollTop,
      clientHeight,
      scrollHeight,
      tolerance: this.tolerance,
    });
  };

  handlePanEnd = ({ gesture }: GestureEvent) => {
    const deltaY = gesture.touchMoveY ?? 0;
    const deltaX = gesture.touchMoveX ?? 0;

    if (!this.gestureStartedAtOverscrollEdge) {
      return;
    }

    if (
      Math.abs(deltaY) < this.minimumPullDistance ||
      Math.abs(deltaY) <= Math.abs(deltaX)
    ) {
      return;
    }

    const direction = deltaY > 0 ? 'down' : 'up';
    if (direction !== this.args.direction) {
      return;
    }

    this.showIndicator();
    this.args.onOverscroll();
  };

  showIndicator = () => {
    const indicator = this.indicator;
    if (!indicator) {
      return;
    }

    indicator.style.height = 'var(--control-default-height)';
    void this.getHideIndicatorDebounced()();
  };

  hideIndicator = () => {
    const indicator = this.indicator;
    if (!indicator) {
      return;
    }

    indicator.style.height = '0px';
  };

  <template>
    <GesturesContainer
      @id={{this.gesturesContainerId}}
      @disabled={{@disabled}}
      @gestures={{this.gestures}}
    >
      <OverscrollIndicator id={{this.indicatorId}} @direction={{@direction}} />
      {{yield}}
    </GesturesContainer>
  </template>
}
