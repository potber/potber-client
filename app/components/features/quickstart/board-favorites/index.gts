import eq from 'ember-truth-helpers/helpers/eq';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import BoardFavoritesItem from './item';
import { Boards } from 'potber-client/services/api/types';
import LocalStorageService from 'potber-client/services/local-storage';

interface Signature {
  Args: {
    inSidebar: boolean;
  };
}

export default class QuickstartBopardFavoritesComponent extends Component<Signature> {
  @service declare localStorage: LocalStorageService;

  get rawBoards(): Boards.Read[] | null {
    return this.localStorage.boardFavorites;
  }

  get boards(): Boards.Read[] {
    return this.rawBoards ?? [];
  }

  get status() {
    if (!this.rawBoards) {
      return 'error';
    } else if (this.boards.length === 0) {
      return 'empty';
    } else {
      return 'ok';
    }
  }

  <template>
    <h3 class='title text-center'>Boards</h3>
    {{#if (eq this.status 'error')}}
      <p class='subtitle text-center'>(╯°□°)╯︵ ┻━┻<br /><br />Beim Laden Deiner
        Favoriten ist etwas schiefgegangen. Wenn Das Problem bestehen bleibt,
        setze am Besten Deine Einstellungen zurück.</p>
    {{else if (eq this.status 'empty')}}
      <p class='subtitle text-center no-margin'>Du hast noch keine Favoriten
        hinzugefügt.</p>
    {{else}}
      {{#each this.boards as |board|}}
        <BoardFavoritesItem @board={{board}} @inSidebar={{@inSidebar}} />
      {{/each}}
    {{/if}}
  </template>
}
