import Service from '@ember/service';
import LocalStorageService from 'potber-client/services/local-storage';
import { setupTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

const VERSION_KEY = 'potber-lastEncountedVersion';
const SAVED_POSTS_KEY = 'potber-savedPosts';

class MessagesStub extends Service {
  log(): void {
    return;
  }
}

module('Unit | Service | LocalStorage', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    localStorage.removeItem(VERSION_KEY);
    localStorage.removeItem(SAVED_POSTS_KEY);
    this.owner.register('service:messages', MessagesStub);
  });

  hooks.afterEach(function () {
    localStorage.removeItem(VERSION_KEY);
    localStorage.removeItem(SAVED_POSTS_KEY);
  });

  test('fetches at most four saved posts concurrently and preserves their order', async function (assert) {
    class ApiStub extends Service {
      activeRequests = 0;
      maxActiveRequests = 0;

      async findPostById(id: string, threadId: string) {
        this.activeRequests += 1;
        this.maxActiveRequests = Math.max(
          this.maxActiveRequests,
          this.activeRequests,
        );
        await Promise.resolve();
        this.activeRequests -= 1;
        return { id, threadId };
      }
    }

    this.owner.register('service:api', ApiStub);
    const persistedPosts = Array.from({ length: 10 }, (_, index) => ({
      id: `post-${index}`,
      threadId: `thread-${index}`,
    }));
    localStorage.setItem(SAVED_POSTS_KEY, JSON.stringify(persistedPosts));

    const service = this.owner.lookup(
      'service:local-storage',
    ) as LocalStorageService;
    const api = this.owner.lookup('service:api') as ApiStub;

    const posts = await service.getSavedPosts({ reload: true });

    assert.strictEqual(api.maxActiveRequests, 4);
    assert.deepEqual(
      posts?.map(({ id, threadId }) => ({ id, threadId })),
      persistedPosts,
    );
  });

  test('treats a missing or invalid encountered version as unknown', function (assert) {
    const service = this.owner.lookup(
      'service:local-storage',
    ) as LocalStorageService;

    assert.strictEqual(service.getEncounteredVersion(), undefined);

    localStorage.setItem(VERSION_KEY, 'not-a-version');
    assert.strictEqual(service.getEncounteredVersion(), undefined);
  });

  test('stores a valid encountered version', function (assert) {
    const service = this.owner.lookup(
      'service:local-storage',
    ) as LocalStorageService;

    service.setEncounteredVersion('1.29.0');

    assert.strictEqual(service.getEncounteredVersion(), '1.29.0');
  });

  test('does not store an invalid version', function (assert) {
    const service = this.owner.lookup(
      'service:local-storage',
    ) as LocalStorageService;

    service.setEncounteredVersion('');

    assert.strictEqual(localStorage.getItem(VERSION_KEY), null);
  });

  test('never lowers the encountered version', function (assert) {
    const service = this.owner.lookup(
      'service:local-storage',
    ) as LocalStorageService;
    localStorage.setItem(VERSION_KEY, '1.29.0');

    service.setEncounteredVersion('1.28.1');

    assert.strictEqual(service.getEncounteredVersion(), '1.29.0');
  });
});
