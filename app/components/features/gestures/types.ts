import type { UserDragConfig } from '@use-gesture/vanilla';

export type GestureType =
  | 'panstart'
  | 'panmove'
  | 'panend'
  | 'swipeleft'
  | 'swiperight'
  | 'swipeup'
  | 'swipedown'
  | 'tap';

export interface GestureState {
  touchMoveX: number | null;
  touchMoveY: number | null;
  velocityX: number | null;
  velocityY: number | null;
  swipingHorizontal: boolean;
  swipingVertical: boolean;
  swipingDirection:
    | 'horizontal'
    | 'pre-horizontal'
    | 'vertical'
    | 'pre-vertical'
    | null;
}

export interface GestureEvent {
  type: GestureType;
  gesture: GestureState;
  nativeEvent: Event;
}

export interface Gesture {
  type: GestureType;
  // eslint-disable-next-line no-unused-vars
  onGesture: (event: GestureEvent) => void;
}

export type GestureOptions = Partial<UserDragConfig>;
