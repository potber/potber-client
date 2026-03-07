import eq from 'ember-truth-helpers/helpers/eq';
import Component from '@glimmer/component';
import BookmarkedThread from './thread';
import { Bookmark } from 'potber-client/services/api/models/bookmark';

interface Signature {
  Args: {
    bookmarks: Bookmark[] | null | undefined;
  };
}

export default class BookmarksThreadsComponent extends Component<Signature> {
  get bookmarks() {
    return (this.args.bookmarks ?? []).filter(
      (bookmark) => !bookmark.isDeleted,
    );
  }

  get status() {
    if (!this.args.bookmarks) {
      return 'error';
    } else if (this.bookmarks.length === 0) {
      return 'empty';
    } else {
      return 'ok';
    }
  }

  <template>
    {{#if (eq this.status 'error')}}
      <p class='subtitle text-center'>(╯°□°)╯︵ ┻━┻<br /><br />Beim Laden Deiner
        Lesezeichen ist etwas schiefgegangen. Probier es später nochmal.</p>
    {{else if (eq this.status 'empty')}}
      <p class='subtitle text-center'>Du hast keine Lesezeichen gespeichert.</p>
    {{else}}
      {{#each this.bookmarks as |bookmark|}}
        <BookmarkedThread @bookmark={{bookmark}} />
      {{/each}}
    {{/if}}
  </template>
}
