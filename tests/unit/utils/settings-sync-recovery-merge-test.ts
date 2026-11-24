import { collectionsFromValues } from 'potber-client/utils/settings-sync-recovery-merge';
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
});
