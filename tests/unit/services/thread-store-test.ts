import Service from '@ember/service';
import { settled } from '@ember/test-helpers';
import { module, test } from 'qunit';
import type { Threads } from 'potber-client/services/api/types';
import type ThreadStore from 'potber-client/services/stores/thread';
import { setupTest } from 'potber-client/tests/helpers';

const thread: Threads.Read = {
  id: '42',
  title: 'Thread',
  boardId: '14',
  repliesCount: 0,
  hitsCount: 0,
  pagesCount: 3,
  isClosed: false,
  isSticky: false,
  isImportant: false,
  isAnnouncement: false,
  isGlobal: false,
};

module('Unit | Service | Thread store', function (hooks) {
  setupTest(hooks);

  test('reloads the visible page while retaining the previous thread', async function (assert) {
    const viewed = {
      ...thread,
      page: { number: 2, postCount: 0, offset: 0, posts: [] },
    };
    this.owner.register(
      'service:api',
      class extends Service {
        async findThreadById(id: string, { query }: { query: object }) {
          assert.strictEqual(id, thread.id);
          assert.step(JSON.stringify(query));
          return viewed;
        }
      },
    );
    const store = this.owner.lookup('service:stores/thread') as ThreadStore;

    await store.loadThread(thread.id, { postId: '123' });
    await settled();
    assert.strictEqual(store.currentThread, viewed);
    const reload = store.reload({ updateBookmark: false });
    assert.true(store.isReloading);
    assert.deepEqual(store.previousThread, viewed);

    await reload;
    assert.false(store.isReloading);
    assert.verifySteps([
      JSON.stringify({ postId: '123', updateBookmark: true }),
      JSON.stringify({ page: 2, updateBookmark: false }),
    ]);

    store.clear();
    assert.strictEqual(store.currentThread, null);
    assert.strictEqual(store.previousThread, undefined);
  });

  test('skips reload when there is no loaded page', async function (assert) {
    this.owner.register(
      'service:api',
      class extends Service {
        async findThreadById() {
          assert.step('load');
          return thread;
        }
      },
    );
    const store = this.owner.lookup('service:stores/thread') as ThreadStore;

    assert.strictEqual(await store.reload(), undefined);
    await store.loadThread(thread.id);
    await settled();
    assert.strictEqual(await store.reload(), undefined);
    assert.false(store.isReloading);
    assert.verifySteps(['load']);
  });
});
