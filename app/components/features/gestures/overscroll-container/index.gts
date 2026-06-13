import Component from '@glimmer/component';
import { service } from '@ember/service';
import { guidFor } from '@ember/object/internals';
import RendererService from 'potber-client/services/renderer';
import OverscrollIndicator from './indicator';
import overscrollGesture from 'potber-client/modifiers/overscroll-gesture';

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
  };
  Blocks: {
    default: [];
  };
}

export default class OverscrollContainer extends Component<Signature> {
  @service declare renderer: RendererService;

  get id() {
    return this.args.id ?? `${guidFor(this)}`;
  }

  get minimumPullDistance() {
    return Number.parseInt(
      this.renderer
        .getStyleVariable('--control-default-height')
        .replaceAll(/\D/g, ''),
      10,
    );
  }

  <template>
    <div
      ...attributes
      class='overscroll-container'
      id={{this.id}}
      {{overscrollGesture
        direction=@direction
        onOverscroll=@onOverscroll
        scrollContainer=@scrollContainer
        disabled=@disabled
        delay=@delay
        tolerance=@tolerance
        minimumPullDistance=this.minimumPullDistance
      }}
    >
      <OverscrollIndicator
        data-overscroll-indicator
        @direction={{@direction}}
      />

      {{yield}}
    </div>
  </template>
}
