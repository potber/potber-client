import {
  readSyncMetadata,
  writeSyncMetadata,
} from 'potber-client/utils/settings-sync-metadata-storage';
import { module, test } from 'qunit';

const userId = 'metadata-test';
const key = `potber-settingsSyncMetadata-${userId}`;

module('Unit | Utility | Settings sync metadata storage', function (hooks) {
  hooks.afterEach(function () {
    localStorage.removeItem(key);
  });

  test('round-trips valid clocks, including legacy device IDs', function (assert) {
    const metadata = {
      fields: {
        'settings.theme': { modifiedAt: 123, deviceId: 'legacy-device' },
      },
    };
    writeSyncMetadata(userId, metadata);

    assert.deepEqual(readSyncMetadata(userId), metadata);
  });

  test('ignores malformed records and rejects a partially invalid field map', function (assert) {
    const valid = { modifiedAt: 123, deviceId: 'legacy-device' };
    for (const stored of [
      '{',
      JSON.stringify({ fields: [] }),
      JSON.stringify({ fields: { valid, invalid: null } }),
      JSON.stringify({ fields: { theme: { ...valid, modifiedAt: '123' } } }),
      JSON.stringify({ fields: { theme: { ...valid, modifiedAt: -1 } } }),
      JSON.stringify({ fields: { theme: { ...valid, modifiedAt: 1.5 } } }),
      JSON.stringify({ fields: { theme: { ...valid, deviceId: '' } } }),
    ]) {
      localStorage.setItem(key, stored);
      assert.strictEqual(readSyncMetadata(userId), undefined, stored);
    }
  });
});
