import Service from '@ember/service';
import { appConfig } from 'potber-client/config/app.config';
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
  test('prioritizes unread private messages over unread bookmarks', function (assert) {
    class UnreadStore extends Service {
      unread: object[] = [];
    }

    this.owner.register('service:stores/bookmark', UnreadStore);
    this.owner.register('service:stores/private-message', UnreadStore);
    const newsfeed = this.owner.lookup('service:newsfeed') as NewsfeedService;
    const bookmarks = this.owner.lookup(
      'service:stores/bookmark',
    ) as UnreadStore;
    const privateMessages = this.owner.lookup(
      'service:stores/private-message',
    ) as UnreadStore;

    assert.strictEqual(newsfeed.status, 'none');
    bookmarks.unread = [{ id: '1' }];
    assert.strictEqual(newsfeed.status, 'info');
    privateMessages.unread = [{ id: '2' }];
    assert.strictEqual(newsfeed.status, 'important');
    privateMessages.unread = [];
    assert.strictEqual(newsfeed.status, 'info');
  });

  test('schedules a silent refresh only when automatic refresh is enabled', function (assert) {
    let autoRefresh = false;
    this.owner.register(
      'service:settings',
      class extends Service {
        getSetting() {
          return autoRefresh;
        }
      },
    );
    const newsfeed = this.owner.lookup('service:newsfeed') as NewsfeedService;
    newsfeed.refresh = async (options) => {
      assert.deepEqual(options, { silent: true });
      assert.step('refresh');
    };

    const originalSetInterval = window.setInterval;
    window.setInterval = (handler: TimerHandler, delay?: number) => {
      assert.strictEqual(delay, appConfig.newsfeedRefreshInterval);
      assert.step('schedule');
      if (typeof handler === 'function') handler();
      return 1;
    };

    try {
      newsfeed.initialize();
      assert.verifySteps([]);
      autoRefresh = true;
      newsfeed.initialize();
      assert.verifySteps(['schedule', 'refresh']);
    } finally {
      window.setInterval = originalSetInterval;
    }
  });
});
