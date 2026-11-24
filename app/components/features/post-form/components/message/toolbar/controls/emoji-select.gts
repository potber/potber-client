import { on } from '@ember/modifier';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { t } from 'ember-intl';
import Button from 'potber-client/components/common/control/button';
import ModalService from 'potber-client/services/modal';
import { getRandomEmojiIcon } from 'potber-client/utils/icons';
import { insertMarkup, type MarkupControlSignature } from '../insert-markup';

export default class PostFormMessageEmojiSelect extends Component<MarkupControlSignature> {
  @service declare modal: ModalService;

  get randomEmojiIcon() {
    return getRandomEmojiIcon();
  }

  handleClick = () => {
    this.modal.iconSelect({
      type: 'post-emoji',
      onSelect: this.handleSelect,
    });
  };

  handleSelect = (key: string) => {
    insertMarkup(this.args.post, this.args.textarea, key, this.modal);
  };

  <template>
    <Button
      @icon={{this.randomEmojiIcon}}
      @prefix='far'
      @text={{t 'feature.post-form.message.toolbar.emojis'}}
      @variant='primary-transparent'
      @size='square'
      @type='button'
      {{on 'click' this.handleClick}}
    />
  </template>
}
