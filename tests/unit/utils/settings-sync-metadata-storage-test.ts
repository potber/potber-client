import {
  readOrCreateSyncMetadata,
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

  test('uses stored clocks for an upload without changing them', function (assert) {
    const metadata = {
      fields: {
        'settings.theme': { modifiedAt: 123, deviceId: 'legacy-device' },
      },
    };
    writeSyncMetadata(userId, metadata);
    const stored = localStorage.getItem(key);

    assert.deepEqual(
      readOrCreateSyncMetadata(userId, {
        'settings.theme': 'dark',
        'settings.fontSize': 16,
      }),
      metadata,
    );
    assert.strictEqual(localStorage.getItem(key), stored);
  });

  test('creates and stores clocks for every field when stored clocks are missing or malformed', function (assert) {
    for (const stored of [null, '{', JSON.stringify({ fields: [] })]) {
      if (stored === null) localStorage.removeItem(key);
      else localStorage.setItem(key, stored);

      const metadata = readOrCreateSyncMetadata(userId, {
        'settings.theme': 'dark',
        'settings.fontSize': 16,
      });

      assert.deepEqual(
        Object.keys(metadata.fields).sort(),
        ['settings.fontSize', 'settings.theme'],
        String(stored),
      );
      assert.deepEqual(readSyncMetadata(userId), metadata, String(stored));
    }
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
