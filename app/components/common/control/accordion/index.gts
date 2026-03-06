import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import FaIcon from '@fortawesome/ember-fontawesome/components/fa-icon';
import Button from 'potber-client/components/common/control/button';

interface Signature {
  Args: {
    title?: string;
    size?: ControlSize;
    variant?: ControlVariant;
  };
  Blocks: {
    default: [];
  };
}

export default class AccordionComponent extends Component<Signature> {
  @tracked expanded = false;

  get size(): ControlSize {
    return this.args.size || 'max';
  }

  get variant(): ControlVariant {
    return this.args.variant || 'primary-transparent';
  }

  get icon() {
    if (this.expanded) {
      return 'chevron-down';
    } else {
      return 'chevron-right';
    }
  }

  @action toggle() {
    this.expanded = !this.expanded;
  }

  <template>
    <div class='accordion control-size-{{this.size}}'>
      <Button
        @text={{@title}}
        @size='max'
        @variant={{this.variant}}
        @onClick={{this.toggle}}
        class='accordion-toggle'
        data-test-accordion-toggle
      >
        <FaIcon @icon={{this.icon}} />
      </Button>
      <div class='accordion-content' data-test-accordion-content>
        {{#if this.expanded}}
          {{yield}}
        {{/if}}
      </div>
    </div>
  </template>
}
