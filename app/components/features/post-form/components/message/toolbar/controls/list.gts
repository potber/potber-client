import { service } from '@ember/service';
import Component from '@glimmer/component';
import { t } from 'ember-intl';
import Button from 'potber-client/components/common/control/button';
import ModalService from 'potber-client/services/modal';
import { ListType } from 'potber-client/components/modal/types/list';
import { insertMarkup, type MarkupControlSignature } from '../insert-markup';

export default class PostFormMessageList extends Component<MarkupControlSignature> {
  @service declare modal: ModalService;

  handleClick = () => {
    this.modal.list({
      onSubmit: this.handleSubmit,
    });
  };

  handleSubmit = (type: ListType, entries: string[]) => {
    const typeModifier =
      type === ListType.Numerical
        ? '=1'
        : type === ListType.Alphabetical
          ? '=a'
          : '';
    const insertion = `[list${typeModifier}]\n${entries
      .map((item) => `[*]${item}`)
      .join('\n')}[/list]`;
    insertMarkup(this.args.post, this.args.textarea, insertion, this.modal);
  };

  <template>
    <Button
      @icon='list'
      @text={{t 'feature.post-form.message.toolbar.list.title'}}
      @variant='primary-transparent'
      @size='square'
      @type='button'
      @onClick={{this.handleClick}}
    />
  </template>
}
