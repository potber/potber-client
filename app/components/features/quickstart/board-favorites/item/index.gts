import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { hash } from '@ember/helper';
import ControlLink from 'potber-client/components/common/control/link';
import Menu from 'potber-client/components/common/control/menu';
import MenuButton from 'potber-client/components/common/control/menu/button';
import MenuLinkExternal from 'potber-client/components/common/control/menu/link-external';
import RendererService from 'potber-client/services/renderer';
import LocalStorageService from 'potber-client/services/local-storage';
import { appConfig } from 'potber-client/config/app.config';
import { Boards } from 'potber-client/services/api/types';

export interface Signature {
  Args: {
    board: Boards.Read;
    inSidebar: boolean;
  };
}

export default class QuickstartBoardFavoriteComponent extends Component<Signature> {
  @service declare localStorage: LocalStorageService;
  @service declare renderer: RendererService;
  declare args: Signature['Args'];

  get originalUrl() {
    return `${appConfig.forumUrl}board.php?BID=${this.args.board.id}`;
  }

  @action handleLinkClick() {
    if (this.args.inSidebar && !this.renderer.isDesktop) {
      this.renderer.closeSidebar();
    }
  }

  @action remove() {
    const boards = [...(this.localStorage.boardFavorites || [])];
    const index = boards.indexOf(this.args.board);
    boards.splice(index, 1);
    const remainingIds = boards.map((board) => board.id);
    this.localStorage.setBoardFavorites(remainingIds);
  }

  <template>
    <div class='quickstart-item'>
      <ControlLink
        class='flex-column flex-grow align-items-start justify-content-center'
        @route='authenticated.board'
        @query={{hash BID=@board.id page=undefined}}
        @variant='primary'
        @onClick={{this.handleLinkClick}}
      >
        <p class='title max-lines-1'> {{@board.name}}</p>
        <p class='subtitle max-lines-1'> {{@board.description}}</p>
      </ControlLink>
      <Menu @position='bottom-left' @variant='primary'>
        <MenuButton
          @text='Favorit entfernen'
          @icon='trash'
          @onClick={{this.remove}}
        />
        <MenuLinkExternal
          @text='Original öffnen'
          @icon='up-right-from-square'
          @href={{this.originalUrl}}
          target='_blank'
        />
      </Menu>
    </div>
  </template>
}
