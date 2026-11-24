import { on } from '@ember/modifier';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { t } from 'ember-intl';
import Button from 'potber-client/components/common/control/button';
import ModalService from 'potber-client/services/modal';
import { insertMarkup, type MarkupControlSignature } from '../insert-markup';

export default class PostFormMessageMemeSelect extends Component<MarkupControlSignature> {
  @service declare modal: ModalService;

  handleClick = () => {
    this.modal.memeSelect({
      onSelect: this.handleSelect,
    });
  };

  handleSelect = (url: string) => {
    const insertion = `[img]${url}[/img]`;
    insertMarkup(this.args.post, this.args.textarea, insertion, this.modal);
  };

  <template>
    <Button
      @icon='fire'
      @text={{t 'feature.post-form.message.toolbar.memes'}}
      @variant='primary-transparent'
      @size='square'
      @type='button'
      {{on 'click' this.handleClick}}
    />
  </template>
}
