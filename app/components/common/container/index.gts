import Component from '@glimmer/component';

interface Signature {
  Element: HTMLDivElement;
  Args: {
    title?: string;
    size?: 'small' | 'medium' | 'large' | 'max';
  };
  Blocks: {
    default: [];
  };
}

export default class CommonContainerComponent extends Component<Signature> {
  declare args: Signature['Args'];
  get size() {
    return this.args.size || 'medium';
  }

  <template>
    <div class='container container-size-{{this.size}}' ...attributes>
      {{#if @title}}
        <h1 class='container-title'>{{@title}}</h1>
        <hr />
      {{/if}}
      {{yield}}
    </div>
  </template>
}
