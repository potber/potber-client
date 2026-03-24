import { action } from '@ember/object';
import { fn } from '@ember/helper';
import type Owner from '@ember/owner';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import Button from 'potber-client/components/common/control/button';
import ModalContent from 'potber-client/components/modal/component/content';
import ModalFooter from 'potber-client/components/modal/component/footer';
import ModalHeader from 'potber-client/components/modal/component/header';
import ImgpotService, {
  getImgpotInsertValues,
  type ImgpotImage,
  type ImgpotInsertValues,
} from 'potber-client/services/imgpot';
import ModalService from 'potber-client/services/modal';

export interface ImgpotSelectModalOptions {
  onSelect: (values: ImgpotInsertValues) => void;
  onCancel?: () => void;
}

interface Signature {
  Args: {
    options: ImgpotSelectModalOptions;
  };
}

const IMAGE_PAGE_SIZE = 20;

export default class ImgpotSelectModalComponent extends Component<Signature> {
  @service declare modal: ModalService;
  @service declare imgpot: ImgpotService;

  @tracked images: ImgpotImage[] = [];
  @tracked loading = true;
  @tracked loadingMore = false;
  @tracked error = '';
  @tracked page = 1;
  @tracked total = 0;

  constructor(owner: Owner, args: Signature['Args']) {
    super(owner, args);
    void this.loadImages();
  }

  get hasImages() {
    return this.images.length > 0;
  }

  get hasMore() {
    return this.images.length < this.total;
  }

  getImagePreviewUrl(image: ImgpotImage) {
    const small = image.variations.find(
      (variation) => variation.variationType === 'small',
    );
    const medium = image.variations.find(
      (variation) => variation.variationType === 'medium',
    );
    const large = image.variations.find(
      (variation) => variation.variationType === 'large',
    );

    return (small ?? medium ?? large)?.cdnUrl ?? '';
  }

  async loadImages(page = 1) {
    if (page === 1) {
      this.loading = true;
      this.error = '';
    } else {
      this.loadingMore = true;
    }

    try {
      const response = await this.imgpot.listImages(page, IMAGE_PAGE_SIZE);
      this.images =
        page === 1 ? response.images : [...this.images, ...response.images];
      this.page = response.page;
      this.total = response.total;
    } catch (error) {
      this.error =
        error instanceof Error
          ? error.message
          : 'Bilder konnten nicht geladen werden.';
    } finally {
      this.loading = false;
      this.loadingMore = false;
    }
  }

  @action handleSelect(image: ImgpotImage) {
    this.args.options.onSelect(getImgpotInsertValues(image));
  }

  @action handleLoadMore() {
    if (!this.hasMore || this.loadingMore) {
      return;
    }

    void this.loadImages(this.page + 1);
  }

  @action handleCancel() {
    if (this.args.options.onCancel) {
      this.args.options.onCancel();
      return;
    }

    this.modal.close();
  }

  <template>
    <ModalHeader @title='Eigene Bilder' @icon='images' @variant='default' />
    <ModalContent>
      {{#if this.loading}}
        <p>Bilder werden geladen...</p>
      {{else if this.error}}
        <p>{{this.error}}</p>
      {{else if this.hasImages}}
        <div class='modal-select-imgpot-container'>
          {{#each this.images as |image|}}
            <Button
              @variant='secondary-transparent'
              @size='auto'
              @onClick={{fn this.handleSelect image}}
              class='modal-select-imgpot-image'
            >
              <img
                src={{this.getImagePreviewUrl image}}
                alt={{image.originalFilename}}
              />
              <span>{{image.originalFilename}}</span>
            </Button>
          {{/each}}
        </div>

        {{#if this.hasMore}}
          <Button
            @text='Mehr laden'
            @variant='secondary-transparent'
            @size='max'
            @busy={{this.loadingMore}}
            @onClick={{this.handleLoadMore}}
            class='modal-select-imgpot-load-more'
          />
        {{/if}}
      {{else}}
        <p>Du hast noch keine Bilder hochgeladen.</p>
      {{/if}}
    </ModalContent>
    <ModalFooter>
      <Button
        @text='Zurück'
        @variant='secondary-transparent'
        @size='small'
        @onClick={{this.handleCancel}}
      />
    </ModalFooter>
  </template>
}
