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
import ImgpotService, {
  type ImgpotImageUploadResponse,
} from 'potber-client/services/imgpot';
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
  @service declare imgpot: ImgpotService;

  formId = 'image-insert-modal-form';

  @tracked selectedFile: File | null = null;
  @tracked uploadError = '';
  @tracked uploading = false;

  values: Values = {
    src: '',
    thumbnail: '',
  };

  get hasSelectedFile() {
    return Boolean(this.selectedFile);
  }

  get uploadDisabled() {
    return !this.hasSelectedFile;
  }

  @action handleSrcChange(value: string) {
    this.values.src = value;
  }

  @action handleThumbnailChange(value: string) {
    this.values.thumbnail = value;
  }

  @action handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    this.uploadError = '';
  }

  private getUploadValues(image: ImgpotImageUploadResponse): Values {
    const large = image.variations.find(
      (variation) => variation.variationType === 'large',
    );
    const medium = image.variations.find(
      (variation) => variation.variationType === 'medium',
    );
    const fallback = image.variations[0];
    const inline = medium ?? large ?? fallback;
    const full = large ?? inline;

    if (!inline || !full) {
      throw new Error('Imgpot hat keine verwendbaren Varianten zurückgegeben.');
    }

    return {
      src: full.cdnUrl,
      thumbnail: full.cdnUrl === inline.cdnUrl ? '' : inline.cdnUrl,
    };
  }

  @action async handleUpload() {
    if (!this.selectedFile || this.uploading) {
      return;
    }

    this.uploading = true;
    this.uploadError = '';

    try {
      const image = await this.imgpot.uploadImage(this.selectedFile);
      this.args.options.onSubmit(this.getUploadValues(image));
    } catch (error) {
      this.uploadError =
        error instanceof Error
          ? error.message
          : 'Bild konnte nicht hochgeladen werden.';
    } finally {
      this.uploading = false;
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
        />
        <Input
          @label={{t 'feature.post-form.message.toolbar.image.modal.thumbnail'}}
          @size='max'
          @onChange={{this.handleThumbnailChange}}
          @value={{this.values.thumbnail}}
          type='url'
        />

        <hr />

        <label class='input-container control-size-max'>
          <span>{{t
              'feature.post-form.message.toolbar.image.modal.file'
            }}</span>
          <input
            type='file'
            accept='image/jpeg,image/png,image/gif,image/webp'
            {{on 'change' this.handleFileChange}}
          />
        </label>

        <p>{{t 'feature.post-form.message.toolbar.image.modal.upload-help'}}</p>

        {{#if this.uploadError}}
          <p>{{this.uploadError}}</p>
        {{/if}}

        <Button
          @text={{t 'feature.post-form.message.toolbar.image.modal.upload'}}
          @icon='upload'
          @variant='secondary-transparent'
          @size='small'
          @busy={{this.uploading}}
          @disabled={{this.uploadDisabled}}
          @onClick={{this.handleUpload}}
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
