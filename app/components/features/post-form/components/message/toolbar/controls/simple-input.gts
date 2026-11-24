import { service } from '@ember/service';
import type {
  IconName,
  IconPrefix,
} from '@fortawesome/fontawesome-common-types';
import Component from '@glimmer/component';
import Button from 'potber-client/components/common/control/button';
import ModalService from 'potber-client/services/modal';
import { insertMarkup, type MarkupControlSignature } from '../insert-markup';

interface Signature {
  Args: MarkupControlSignature['Args'] & {
    opening: string;
    closing: string;
    title: string;
    icon: IconName;
    label: string;
    prefix?: IconPrefix;
    type?: 'number' | 'text' | 'url';
    useTextarea?: boolean;
  };
}

export default class PostFormMessageSimpleInput extends Component<Signature> {
  @service declare modal: ModalService;

  get type() {
    return this.args.type || 'text';
  }

  handleClick = () => {
    this.modal.input({
      title: this.args.title,
      icon: this.args.icon,
      prefix: this.args.prefix,
      label: this.args.label,
      type: this.type,
      useTextarea: this.args.useTextarea,
      onSubmit: this.handleSubmit,
    });
  };

  handleSubmit = (value: string) => {
    const insertion = `${this.args.opening}${value}${this.args.closing}`;
    insertMarkup(this.args.post, this.args.textarea, insertion, this.modal);
  };

  <template>
    <Button
      @icon={{@icon}}
      @prefix={{@prefix}}
      @variant='primary-transparent'
      @text={{@title}}
      @size='square'
      @type='button'
      @onClick={{this.handleClick}}
    />
  </template>
}
