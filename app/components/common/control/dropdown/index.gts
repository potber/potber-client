import { guidFor } from '@ember/object/internals';
import type Owner from '@ember/owner';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import RendererService from 'potber-client/services/renderer';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import FaIcon from '@fortawesome/ember-fontawesome/components/fa-icon';
import eq from 'ember-truth-helpers/helpers/eq';
import type { DropdownOption } from './types';
import InfoButton from 'potber-client/components/common/control/info-button';

interface Args<Data> {
  label: string;
  options: DropdownOption<Data>[];
  default?: DropdownOption<Data>;
  onSelect?: (element: DropdownOption<Data>) => void;
  size?: ControlSize;
}

interface Signature<Data> {
  Args: Args<Data>;
  Blocks: {
    info?: InfoButton[];
  };
}

export default class DropdownComponent<Data> extends Component<
  Signature<Data>
> {
  @service declare renderer: RendererService;

  componentId = 'dropdown-' + guidFor(this);

  @tracked locallySelectedOption: DropdownOption<Data> | undefined;
  @tracked expanded = false;

  constructor(owner: Owner, args: Args<Data>) {
    super(owner, args);
    if (args.options.length > 0) {
      if (args.default) {
        this.locallySelectedOption = args.default;
      } else {
        this.locallySelectedOption = args.options[0];
      }
    } else {
      this.locallySelectedOption = undefined;
    }
  }

  get selectedOption() {
    return this.args.default ?? this.locallySelectedOption;
  }

  get caption() {
    return this.selectedOption?.label || '';
  }

  get options() {
    return this.args.options;
  }

  get size() {
    return this.args.size || 'medium';
  }

  toggle = (event: MouseEvent) => {
    this.renderer.createClickRipple(event);
    if (this.expanded) {
      this.collapse();
    } else {
      this.expand();
    }
  };

  expand = () => {
    this.expanded = true;
  };

  collapse = () => {
    this.expanded = false;
  };

  handleBlur = (event: FocusEvent) => {
    if (
      event.relatedTarget instanceof HTMLElement &&
      event.relatedTarget.matches('.dropdown-item')
    ) {
      return;
    }
    this.collapse();
  };

  handleItemClick = (option: DropdownOption<Data>) => {
    this.locallySelectedOption = option;
    this.collapse();
    if (typeof this.args.onSelect === 'function') {
      this.args.onSelect(option);
    }
  };

  <template>
    <div class='dropdown control-size-{{this.size}}'>
      <div class='dropdown-inner'>
        <button
          id='{{this.componentId}}-button'
          class='dropdown-toggle control-variant-primary
            {{if this.expanded "dropdown-toggle-expanded"}}'
          type='button'
          aria-label={{@label}}
          aria-haspopup='true'
          aria-expanded='false'
          {{on 'click' this.toggle}}
          {{on 'blur' this.handleBlur}}
        >
          <p class='dropdown-toggle-caption'>{{this.caption}}</p>
          <FaIcon class='dropdown-toggle-icon' @icon='chevron-down' />
        </button>
        <label class='dropdown-label' for='{{this.componentId}}-button'>
          {{@label}}
        </label>
        <div class='dropdown-menu {{if this.expanded "dropdown-menu-visible"}}'>
          {{#each this.options as |option|}}
            <button
              class='dropdown-item
                {{if (eq option this.selectedOption) "dropdown-item-selected"}}'
              type='button'
              {{on 'click' (fn this.handleItemClick option)}}
            >{{option.label}}</button>
          {{/each}}
        </div>
      </div>
      {{yield to='info'}}
    </div>
  </template>
}
