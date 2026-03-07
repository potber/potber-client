import { action } from '@ember/object';
import { fn } from '@ember/helper';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import eq from 'ember-truth-helpers/helpers/eq';
import FaIcon from '@fortawesome/ember-fontawesome/components/fa-icon';
import type { EmojiKey, PostIconKey } from 'potber-client/config/icons.config';
import BoardIcon from 'potber-client/components/board/icon';
import Button from 'potber-client/components/common/control/button';
import ModalContent from 'potber-client/components/modal/component/content';
import ModalFooter from 'potber-client/components/modal/component/footer';
import ModalHeader from 'potber-client/components/modal/component/header';
import { emojis, postIcons } from 'potber-client/config/icons.config';
import ModalService from 'potber-client/services/modal';
import { getRandomEmojiIcon } from 'potber-client/utils/icons';

export interface IconSelectModalOptions {
  type: 'post-icon' | 'post-emoji';
  onSelect: (key: string) => void;
}

interface Signature {
  Args: {
    options: IconSelectModalOptions;
  };
}

interface IconOption {
  key: PostIconKey | EmojiKey;
  filename: string;
  directory: string;
}

export default class IconSelectModalComponent extends Component<Signature> {
  @service declare modal: ModalService;

  get title() {
    switch (this.args.options.type) {
      case 'post-icon':
        return 'Wähle ein Post-Icon';
      default:
        return 'Wähle einen Emoji';
    }
  }

  get randomEmojiIcon() {
    return getRandomEmojiIcon();
  }

  get options() {
    switch (this.args.options.type) {
      case 'post-icon':
        return postIcons.map((postIcon) => {
          return { ...postIcon, directory: 'post-icons' } as IconOption;
        });
      default:
        return emojis.map((emoji) => {
          return { ...emoji, directory: 'post-emojis' } as IconOption;
        });
    }
  }

  @action handleSelect(option: IconOption) {
    this.args.options.onSelect(option.key);
  }

  @action handleCancel() {
    this.modal.close();
  }

  <template>
    <ModalHeader
      @title={{this.title}}
      @icon={{this.randomEmojiIcon}}
      @prefix='far'
      @variant='default'
    />
    <ModalContent>
      <div class='modal-select-icon-option-container'>
        {{#each this.options as |option|}}
          <Button
            @variant='secondary-transparent'
            @size='square'
            @onClick={{fn this.handleSelect option}}
          >
            {{#if (eq option.key '0')}}
              <FaIcon @icon='times' />
            {{else}}
              <BoardIcon @icon={{option.key}} />
            {{/if}}
          </Button>
        {{/each}}
      </div>
    </ModalContent>
    <ModalFooter>
      <Button
        @text='Schließen'
        @variant='secondary-transparent'
        @size='small'
        @onClick={{this.handleCancel}}
      />
    </ModalFooter>
  </template>
}
