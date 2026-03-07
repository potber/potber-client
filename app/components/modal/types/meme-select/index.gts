import { action } from '@ember/object';
import { fn } from '@ember/helper';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import Button from 'potber-client/components/common/control/button';
import Accordion from 'potber-client/components/common/control/accordion';
import ModalContent from 'potber-client/components/modal/component/content';
import ModalFooter from 'potber-client/components/modal/component/footer';
import ModalHeader from 'potber-client/components/modal/component/header';
import { parseMemeUrl } from 'potber-client/helpers/parse-meme-url';
import ModalService from 'potber-client/services/modal';
import type { Meme } from 'potber-client/utils/memes';
import { memeCategories } from 'potber-client/utils/memes';

export interface MemeSelectModalOptions {
  onSelect: (url: string) => void;
}

interface Signature {
  Args: {
    options: MemeSelectModalOptions;
  };
}

interface DisplayMeme extends Meme {
  src: string;
}

interface DisplayMemeCategory {
  name: string;
  memes: DisplayMeme[];
}

export default class MemeSelectModalComponent extends Component<Signature> {
  @service declare modal: ModalService;

  get memeCategories() {
    return memeCategories.map((memeCategory) => ({
      ...memeCategory,
      memes: memeCategory.memes.map((meme) => ({
        ...meme,
        src: parseMemeUrl([meme.url]),
      })),
    })) as DisplayMemeCategory[];
  }

  @action handleSelect(meme: Meme) {
    const url = parseMemeUrl([meme.url]);
    this.args.options.onSelect(url);
  }

  @action handleCancel() {
    this.modal.close();
  }

  <template>
    <ModalHeader @title='Memes' @icon='fire' @variant='default' />
    <ModalContent>
      {{#each this.memeCategories as |memeCategory|}}
        <Accordion @title={{memeCategory.name}} @variant='primary-transparent'>
          <div class='modal-select-meme-container'>
            {{#each memeCategory.memes as |meme|}}
              <Button
                @variant='secondary-transparent'
                @onClick={{fn this.handleSelect meme}}
                class='modal-select-meme-element modal-select-meme-element-width-{{meme.width}}'
              >
                <img src={{meme.src}} alt={{meme.id}} />
              </Button>
            {{/each}}
          </div>
        </Accordion>
      {{/each}}
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
