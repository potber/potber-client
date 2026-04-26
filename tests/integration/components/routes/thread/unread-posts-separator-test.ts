import { render } from '@ember/test-helpers';
import type { TestContext } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import type Post from 'potber-client/models/post';
import type Thread from 'potber-client/models/thread';
import { setupRenderingTest } from 'potber-client/tests/helpers';

interface Context extends TestContext {
  element: HTMLElement;
  post: Post;
  posts: Post[];
  thread: Thread;
}

function createPosts(count: number): Post[] {
  return Array.from({ length: count }, (_, index) => {
    return { id: `${index + 1}` } as Post;
  });
}

function createThread(posts: Post[], pageNumber = 1, pagesCount = 2): Thread {
  return {
    id: '219289',
    title: 'potber',
    boardId: '14',
    repliesCount: 0,
    hitsCount: 0,
    pagesCount,
    isClosed: false,
    isSticky: false,
    isImportant: false,
    isAnnouncement: false,
    isGlobal: false,
    page: {
      number: pageNumber,
      offset: (pageNumber - 1) * posts.length,
      postCount: posts.length,
      posts,
    },
  };
}

module(
  'Integration | Component | Routes | Thread | Unread posts separator',
  function (hooks) {
    setupRenderingTest(hooks);

    test('renders plain text when unread posts continue on the current page', async function (this: Context, assert) {
      const posts = createPosts(30);
      this.set('posts', posts);
      this.set('post', posts[10] as Post);
      this.set('thread', createThread(posts));

      await render<Context>(hbs`
        <Routes::Thread::UnreadPostsSeparator
          @post={{this.post}}
          @posts={{this.posts}}
          @thread={{this.thread}}
        />
      `);

      assert.dom('p').hasText('Neue Posts');
      assert.dom('a').doesNotExist();
    });

    test('links to the next page when unread posts start there', async function (this: Context, assert) {
      const posts = createPosts(30);
      this.set('posts', posts);
      this.set('post', posts[29] as Post);
      this.set('thread', createThread(posts));

      await render<Context>(hbs`
        <Routes::Thread::UnreadPostsSeparator
          @post={{this.post}}
          @posts={{this.posts}}
          @thread={{this.thread}}
        />
      `);

      assert.dom('a').hasText('Neue Posts auf der nächsten Seite');
      const href = this.element.querySelector('a')?.getAttribute('href') ?? '';
      assert.true(href.includes('TID=219289'), 'links to the current thread');
      assert.true(href.includes('page=2'), 'links to the next page');
    });
  },
);
