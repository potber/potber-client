import Component from '@glimmer/component';
import { guidFor } from '@ember/object/internals';
import { action } from '@ember/object';
import { on } from '@ember/modifier';

interface Signature {
  Element: HTMLTextAreaElement;
  Args: {
    value: string;
    id?: string;
    textarea?: string;
    size?: ControlSize;
    required?: boolean;
    selectAllOnFocus?: boolean;
    height?: 'small' | 'medium' | 'large' | 'x-large';
    onChange?: (value: string, event: Event) => void;
  };
}

export default class CommonTextareaComponent extends Component<Signature> {
  declare args: Signature['Args'];

  get componentId() {
    return this.args.id ? this.args.id : `textarea-${guidFor(this)}`;
  }

  get value() {
    return this.args.value;
  }

  get size() {
    return this.args.size || 'medium';
  }

  get textarea() {
    return this.args.textarea;
  }

  get height() {
    return this.args.height || 'small';
  }

  @action handleFocus(event: FocusEvent) {
    if (this.args.selectAllOnFocus) {
      const textarea = event.target as HTMLTextAreaElement;
      textarea.setSelectionRange(0, textarea.value.length);
    }
  }

  @action handleChange(event: Event) {
    const value = (event.currentTarget as HTMLTextAreaElement).value;
    if (this.args.onChange) {
      this.args.onChange(value, event);
    }
  }

  <template>
    <div
      id={{this.componentId}}
      class='input-container control-size-{{this.size}}
        textarea-height-{{this.height}}'
    >
      <textarea
        id='{{this.componentId}}-textarea'
        required={{@required}}
        {{on 'change' this.handleChange}}
        {{on 'focus' this.handleFocus}}
        ...attributes
      >{{this.value}}</textarea>
    </div>
  </template>
}
