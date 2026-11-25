import { collectionsFromValues } from 'potber-client/services/settings-sync/collections';
import { mergeUnlockValues } from 'potber-client/services/settings-sync/recovery-merge';
import { module, test } from 'qunit';

module('Unit | Utility | Settings sync recovery merge', function () {
  test('rejects a malformed saved-post reference in an encrypted collection', function (assert) {
    assert.throws(
      () =>
        collectionsFromValues({
          blockedUsers: [],
          boardFavoriteIds: [],
          savedPosts: [{ id: '101', threadId: '42' }, { id: '102' }],
        }),
      /Invalid encrypted saved posts/,
    );
  });

  test('reports the invalid collection whether it comes from the primary or secondary copy', function (assert) {
    const valid = {
      blockedUsers: [],
      boardFavoriteIds: ['14'],
      savedPosts: [],
    };
    const invalid = { ...valid, boardFavoriteIds: [14] };

    assert.throws(
      () => mergeUnlockValues('remote', invalid, valid),
      /Invalid encrypted board favorites/,
    );
    assert.throws(
      () => mergeUnlockValues('local', invalid, valid),
      /Invalid encrypted board favorites/,
    );
  });
});
