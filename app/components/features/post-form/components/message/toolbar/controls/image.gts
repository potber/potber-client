import Component from '@glimmer/component';
import Button from 'potber-client/components/common/control/button';
import ModalService from 'potber-client/services/modal';
import { service } from '@ember/service';
import { t } from 'ember-intl';
import { insertMarkup, type MarkupControlSignature } from '../insert-markup';

export default class PostFormMessageImage extends Component<MarkupControlSignature> {
  @service declare modal: ModalService;

  handleClick = () => {
    this.modal.imageInsert({
      onSubmit: this.handleSubmit,
    });
  };

  handleSubmit = (values: { src: string; thumbnail: string }) => {
    const { src, thumbnail } = values;
    let insertion: string;
    if (thumbnail) {
      insertion = `[url=${src}][img]${thumbnail}[/img][/url]`;
    } else {
      insertion = `[img]${src}[/img]`;
    }
    insertMarkup(this.args.post, this.args.textarea, insertion, this.modal);
  };

  <template>
    <Button
      @icon='image'
      @text={{t 'feature.post-form.message.toolbar.image.title'}}
      @variant='primary-transparent'
      @size='square'
      @type='button'
      @onClick={{this.handleClick}}
    />
  </template>
}
