import { action } from '@ember/object';
import { on } from '@ember/modifier';
import type Owner from '@ember/owner';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import t from 'ember-intl/helpers/t';
import Button from 'potber-client/components/common/control/button';
import Input from 'potber-client/components/common/control/input';
import ModalContent from 'potber-client/components/modal/component/content';
import ModalFooter from 'potber-client/components/modal/component/footer';
import ModalHeader from 'potber-client/components/modal/component/header';
import ImgpotService, {
  getImgpotInsertValues,
  type ImgpotInsertValues,
} from 'potber-client/services/imgpot';
import ModalService from 'potber-client/services/modal';

export interface ImageInsertModalOptions {
  onSubmit: (values: ImgpotInsertValues) => void;
  initialValues?: ImgpotInsertValues;
}

interface Signature {
  Args: {
    options: ImageInsertModalOptions;
  };
}

export default class ImageInsertModalComponent extends Component<Signature> {
  declare args: Signature['Args'];
  @service declare modal: ModalService;
  @service declare imgpot: ImgpotService;

  formId = 'image-insert-modal-form';
  fileInputId = 'image-insert-modal-file-input';

  @tracked uploadError = '';
  @tracked uploading = false;
  @tracked values: ImgpotInsertValues = {
    src: '',
    thumbnail: '',
  };

  constructor(owner: Owner, args: Signature['Args']) {
    super(owner, args);
    this.values = args.options.initialValues ?? {
      src: '',
      thumbnail: '',
    };
  }

  @action handleSrcChange(value: string) {
    this.values = {
      ...this.values,
      src: value,
    };
  }

  @action handleThumbnailChange(value: string) {
    this.values = {
      ...this.values,
      thumbnail: value,
    };
  }

  @action openFilePicker() {
    const input = document.getElementById(
      this.fileInputId,
    ) as HTMLInputElement | null;

    input?.click();
  }

  @action openImgpotBrowser() {
    const onSubmit = this.args.options.onSubmit;
    const initialValues = { ...this.values };

    this.modal.imgpotSelect({
      onSelect: (values) => {
        this.modal.imageInsert({
          onSubmit,
          initialValues: values,
        });
      },
      onCancel: () => {
        this.modal.imageInsert({
          onSubmit,
          initialValues,
        });
      },
    });
  }

  @action async handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const selectedFile = input.files?.[0];

    if (!selectedFile || this.uploading) {
      return;
    }

    this.uploading = true;
    this.uploadError = '';

    try {
      const image = await this.imgpot.uploadImage(selectedFile);
      this.values = getImgpotInsertValues(image);
    } catch (error) {
      this.uploadError =
        error instanceof Error
          ? error.message
          : 'Bild konnte nicht hochgeladen werden.';
    } finally {
      this.uploading = false;
      input.value = '';
    }
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
        >
          <Button
            @text={{t 'feature.post-form.message.toolbar.image.modal.upload'}}
            @icon='cloud-arrow-up'
            @variant='secondary-transparent'
            @size='square'
            @busy={{this.uploading}}
            @onClick={{this.openFilePicker}}
          />
          <Button
            @text={{t 'feature.post-form.message.toolbar.image.modal.browse'}}
            @icon='images'
            @variant='secondary-transparent'
            @size='square'
            @disabled={{this.uploading}}
            @onClick={{this.openImgpotBrowser}}
          />
        </Input>
        <Input
          @label={{t 'feature.post-form.message.toolbar.image.modal.thumbnail'}}
          @size='max'
          @onChange={{this.handleThumbnailChange}}
          @value={{this.values.thumbnail}}
          type='url'
        />

        <input
          id={{this.fileInputId}}
          type='file'
          accept='image/jpeg,image/png,image/gif,image/webp'
          hidden
          disabled={{this.uploading}}
          {{on 'change' this.handleFileChange}}
        />

        <p class='hint'>
          {{if
            this.uploading
            (t 'feature.post-form.message.toolbar.image.modal.uploading')
            (t 'feature.post-form.message.toolbar.image.modal.upload-help')
          }}
        </p>

        {{#if this.uploadError}}
          <p>{{this.uploadError}}</p>
        {{/if}}
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
