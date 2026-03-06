import { action } from '@ember/object';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { hash } from '@ember/helper';
import FaIcon from '@fortawesome/ember-fontawesome/components/fa-icon';
import ControlLink from 'potber-client/components/common/control/link';
import Menu from 'potber-client/components/common/control/menu';
import MenuButton from 'potber-client/components/common/control/menu/button';
import { Bookmark } from 'potber-client/services/api/models/bookmark';
import MessagesService from 'potber-client/services/messages';

interface Signature {
  Args: {
    bookmark: Bookmark;
  };
}

export default class BookmarkedThread extends Component<Signature> {
  @service declare messages: MessagesService;
  declare args: Signature['Args'];

  get hasNewPosts() {
    return this.args.bookmark.newPostsCount > 0;
  }

  get subtitle() {
    if (this.args.bookmark.newPostsCount === 1) {
      return `1 neuer Post`;
    } else {
      return `${this.args.bookmark.newPostsCount} neue Posts`;
    }
  }

  get isClosed() {
    return this.args.bookmark.thread?.isClosed;
  }

  @action async handleDelete() {
    try {
      await this.args.bookmark.delete();
      this.messages.showNotification('Lesezeichen wurde entfernt.', 'success');
    } catch (error) {
      // Do nothing and let the user try again
    }
  }

  <template>
    <div class='bookmark {{if this.hasNewPosts "bookmark-unread"}}'>
      <ControlLink
        class='bookmark-link'
        @route='authenticated.thread'
        @query={{hash
          TID=@bookmark.thread.id
          PID=@bookmark.postId
          lastReadPost=undefined
          page=undefined
          scrollToBottom=undefined
        }}
      >
        <span class='bookmark-details'>
          <p
            class='title bookmark-title max-lines-1'
          >{{@bookmark.thread.title}}</p>
          <p class='subtitle bookmark-subtitle'>{{this.subtitle}}</p>
        </span>
        {{#if this.isClosed}}
          <FaIcon @icon='lock' class='bookmark-lock-icon' />
        {{/if}}
      </ControlLink>
      <Menu>
        <MenuButton
          @text='Lesezeichen entfernen'
          @icon='trash'
          @onClick={{this.handleDelete}}
        />
      </Menu>
    </div>
  </template>
}
