import {
  createRecoveryKey,
  decryptSettings,
  encryptSettings,
  importRecoveryKey,
} from 'potber-client/utils/settings-sync-crypto';
import { module, test } from 'qunit';

const prefix = 'potber-sync-v1-';
// 32 zero bytes: the final character carries 4 key bits and 2 unused bits.
const canonicalZeroKey = `${prefix}${'A'.repeat(43)}`;

module('Unit | Utility | Settings sync crypto', function () {
  test('a recovery key opens what its device key encrypted, ignoring surrounding whitespace', async function (assert) {
    const { key, recoveryKey } = await createRecoveryKey();
    const envelope = await encryptSettings('{"fields":{}}', key, '123');

    const imported = await importRecoveryKey(`  ${recoveryKey}\n`);

    assert.strictEqual(
      await decryptSettings(envelope, imported, '123'),
      '{"fields":{}}',
    );
  });

  test('rejects malformed recovery keys before importing them', async function (assert) {
    await importRecoveryKey(canonicalZeroKey);
    for (const [recoveryKey, message] of [
      [`potber-sync-v2-${'A'.repeat(43)}`, /prefix/],
      [`${prefix}${'A'.repeat(42)}`, /encoding/],
      [`${prefix}${'A'.repeat(42)}+`, /encoding/],
      [`${prefix}${'A'.repeat(42)}B`, /Non-canonical/],
    ] as const) {
      // importRecoveryKey throws synchronously; callers await it in async code.
      const imported = (async () => importRecoveryKey(recoveryKey))();
      await assert.rejects(imported, message, recoveryKey);
    }
  });

  test('rejects an envelope with an unsupported version or for another account', async function (assert) {
    const { key } = await createRecoveryKey();
    const envelope = await encryptSettings('{}', key, '123');

    await assert.rejects(
      decryptSettings({ ...envelope, version: 2 }, key, '123'),
      /Unsupported encrypted settings version/,
    );
    await assert.rejects(decryptSettings(envelope, key, '456'));
  });
});
