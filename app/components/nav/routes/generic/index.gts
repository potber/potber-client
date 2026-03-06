import { action } from '@ember/object';
import Component from '@glimmer/component';
import Portal from 'ember-stargate/components/portal';
import Button from 'potber-client/components/common/control/button';
import NavHeader from '../../component/header';

interface Signature {
  Args: {
    title: string;
    subtitle?: string;
    enableBackNavigation?: boolean;
  };
}

export default class NavGenericComponent extends Component<Signature> {
  @action handleBackClick() {
    history.back();
  }

  <template>
    <Portal @target='top-nav'>
      <NavHeader @title={{@title}} @subtitle={{@subtitle}} />
    </Portal>

    {{#if @enableBackNavigation}}
      <Portal @target='bottom-nav'>
        <Button
          @title='Zurück'
          @icon='arrow-up'
          @size='square'
          @variant='primary-transparent'
          @onClick={{this.handleBackClick}}
          class='nav-element-left'
        />
      </Portal>
    {{/if}}
  </template>
}
