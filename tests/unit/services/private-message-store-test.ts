import Service from '@ember/service';
import { module, test } from 'qunit';
import type PrivateMessageStore from 'potber-client/services/stores/private-message';
import { setupTest } from 'potber-client/tests/helpers';

module('Unit | Service | Private message store', function (hooks) {
  setupTest(hooks);

  test('caches unread messages, excludes local deletions, and supports a forced refresh', async function (assert) {
    const unread = { id: '1', unread: true, isDeleted: false };
    const read = { id: '2', unread: false, isDeleted: false };
    const newer = { id: '3', unread: true, isDeleted: false };
    let messages = [unread, read];

    this.owner.register(
      'service:api',
      class extends Service {
        async findManyPrivateMessages(options: { query: { unread: boolean } }) {
          assert.true(options.query.unread);
          assert.step('fetch unread');
          return messages;
        }
      },
    );
    const store = this.owner.lookup(
      'service:stores/private-message',
    ) as PrivateMessageStore;
    assert.strictEqual(store.isLoading, undefined);

    assert.deepEqual(await store.getUnread(), [unread]);
    assert.verifySteps(['fetch unread']);

    unread.isDeleted = true;
    messages = [newer];
    assert.deepEqual(await store.getUnread(), []);
    assert.verifySteps([]);

    assert.deepEqual(await store.getUnread({ reload: true }), [newer]);
    assert.verifySteps(['fetch unread']);
  });
});
