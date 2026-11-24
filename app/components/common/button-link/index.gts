import { LinkTo } from '@ember/routing';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import styles from './styles.module.css';
import RendererService from 'potber-client/services/renderer';
import { on } from '@ember/modifier';
import classNames from 'potber-client/helpers/class-names';

export interface Signature {
  Element: HTMLElement;
  Args: {
    route: string;
    model?: string;
    query?: Record<string, unknown>;
    size?: ControlSize;
    variant?: ControlVariant;
    title?: string;
    disabled?: boolean;
    disabledClass?: string;
    iconSize?: IconSize;
    onClick?: () => void;
  };
  Blocks: {
    default: [];
  };
}

export default class ButtonLink extends Component<Signature> {
  styles = styles;

  @service declare renderer: RendererService;
  declare args: Signature['Args'];

  handleClick = (event: MouseEvent) => {
    this.renderer.createClickRipple(event);
    if (this.args.onClick) {
      this.args.onClick();
    }
  };

  get variant() {
    return this.args.variant || 'primary-transparent';
  }

  get iconSize() {
    return this.args.iconSize || 'auto';
  }

  get query() {
    return this.args.query || {};
  }

  get models() {
    return this.args.model ? [this.args.model] : [];
  }

  <template>
    <LinkTo
      class='button-link control-size-{{@size}}
        icon-size-{{this.iconSize}}
        control-variant-{{this.variant}}
        {{if
          @disabled
          (if @disabledClass @disabledClass (classNames this "disabled"))
        }}'
      @route={{@route}}
      @query={{this.query}}
      @models={{this.models}}
      @disabled={{@disabled}}
      {{on 'click' this.handleClick}}
      ...attributes
    >
      {{yield}}
    </LinkTo>
  </template>
}
