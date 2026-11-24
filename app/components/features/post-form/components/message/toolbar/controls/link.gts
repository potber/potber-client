import { service } from '@ember/service';
import Component from '@glimmer/component';
import { t } from 'ember-intl';
import Button from 'potber-client/components/common/control/button';
import ModalService from 'potber-client/services/modal';
import { insertMarkup, type MarkupControlSignature } from '../insert-markup';

export default class PostFormMessageLink extends Component<MarkupControlSignature> {
  @service declare modal: ModalService;

  handleClick = () => {
    this.modal.linkInsert({
      onSubmit: this.handleSubmit,
    });
  };

  handleSubmit = (url: string, text: string) => {
    const insertion = `[url=${url}]${text}[/url]`;
    insertMarkup(this.args.post, this.args.textarea, insertion, this.modal);
  };

  <template>
    <Button
      @icon='link'
      @text={{t 'feature.post-form.message.toolbar.link.title'}}
      @variant='primary-transparent'
      @size='square'
      @type='button'
      @onClick={{this.handleClick}}
    />
  </template>
}
