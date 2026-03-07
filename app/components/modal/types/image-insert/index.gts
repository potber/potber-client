import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import t from 'ember-intl/helpers/t';
import Button from 'potber-client/components/common/control/button';
import Input from 'potber-client/components/common/control/input';
import ModalContent from 'potber-client/components/modal/component/content';
import ModalFooter from 'potber-client/components/modal/component/footer';
import ModalHeader from 'potber-client/components/modal/component/header';
import ModalService from 'potber-client/services/modal';

interface Values {
  src: string;
  thumbnail: string;
}

export interface ImageInsertModalOptions {
  onSubmit: (values: Values) => void;
}

interface Signature {
  Args: {
    options: ImageInsertModalOptions;
  };
}

export default class ImageInsertModalComponent extends Component<Signature> {
  declare args: Signature['Args'];
  @service declare modal: ModalService;

  formId = 'image-insert-modal-form';

  values: Values = {
    src: '',
    thumbnail: '',
  };

  @action handleSrcChange(value: string) {
    this.values.src = value;
  }

  @action handleThumbnailChange(value: string) {
    this.values.thumbnail = value;
  }

  @action handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const form = document.getElementById(this.formId) as HTMLFormElement;
    if (form.reportValidity()) {
      this.args.options.onSubmit(this.values);
    }
  }

  @action handleCancel() {
    this.modal.close();
  }

  <template>
    <ModalHeader
      @title={{t 'feature.post-form.message.toolbar.image.modal.title'}}
      @icon='image'
    />
    <ModalContent>
      <form id={{this.formId}} {{on 'submit' this.handleSubmit}}>
        <Input
          @label={{t 'feature.post-form.message.toolbar.image.modal.src'}}
          @size='max'
          @onChange={{this.handleSrcChange}}
          @required={{true}}
          @value={{this.values.src}}
          type='url'
        />
        <Input
          @label={{t 'feature.post-form.message.toolbar.image.modal.thumbnail'}}
          @size='max'
          @onChange={{this.handleThumbnailChange}}
          @value={{this.values.thumbnail}}
          type='url'
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
        form={{this.formId}}
      />
    </ModalFooter>
  </template>
}
