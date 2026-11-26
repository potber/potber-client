import Service from '@ember/service';
import { find, render, type TestContext } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import BoardItem from 'potber-client/components/routes/board/item';
import type { Threads } from 'potber-client/services/api/types';
import { setupRenderingTest } from 'potber-client/tests/helpers';

interface Context extends TestContext {
  BoardItem: typeof BoardItem;
  threads: Threads.Read[];
}

const thread: Threads.Read = {
  id: '42',
  title: 'Board thread',
  boardId: '14',
  repliesCount: 0,
  hitsCount: 0,
  pagesCount: 1,
  isAnnouncement: false,
  isClosed: false,
  isGlobal: false,
  isImportant: false,
  isSticky: false,
};

module('Integration | Component | Routes | Board | Item', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function (this: Context) {
    this.BoardItem = BoardItem;
  });

  test('hides announcements and global threads while leaving sticky board threads visible', async function (this: Context, assert) {
    this.owner.register(
      'service:settings',
      class extends Service {
        getSetting() {
          return true;
        }
      },
    );
    this.threads = [
      { ...thread, id: '1', title: 'Global thread', isGlobal: true },
      { ...thread, id: '2', title: 'Announcement', isAnnouncement: true },
      { ...thread, id: '3', title: 'Sticky thread', isSticky: true },
    ];

    await render<Context>(hbs`
      {{#each this.threads as |item|}}
        <this.BoardItem @thread={{item}} />
      {{/each}}
    `);

    assert.dom('a').exists({ count: 1 });
    assert.dom('a .title').hasText('Sticky thread');
    assert.dom('a [data-icon="thumbtack"]').exists();
    assert.dom('a .subtitle').exists();
    assert.dom('a').includesText('1 Seite');
  });

  test('links an unread bookmark to its last-read post and displays the thread flags', async function (this: Context, assert) {
    const bookmark = { thread, postId: '123' };
    this.owner.register(
      'service:stores/bookmark',
      class extends Service {
        all = [bookmark];
        unread = [bookmark];
      },
    );
    this.threads = [
      {
        ...thread,
        subtitle: 'Board notice',
        isAnnouncement: true,
        isClosed: true,
        isGlobal: true,
        isImportant: true,
        firstPost: {
          author: { id: '1', name: 'Opening author' },
          date: '2026-11-25T12:00:00.000Z',
          threadId: thread.id,
          boardId: thread.boardId,
          icon: '2',
        },
      },
    ];

    await render<Context>(hbs`
      {{#each this.threads as |item|}}
        <this.BoardItem @thread={{item}} />
      {{/each}}
    `);

    const href = find('a')?.getAttribute('href');
    assert.ok(href);
    const query = new URL(href ?? '', window.location.origin).searchParams;
    assert.strictEqual(query.get('TID'), '42');
    assert.strictEqual(query.get('PID'), '123');
    assert.strictEqual(query.get('lastReadPost'), '123');
    assert.false(query.has('scrollToBottom'));
    assert.dom('a').includesText('Board notice');
    assert.dom('a').includesText('Opening author');
    assert.dom('a img.post-icon').exists();
    for (const icon of [
      'bookmark',
      'bullhorn',
      'globe',
      'circle-exclamation',
      'lock',
    ]) {
      assert.dom(`a [data-icon="${icon}"]`).exists();
    }
  });

  test('prefers the latest reply and renders its author name as text', async function (this: Context, assert) {
    const opening = {
      author: { id: '1', name: 'Opening author' },
      date: '2026-11-25T12:00:00.000Z',
      threadId: thread.id,
      boardId: thread.boardId,
    };
    this.threads = [
      {
        ...thread,
        firstPost: opening,
        lastPost: {
          ...opening,
          author: { id: '2', name: 'Sam <team>' },
        },
      },
    ];

    await render<Context>(hbs`
      {{#each this.threads as |item|}}
        <this.BoardItem @thread={{item}} />
      {{/each}}
    `);

    assert.dom('a .subtitle b').hasText('Sam <team>');
    assert.dom('a .subtitle b team').doesNotExist();
  });
});
