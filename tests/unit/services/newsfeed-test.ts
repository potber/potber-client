import Service from '@ember/service';
import NewsfeedService from 'potber-client/services/newsfeed';
import { setupTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Service | Newsfeed', function (hooks) {
  setupTest(hooks);

  test('clears its updating state when a refresh fails', async function (assert) {
    class FailingBookmarkStore extends Service {
      getUnread() {
        return Promise.reject(new Error('bookmark refresh failed'));
      }
    }

    class PrivateMessageStoreStub extends Service {
      getUnread() {
        return Promise.resolve([]);
      }
    }

    this.owner.register('service:stores/bookmark', FailingBookmarkStore);
    this.owner.register(
      'service:stores/private-message',
      PrivateMessageStoreStub,
    );

    const newsfeed = this.owner.lookup('service:newsfeed') as NewsfeedService;
    const refresh = newsfeed.refresh();

    assert.true(newsfeed.isUpdating);
    await assert.rejects(refresh, /bookmark refresh failed/);
    assert.false(newsfeed.isUpdating);
  });
});
