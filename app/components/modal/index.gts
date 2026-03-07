import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import ConfirmModal, {
  type ConfirmModalOptions,
} from 'potber-client/components/modal/types/confirm';
import type { InfoModalOptions } from 'potber-client/components/modal/types/info/types';
import InfoModal from 'potber-client/components/modal/types/info';
import IconSelectModal, {
  type IconSelectModalOptions,
} from 'potber-client/components/modal/types/icon-select';
import ImageInsertModal, {
  type ImageInsertModalOptions,
} from 'potber-client/components/modal/types/image-insert';
import InputModal, {
  type InputModalOptions,
} from 'potber-client/components/modal/types/input';
import LinkInsertModal, {
  type LinkInsertModalOptions,
} from 'potber-client/components/modal/types/link-insert';
import ListModal, {
  type ListModalOptions,
} from 'potber-client/components/modal/types/list';
import MemeSelectModal, {
  type MemeSelectModalOptions,
} from 'potber-client/components/modal/types/meme-select';
import PostPreviewModal, {
  type PostPreviewModalOptions,
} from 'potber-client/components/modal/types/post-preview';
import UserProfileModal, {
  type UserProfileModalOptions,
} from 'potber-client/components/modal/types/user-profile';
import ModalService from 'potber-client/services/modal';
import { ModalType } from 'potber-client/services/modal';

export default class ModalComponent extends Component {
  @service declare modal: ModalService;

  modalTypes = ModalType;

  get activeModal() {
    return this.modal.activeModal;
  }

  get activeModalType() {
    return this.activeModal.type ?? '';
  }

  get confirmOptions() {
    if (this.activeModal.type !== ModalType.confirm) return undefined;
    return this.activeModal.options as ConfirmModalOptions;
  }

  get infoOptions() {
    if (this.activeModal.type !== ModalType.info) return undefined;
    return this.activeModal.options as InfoModalOptions;
  }

  get inputOptions() {
    if (this.activeModal.type !== ModalType.input) return undefined;
    return this.activeModal.options as InputModalOptions;
  }

  get iconSelectOptions() {
    if (this.activeModal.type !== ModalType.iconSelect) return undefined;
    return this.activeModal.options as IconSelectModalOptions;
  }

  get memeSelectOptions() {
    if (this.activeModal.type !== ModalType.memeSelect) return undefined;
    return this.activeModal.options as MemeSelectModalOptions;
  }

  get linkInsertOptions() {
    if (this.activeModal.type !== ModalType.linkInsert) return undefined;
    return this.activeModal.options as LinkInsertModalOptions;
  }

  get listOptions() {
    if (this.activeModal.type !== ModalType.list) return undefined;
    return this.activeModal.options as ListModalOptions;
  }

  get imageInsertOptions() {
    if (this.activeModal.type !== ModalType.imageInsert) return undefined;
    return this.activeModal.options as ImageInsertModalOptions;
  }

  get postPreviewOptions() {
    if (this.activeModal.type !== ModalType.postPreview) return undefined;
    return this.activeModal.options as PostPreviewModalOptions;
  }

  get userProfileOptions() {
    if (this.activeModal.type !== ModalType.userProfile) return undefined;
    return this.activeModal.options as UserProfileModalOptions;
  }

  @action handleModalCancel(event: Event) {
    event.preventDefault();
    this.modal.close();
  }

  <template>
    <dialog
      id='modal'
      {{on 'cancel' this.handleModalCancel}}
      data-modal={{this.activeModalType}}
    >
      {{#if this.confirmOptions}}
        <ConfirmModal @options={{this.confirmOptions}} />
      {{else if this.infoOptions}}
        <InfoModal @options={{this.infoOptions}} />
      {{else if this.inputOptions}}
        <InputModal @options={{this.inputOptions}} />
      {{else if this.iconSelectOptions}}
        <IconSelectModal @options={{this.iconSelectOptions}} />
      {{else if this.memeSelectOptions}}
        <MemeSelectModal @options={{this.memeSelectOptions}} />
      {{else if this.linkInsertOptions}}
        <LinkInsertModal @options={{this.linkInsertOptions}} />
      {{else if this.listOptions}}
        <ListModal @options={{this.listOptions}} />
      {{else if this.imageInsertOptions}}
        <ImageInsertModal @options={{this.imageInsertOptions}} />
      {{else if this.postPreviewOptions}}
        <PostPreviewModal @options={{this.postPreviewOptions}} />
      {{else if this.userProfileOptions}}
        <UserProfileModal @options={{this.userProfileOptions}} />
      {{/if}}
    </dialog>
    <button
      id='modal-backdrop'
      type='button'
      {{on 'click' this.handleModalCancel}}
      aria-hidden='true'
    />
  </template>
}
