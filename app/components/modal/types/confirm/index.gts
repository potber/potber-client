import { action } from '@ember/object';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import type {
  IconName,
  IconPrefix,
} from '@fortawesome/fontawesome-common-types';
import Button from 'potber-client/components/common/control/button';
import ModalContent from 'potber-client/components/modal/component/content';
import ModalFooter from 'potber-client/components/modal/component/footer';
import ModalHeader from 'potber-client/components/modal/component/header';
import ModalService from 'potber-client/services/modal';

export interface ConfirmModalOptions {
  title: string;
  variant?: ModalVariant;
  icon?: IconName;
  prefix?: IconPrefix;
  text: string;
  submitLabel?: string;
  submitIcon?: IconName;
  cancelLabel?: string;
  cancelIcon?: IconName;
  alternativeLabel?: string;
  alternativeIcon?: IconName;
  alternativeVariant?: ControlVariant;
  hideCancel?: boolean;
  onSubmit?: () => void;
  onCancel?: () => void;
  onAlternative?: () => void;
}

interface Signature {
  Args: {
    options: ConfirmModalOptions;
  };
}

export default class ConfirmModalComponent extends Component<Signature> {
  @service declare modal: ModalService;
  declare args: Signature['Args'];

  get submitLabel() {
    return this.args.options.submitLabel || 'OK';
  }

  get cancelLabel() {
    return this.args.options.cancelLabel || 'Abbrechen';
  }

  get submitIcon() {
    return this.args.options.submitIcon;
  }

  get cancelIcon() {
    return this.args.options.cancelIcon;
  }

  get alternativeVariant() {
    return this.args.options.alternativeVariant ?? 'secondary';
  }

  get submitVariant(): ControlVariant {
    return this.args.options.variant === 'error' ? 'error' : 'primary';
  }

  @action handleSubmit() {
    if (this.args.options.onSubmit) {
      this.args.options.onSubmit();
    }
  }

  @action handleCancel() {
    this.modal.close();
    if (this.args.options.onCancel) {
      this.args.options.onCancel();
    }
  }

  @action handleAlternative() {
    this.args.options.onAlternative?.();
  }

  <template>
    <ModalHeader
      @title={{@options.title}}
      @icon={{@options.icon}}
      @variant={{@options.variant}}
    />
    <ModalContent>
      <p>{{@options.text}}</p>
    </ModalContent>
    <ModalFooter>
      {{#unless @options.hideCancel}}
        <Button
          @icon={{this.cancelIcon}}
          @text={{this.cancelLabel}}
          @variant='secondary-transparent'
          @size='small'
          @onClick={{this.handleCancel}}
        />
      {{/unless}}
      {{#if @options.alternativeLabel}}
        <Button
          @icon={{@options.alternativeIcon}}
          @text={{@options.alternativeLabel}}
          @variant={{this.alternativeVariant}}
          @size='auto'
          @onClick={{this.handleAlternative}}
          data-test-modal-alternative
        />
      {{/if}}
      <Button
        @icon={{this.submitIcon}}
        @text={{this.submitLabel}}
        @type='submit'
        @variant={{this.submitVariant}}
        @size='auto'
        @onClick={{this.handleSubmit}}
        class='modal-submit'
      />
    </ModalFooter>
  </template>
}
