import { action } from '@ember/object';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { hash } from '@ember/helper';
import ControlLink from 'potber-client/components/common/control/link';
import Menu from 'potber-client/components/common/control/menu';
import MenuButton from 'potber-client/components/common/control/menu/button';
import type Post from 'potber-client/models/post';
import LocalStorageService from 'potber-client/services/local-storage';
import MessagesService from 'potber-client/services/messages';
import { formatDateTime } from 'potber-client/utils/date';

interface Signature {
  Args: {
    post: Post;
  };
}

export default class BookmarksSavedPostComponent extends Component<Signature> {
  @service declare messages: MessagesService;
  @service declare localStorage: LocalStorageService;
  declare args: Signature['Args'];

  get title() {
    let title = '';
    if (this.args.post.title) {
      title += this.args.post.title + ' — ';
    }
    title += this.args.post.message;
    return title;
  }

  get subtitle() {
    return `von ${this.args.post.author.name} am ${formatDateTime(
      this.args.post.date,
    )}`;
  }

  @action handleDelete() {
    try {
      this.localStorage.removeSavedPost(this.args.post.id);
      this.messages.showNotification('Post wurde entfernt.', 'success');
    } catch (error) {
      this.messages.logErrorAndNotify(
        'Das hat leider nicht geklappt',
        error,
        this.constructor.name,
      );
    }
  }

  <template>
    <div class='bookmark'>
      <ControlLink
        class='bookmark-link'
        @route='authenticated.thread'
        @query={{hash
          TID=@post.threadId
          PID=@post.id
          lastReadPost=undefined
          page=undefined
          scrollToBottom=undefined
        }}
      >
        <span class='bookmark-details'>
          <p class='title bookmark-title max-lines-1'>{{this.title}}</p>
          <p class='subtitle bookmark-subtitle'>{{this.subtitle}}</p>
        </span>
      </ControlLink>
      <Menu>
        <MenuButton
          @text='Gespeicherten Post entfernen'
          @icon='trash'
          @onClick={{this.handleDelete}}
        />
      </Menu>
    </div>
  </template>
}
