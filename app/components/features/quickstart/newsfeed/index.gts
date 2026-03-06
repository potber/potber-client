import eq from 'ember-truth-helpers/helpers/eq';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import Button from 'potber-client/components/common/control/button';
import NewsfeedService from 'potber-client/services/newsfeed';
import RendererService from 'potber-client/services/renderer';
import BookmarkStore from 'potber-client/services/stores/bookmark';
import PrivateMessageStore from 'potber-client/services/stores/private-message';
import NewsfeedBookmark from './bookmark';
import NewsfeedPrivateMessage from './private-message';

interface Signature {
  Args: {
    inSidebar?: boolean;
  };
}
export default class QuickstartNewsfeedComponent extends Component<Signature> {
  @service declare renderer: RendererService;
  @service declare newsfeed: NewsfeedService;
  @service('stores/bookmark') declare bookmarkStore: BookmarkStore;
  @service('stores/private-message')
  declare privateMessageStore: PrivateMessageStore;

  get inSidebar() {
    return this.args.inSidebar ?? false;
  }

  get status() {
    if (!this.rawUnreadBookmarks && !this.rawUnreadPrivateMessages) {
      return 'error';
    } else {
      if (
        this.unreadBookmarks?.length === 0 &&
        this.unreadPrivateMessages?.length === 0
      ) {
        return 'empty';
      } else {
        return 'ok';
      }
    }
  }

  get rawUnreadPrivateMessages() {
    return this.privateMessageStore.unread;
  }

  get unreadPrivateMessages() {
    return this.rawUnreadPrivateMessages ?? [];
  }

  get rawUnreadBookmarks() {
    return this.bookmarkStore.unread;
  }

  get unreadBookmarks() {
    return this.rawUnreadBookmarks ?? [];
  }

  get busy() {
    if (this.inSidebar) {
      return this.renderer.leftSidebarExpanded && this.newsfeed.isUpdating;
    } else {
      return this.newsfeed.isUpdating;
    }
  }

  refresh = async () => {
    await this.newsfeed.refresh();
  };

  <template>
    <h3 class='title text-center'>Neuigkeiten</h3>
    {{#if (eq this.status 'error')}}
      <p class='subtitle text-center'>(╯°□°)╯︵ ┻━┻<br /><br />Beim Laden Deiner
        Neugigkeiten ist etwas schiefgegangen.</p>
    {{else if (eq this.status 'empty')}}
      <p class='subtitle text-center'>Es gibt keine Neuigkeiten.</p>
    {{else}}
      {{#each this.unreadPrivateMessages as |privateMessage|}}
        <NewsfeedPrivateMessage
          @privateMessage={{privateMessage}}
          @inSidebar={{this.inSidebar}}
        />
      {{/each}}
      {{#each this.unreadBookmarks as |bookmark|}}
        <NewsfeedBookmark
          @bookmark={{bookmark}}
          @inSidebar={{this.inSidebar}}
        />
      {{/each}}
    {{/if}}
    <Button
      @icon='arrows-rotate'
      @text='Aktualisieren'
      @size='max'
      @busy={{this.busy}}
      @onClick={{this.refresh}}
      @variant='secondary-transparent'
    />
  </template>
}
