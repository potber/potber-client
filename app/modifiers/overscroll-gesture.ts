import { modifier } from 'ember-modifier';
import { DragGesture } from '@use-gesture/vanilla';
import type {
  DragGesture as VanillaDragGesture,
  DragState,
} from '@use-gesture/vanilla';
import {
  normalizeOverscrollTolerance,
  shouldTriggerOverscroll,
} from 'potber-client/utils/gestures';
import { debounce } from 'potber-client/utils/misc';

function resolveScrollContainer(
  scrollContainer?: HTMLElement | string,
): HTMLElement {
  if (!scrollContainer) {
    return (document.scrollingElement ??
      document.documentElement) as HTMLElement;
  }

  if (typeof scrollContainer === 'string') {
    const element = document.getElementById(scrollContainer);

    if (!element) {
      throw new Error(`Could not find scroll container "${scrollContainer}"`);
    }

    return element;
  }

  return scrollContainer;
}

interface OverscrollGestureSignature {
  Element: HTMLElement;
  Args: {
    Named: {
      direction: 'up' | 'down';
      onOverscroll: () => void;
      scrollContainer?: HTMLElement | string;
      disabled?: boolean;
      delay?: number;
      tolerance?: number;
      minimumPullDistance: number;
    };
    Positional: [];
  };
}

export default modifier<OverscrollGestureSignature>(
  (element, _positional, named) => {
    if (named.disabled) {
      return;
    }

    let gestureStartedAtOverscrollEdge = false;

    const getIndicator = () =>
      element.querySelector<HTMLElement>('[data-overscroll-indicator]');

    const hideIndicator = () => {
      const indicator = getIndicator();

      if (indicator) {
        indicator.style.height = '0px';
      }
    };

    const hideIndicatorDebounced = debounce(hideIndicator, named.delay ?? 1000);

    const showIndicator = () => {
      const indicator = getIndicator();

      if (!indicator) {
        return;
      }

      indicator.style.height = 'var(--control-default-height)';
      void hideIndicatorDebounced();
    };

    const handleDrag = (state: DragState) => {
      const scrollContainer = resolveScrollContainer(named.scrollContainer);

      if (state.first) {
        const { scrollTop, clientHeight, scrollHeight } = scrollContainer;

        gestureStartedAtOverscrollEdge = shouldTriggerOverscroll({
          direction: named.direction,
          scrollTop,
          clientHeight,
          scrollHeight,
          tolerance: normalizeOverscrollTolerance(named.tolerance),
        });
      }

      if (!state.last || !gestureStartedAtOverscrollEdge) {
        return;
      }

      const [deltaX, deltaY] = state.movement;

      if (
        Math.abs(deltaY) < named.minimumPullDistance ||
        Math.abs(deltaY) <= Math.abs(deltaX)
      ) {
        return;
      }

      const direction = deltaY > 0 ? 'down' : 'up';

      if (direction !== named.direction) {
        return;
      }

      showIndicator();
      named.onOverscroll();
    };

    const gesture: VanillaDragGesture = new DragGesture(element, handleDrag, {
      filterTaps: false,
      triggerAllEvents: true,
      pointer: {
        touch: true,
        capture: false,
      },
    });

    return () => {
      gesture.destroy();
    };
  },
);
