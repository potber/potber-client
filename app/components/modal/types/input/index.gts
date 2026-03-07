import { action } from '@ember/object';
import { on } from '@ember/modifier';
import type Owner from '@ember/owner';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import type {
  IconName,
  IconPrefix,
} from '@fortawesome/fontawesome-common-types';
import Button from 'potber-client/components/common/control/button';
import Input from 'potber-client/components/common/control/input';
import Textarea from 'potber-client/components/common/control/textarea';
import ModalContent from 'potber-client/components/modal/component/content';
import ModalFooter from 'potber-client/components/modal/component/footer';
import ModalHeader from 'potber-client/components/modal/component/header';
import ModalService from 'potber-client/services/modal';

export interface InputModalOptions {
  title: string;
  variant?: ModalVariant;
  icon?: IconName;
  prefix?: IconPrefix;
  text?: string;
  label: string;
  value?: string;
  type?: 'text' | 'number' | 'url';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  submitLabel?: string;
  submitIcon?: IconName;
  cancelLabel?: string;
  cancelIcon?: IconName;
  useTextarea?: boolean;
  onSubmit?: (value: string) => void;
}

interface Signature {
  Args: {
    options: InputModalOptions;
  };
}

export default class InputModalComponent extends Component<Signature> {
  @service declare modal: ModalService;
  value = '';

  constructor(owner: Owner, args: Signature['Args']) {
    super(owner, args);
    this.value = args.options.value ?? '';
  }

  get type() {
    return this.args.options.type || 'text';
  }

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

  @action handleChange(value: string) {
    this.value = value;
  }

  @action handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (this.args.options.onSubmit) {
      this.args.options.onSubmit(this.value);
    }
  }

  @action handleCancel() {
    this.modal.close();
  }

  <template>
    <ModalHeader
      @title={{@options.title}}
      @icon={{@options.icon}}
      @prefix={{@options.prefix}}
      @variant={{@options.variant}}
    />
    <ModalContent>
      {{#if @options.text}}
        <p>{{@options.text}}</p>
      {{/if}}
      <form id='input-modal-form' {{on 'submit' this.handleSubmit}}>
        {{#if @options.useTextarea}}
          <Textarea
            @size='max'
            @value={{this.value}}
            @onChange={{this.handleChange}}
            @selectAllOnFocus={{true}}
            @required={{true}}
            placeholder={{@options.label}}
            minlength={{@options.minLength}}
            maxlength={{@options.maxLength}}
          />
        {{else}}
          <Input
            @label={{@options.label}}
            @size='max'
            @value={{this.value}}
            @onChange={{this.handleChange}}
            @selectAllOnFocus={{true}}
            @required={{true}}
            type={{this.type}}
            minlength={{@options.minLength}}
            maxlength={{@options.maxLength}}
            min={{@options.min}}
            max={{@options.max}}
          />
        {{/if}}
      </form>
    </ModalContent>
    <ModalFooter>
      <Button
        @icon={{this.cancelIcon}}
        @text={{this.cancelLabel}}
        @variant='secondary-transparent'
        @size='small'
        @onClick={{this.handleCancel}}
      />
      <Button
        @icon={{this.submitIcon}}
        @text={{this.submitLabel}}
        @type='submit'
        @variant='primary'
        @size='small'
        form='input-modal-form'
      />
    </ModalFooter>
  </template>
}
