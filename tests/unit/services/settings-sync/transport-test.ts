import { module, test } from 'qunit';
import {
  fetchRemoteSettings,
  SettingsSyncRequestError,
  writeRemoteSettings,
} from 'potber-client/services/settings-sync/transport';

const envelope = { version: 1, iv: 'test-iv', ciphertext: 'test-ciphertext' };
const configuration = {
  ...envelope,
  revision: 1,
  updatedAt: '2026-11-23T12:00:00Z',
};

module('Unit | Utility | Settings sync transport', function (hooks) {
  let originalFetch: typeof fetch;

  hooks.beforeEach(function () {
    originalFetch = globalThis.fetch;
  });

  hooks.afterEach(function () {
    globalThis.fetch = originalFetch;
  });

  test('returns no configuration on 404 and accepts a valid read', async function (assert) {
    globalThis.fetch = async () => new Response(null, { status: 404 });
    assert.strictEqual(await fetchRemoteSettings('token'), null);

    globalThis.fetch = async () => Response.json(configuration);
    assert.deepEqual(await fetchRemoteSettings('token'), configuration);
  });

  test('rejects malformed successful reads and writes', async function (assert) {
    globalThis.fetch = async () =>
      Response.json({ ...configuration, revision: '1' });
    await assert.rejects(
      fetchRemoteSettings('token'),
      /Unexpected settings sync response/,
    );

    globalThis.fetch = async () => new Response(null, { status: 200 });
    await assert.rejects(
      writeRemoteSettings('token', envelope),
      /Unexpected settings sync response/,
    );
  });

  test('preserves conflict status when the error body is empty or has the wrong shape', async function (assert) {
    for (const body of [null, JSON.stringify({ message: 409 })]) {
      globalThis.fetch = async () =>
        new Response(body, { status: 409, statusText: 'Conflict' });

      await assert.rejects(
        writeRemoteSettings('token', envelope),
        (error: unknown) =>
          error instanceof SettingsSyncRequestError &&
          error.status === 409 &&
          error.message === 'Conflict',
      );
    }
  });
});
