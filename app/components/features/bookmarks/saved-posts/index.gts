import eq from 'ember-truth-helpers/helpers/eq';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import SavedPost from './post';
import type Post from 'potber-client/models/post';
import LocalStorageService from 'potber-client/services/local-storage';

interface Signature {
  Args: {
    savedPosts: Post[] | null | undefined;
  };
}

export default class BookmarksSavedPostsComponent extends Component<Signature> {
  @service declare localStorage: LocalStorageService;

  get rawSavedPosts() {
    return this.args.savedPosts;
  }

  get savedPosts() {
    return this.rawSavedPosts ?? [];
  }

  get status() {
    if (!this.rawSavedPosts) {
      return 'error';
    } else if (this.savedPosts.length === 0) {
      return 'empty';
    } else {
      return 'ok';
    }
  }

  <template>
    {{#if (eq this.status 'error')}}
      <p class='subtitle text-center'>(╯°□°)╯︵ ┻━┻<br /><br />Beim Laden Deiner
        gespeicherten Posts ist etwas schiefgegangen. Probier es später nochmal.</p>
    {{else if (eq this.status 'empty')}}
      <p class='subtitle text-center'>Du hast keine Posts gespeichert.</p>
    {{else}}
      {{#each this.savedPosts as |post|}}
        <SavedPost @post={{post}} />
      {{/each}}
    {{/if}}
  </template>
}
