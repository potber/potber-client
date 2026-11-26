import Service from '@ember/service';
import { appConfig } from 'potber-client/config/app.config';
import LocalStorageService from 'potber-client/services/local-storage';
import { setupTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

const VERSION_KEY = 'potber-lastEncountedVersion';
const SAVED_POSTS_KEY = 'potber-savedPosts';
const BOARD_FAVORITES_KEY = 'potber-boardFavorites';

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
    localStorage.removeItem(BOARD_FAVORITES_KEY);
    this.owner.register('service:messages', MessagesStub);
  });

  hooks.afterEach(function () {
    localStorage.removeItem(VERSION_KEY);
    localStorage.removeItem(SAVED_POSTS_KEY);
    localStorage.removeItem(BOARD_FAVORITES_KEY);
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
    assert.strictEqual(await service.getSavedPosts(), posts);
    assert.deepEqual(
      posts?.map(({ id, threadId }) => ({ id, threadId })),
      persistedPosts,
    );
  });

  test('updates persisted favorites by ID before board details have loaded', async function (assert) {
    const syncedIds: string[][] = [];
    this.owner.register(
      'service:settings-sync',
      class extends Service {
        boardFavoritesChanged(ids: string[]) {
          syncedIds.push(ids);
        }
      },
    );
    this.owner.register(
      'service:api',
      class extends Service {
        async findBoardById(id: string) {
          return { id };
        }
      },
    );

    localStorage.setItem(BOARD_FAVORITES_KEY, '14,15');
    const service = this.owner.lookup(
      'service:local-storage',
    ) as LocalStorageService;

    await Promise.all([
      service.addBoardFavorite('16'),
      service.removeBoardFavorite('14'),
      service.addBoardFavorite('16'),
      service.removeBoardFavorite('missing'),
    ]);

    assert.strictEqual(localStorage.getItem(BOARD_FAVORITES_KEY), '15,16');
    assert.deepEqual(syncedIds, [
      ['14', '15', '16'],
      ['15', '16'],
      ['15', '16'],
      ['15', '16'],
    ]);
    assert.deepEqual(
      service.boardFavorites?.map(({ id }) => id),
      ['15', '16'],
    );
  });

  test('an earlier board load cannot restore a removed favorite', async function (assert) {
    let finishBoardLoad: (() => void) | undefined;
    const pendingBoard = new Promise<{ id: string }>((resolve) => {
      finishBoardLoad = () => resolve({ id: '14' });
    });
    this.owner.register(
      'service:settings-sync',
      class extends Service {
        boardFavoritesChanged() {}
      },
    );
    this.owner.register(
      'service:api',
      class extends Service {
        findBoardById(id: string) {
          return id === '14' ? pendingBoard : Promise.resolve({ id });
        }
      },
    );
    localStorage.setItem(BOARD_FAVORITES_KEY, '14,15');
    const service = this.owner.lookup(
      'service:local-storage',
    ) as LocalStorageService;

    const initialLoad = service.getBoardFavorites();
    await service.removeBoardFavorite('14');
    finishBoardLoad?.();
    await initialLoad;

    assert.deepEqual(
      service.boardFavorites?.map(({ id }) => id),
      ['15'],
    );
  });

  test('uses persisted post references when an older load completes after removal', async function (assert) {
    let finishPostLoad: (() => void) | undefined;
    const pendingPost = new Promise<{ id: string; threadId: string }>(
      (resolve) => {
        finishPostLoad = () => resolve({ id: '101', threadId: '42' });
      },
    );
    this.owner.register(
      'service:settings-sync',
      class extends Service {
        savedPostsChanged() {}
      },
    );
    this.owner.register(
      'service:api',
      class extends Service {
        findPostById() {
          return pendingPost;
        }
      },
    );
    localStorage.setItem(SAVED_POSTS_KEY, '[{"id":"101","threadId":"42"}]');
    const service = this.owner.lookup(
      'service:local-storage',
    ) as LocalStorageService;

    const initialLoad = service.getSavedPosts();
    assert.false(service.addSavedPost({ id: '101', threadId: '42' }));
    service.removeSavedPost('101');
    finishPostLoad?.();
    await initialLoad;

    assert.deepEqual(service.savedPosts, []);
    assert.deepEqual(service.readPersistedSavedPosts(), []);
  });

  test('keeps valid saved-post references when other records are malformed', function (assert) {
    const storage = this.owner.lookup(
      'service:local-storage',
    ) as LocalStorageService;
    const validPost = { id: '101', threadId: '42' };
    localStorage.setItem(
      SAVED_POSTS_KEY,
      JSON.stringify([
        validPost,
        null,
        { id: '102' },
        { id: '103', threadId: 42 },
      ]),
    );

    assert.deepEqual(storage.readPersistedSavedPosts(), [validPost]);
  });

  test('keeps valid users when stored blocklist entries are malformed', function (assert) {
    const storage = this.owner.lookup(
      'service:local-storage',
    ) as LocalStorageService;
    const key = 'potber-socials';
    const previous = localStorage.getItem(key);
    const validUser = { id: '12', name: 'Alice' };

    try {
      localStorage.setItem(key, JSON.stringify({ blockedUsers: 'Alice' }));
      assert.strictEqual(storage.readSocials(), null);

      localStorage.setItem(
        key,
        JSON.stringify({
          blockedUsers: [validUser, null, { id: 15, name: 'Bob' }],
        }),
      );
      assert.deepEqual(storage.readSocials(), { blockedUsers: [validUser] });
    } finally {
      if (previous === null) localStorage.removeItem(key);
      else localStorage.setItem(key, previous);
    }
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

  test('ignores a non-array saved-post record and leaves missing removals alone', function (assert) {
    const service = this.owner.lookup(
      'service:local-storage',
    ) as LocalStorageService;
    localStorage.setItem(SAVED_POSTS_KEY, JSON.stringify({ id: 'post' }));
    assert.deepEqual(service.readPersistedSavedPosts(), []);

    const saved = JSON.stringify([{ id: '1', threadId: '42' }]);
    localStorage.setItem(SAVED_POSTS_KEY, saved);
    service.removeSavedPost('missing');
    assert.strictEqual(localStorage.getItem(SAVED_POSTS_KEY), saved);
  });

  test('stores the current app version when called without a version', function (assert) {
    const service = this.owner.lookup(
      'service:local-storage',
    ) as LocalStorageService;
    service.setEncounteredVersion();
    assert.strictEqual(service.getEncounteredVersion(), appConfig.version);
  });
});
