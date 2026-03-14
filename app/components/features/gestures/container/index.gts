import Component from '@glimmer/component';
import { service } from '@ember/service';
import didInsert from '@ember/render-modifiers/modifiers/did-insert';
import didUpdate from '@ember/render-modifiers/modifiers/did-update';
import { guidFor } from '@ember/object/internals';
import TinyGesture from 'tinygesture';
import type { Options } from 'tinygesture';
import type { Gesture } from 'potber-client/components/features/gestures/types';
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
     * Optional `GestureOptions`.
     */
    options?: Partial<Options<HTMLElement>>;
  };
  Blocks: {
    default: [];
  };
}

export default class GesturesContainer extends Component<Signature> {
  @service declare settings: SettingsService;

  private _tinyGesture: TinyGesture<HTMLElement> | undefined;
  private listeners: Array<{ cancel: () => void }> = [];

  willDestroy() {
    super.willDestroy();
    this.teardownGestures();
  }

  get id() {
    return this.args.id ?? `${guidFor(this)}-gestures-container`;
  }

  get container() {
    return document.getElementById(this.id) as HTMLElement;
  }

  get tinyGesture() {
    if (!this._tinyGesture)
      throw new Error(
        "Attempted to access GesturesContainer's TinyGesture reference before it was initialized.",
      );
    return this._tinyGesture;
  }

  get gestures(): Array<Gesture> {
    if (!this.args.gestures)
      throw new Error(
        'You must provide at least one gesture to GesturesContainer.',
      );
    if (!Array.isArray(this.args.gestures)) return [this.args.gestures];
    else return this.args.gestures;
  }

  get disabled(): boolean {
    if (this.settings.getSetting('gestures') === Gestures.none) return true;
    else return this.args.disabled ?? false;
  }

  get gestureSignature() {
    return this.gestures.map((gesture) => gesture.type).join('|');
  }

  get optionsSignature() {
    return JSON.stringify(this.args.options ?? {});
  }

  private teardownGestures = () => {
    for (const listener of this.listeners) {
      listener.cancel();
    }
    this.listeners = [];
    this._tinyGesture?.destroy();
    this._tinyGesture = undefined;
  };

  syncGestures = () => {
    this.teardownGestures();

    if (this.disabled || !this.container) return;

    this._tinyGesture = new TinyGesture(this.container, this.args.options);
    for (const gesture of this.gestures) {
      const listener = this.tinyGesture.on(
        gesture.type,
        (event: MouseEvent | TouchEvent) => {
          gesture.onGesture({
            type: gesture.type,
            gesture: this.tinyGesture,
            nativeEvent: event,
          });
        },
      );
      if (listener) {
        this.listeners.push(listener);
      }
    }
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
