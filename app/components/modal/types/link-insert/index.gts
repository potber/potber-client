import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import t from 'ember-intl/helpers/t';
import Button from 'potber-client/components/common/control/button';
import Input from 'potber-client/components/common/control/input';
import ModalContent from 'potber-client/components/modal/component/content';
import ModalFooter from 'potber-client/components/modal/component/footer';
import ModalHeader from 'potber-client/components/modal/component/header';
import ModalService from 'potber-client/services/modal';

export interface LinkInsertModalOptions {
  onSubmit: (url: string, text: string) => void;
}

interface Signature {
  Args: {
    options: LinkInsertModalOptions;
  };
}

export default class LinkInsertModalComponent extends Component<Signature> {
  @service declare modal: ModalService;

  @tracked url = '';
  @tracked text = '';

  @action handleUrlchange(value: string) {
    this.url = value;
    if (!this.text) this.text = this.url;
  }

  @action handleTextchange(value: string) {
    this.text = value;
  }

  @action handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    this.args.options.onSubmit(this.url, this.text);
  }

  @action handleCancel() {
    this.modal.close();
  }

  <template>
    <ModalHeader
      @title={{t 'feature.post-form.message.toolbar.link.modal.title'}}
      @icon='link'
    />
    <ModalContent>
      <form id='link-insert-modal-form' {{on 'submit' this.handleSubmit}}>
        <Input
          @label={{t 'feature.post-form.message.toolbar.link.modal.url'}}
          @size='max'
          @value={{this.url}}
          @onChange={{this.handleUrlchange}}
          @selectAllOnFocus={{true}}
          @required={{true}}
          type='url'
        />
        <Input
          @label={{t 'feature.post-form.message.toolbar.link.modal.text'}}
          @size='max'
          @value={{this.text}}
          @onChange={{this.handleTextchange}}
          @selectAllOnFocus={{true}}
          @required={{true}}
          type='text'
        />
      </form>
    </ModalContent>
    <ModalFooter>
      <Button
        @text='Schließen'
        @variant='secondary-transparent'
        @size='small'
        @onClick={{this.handleCancel}}
      />
      <Button
        @text='OK'
        @type='submit'
        @variant='primary'
        @size='small'
        form='link-insert-modal-form'
      />
    </ModalFooter>
  </template>
}
