import { LinkTo } from '@ember/routing';
import Component from '@glimmer/component';
import type Post from 'potber-client/models/post';
import type Thread from 'potber-client/models/thread';
import styles from './styles.module.css';
import classNames from 'potber-client/helpers/class-names';

interface Signature {
  Args: {
    post: Post;
    posts: Post[];
    thread: Thread;
  };
}

export default class UnreadPostsSeparator extends Component<Signature> {
  styles = styles;

  get hasUnreadPostsOnNextPage() {
    const { post, posts, thread } = this.args;
    const page = thread.page;

    if (!page) return false;

    return (
      posts.indexOf(post) === posts.length - 1 &&
      page.number < thread.pagesCount
    );
  }

  get nextPageQuery() {
    const nextPage = this.args.thread.page?.number
      ? this.args.thread.page.number + 1
      : undefined;

    return {
      TID: this.args.thread.id,
      page: nextPage,
      PID: undefined,
      lastReadPost: undefined,
      scrollToBottom: undefined,
    };
  }

  get text() {
    if (this.hasUnreadPostsOnNextPage) {
      return 'Neue Posts auf der nächsten Seite';
    } else return 'Neue Posts';
  }

  <template>
    <span class={{classNames this 'separator'}}>
      <hr />
      <p>
        {{#if this.hasUnreadPostsOnNextPage}}
          <LinkTo
            @route='authenticated.thread'
            @query={{this.nextPageQuery}}
            class={{classNames this 'text-link'}}
            title='Zur nächsten Seite'
          >
            {{this.text}}
          </LinkTo>
        {{else}}
          {{this.text}}
        {{/if}}
      </p>
    </span>
  </template>
}
