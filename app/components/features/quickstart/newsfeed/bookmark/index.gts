import { action } from '@ember/object';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { hash } from '@ember/helper';
import FaIcon from '@fortawesome/ember-fontawesome/components/fa-icon';
import ControlLink from 'potber-client/components/common/control/link';
import { Bookmark } from 'potber-client/services/api/models/bookmark';
import RendererService from 'potber-client/services/renderer';

interface Signature {
  Args: {
    bookmark: Bookmark;
    inSidebar: boolean;
  };
}

export default class QuickstartNewsfeedBookmarkComponent extends Component<Signature> {
  @service declare renderer: RendererService;
  declare args: Signature['Args'];

  get subtitle() {
    if (this.args.bookmark.newPostsCount === 1) {
      return `${this.args.bookmark.newPostsCount} neuer Post`;
    } else {
      return `${this.args.bookmark.newPostsCount} neue Posts`;
    }
  }

  get isClosed() {
    return this.args.bookmark.thread?.isClosed;
  }

  @action handleLinkClick() {
    if (this.args.inSidebar && !this.renderer.isDesktop) {
      this.renderer.toggleLeftSidebar(false);
    }
  }

  <template>
    <div class='quickstart-item'>
      <ControlLink
        class='flex-row align-items-center justify-content-start'
        @route='authenticated.thread'
        @query={{hash
          TID=@bookmark.thread.id
          PID=@bookmark.postId
          lastReadPost=@bookmark.postId
          page=undefined
          scrollToBottom=undefined
        }}
        @variant='primary'
        @onClick={{this.handleLinkClick}}
      >
        <FaIcon
          @icon={{if this.isClosed 'lock' 'bookmark'}}
          class='fg-text-subtle'
        />
        <div class='text-start'>
          <p class='title max-lines-2'> {{@bookmark.thread.title}}</p>
          <p class='subtitle'>{{this.subtitle}}</p>
        </div>
      </ControlLink>
    </div>
  </template>
}
