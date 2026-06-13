import Component from '@glimmer/component';
import threadScrollPosition from 'potber-client/modifiers/thread-scroll-position';

// eslint-disable-next-line ember/no-empty-glimmer-component-classes
export default class UpdateScrollPositionComponent extends Component {
  <template>
    <span
      aria-hidden='true'
      style='display: block; height: 0; pointer-events: none;'
      {{threadScrollPosition}}
    />
  </template>
}
