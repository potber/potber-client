import { click, visit, waitFor } from '@ember/test-helpers';
import EphemeralSessionStore from 'ember-simple-auth/session-stores/ephemeral';
import { authenticateSession } from 'ember-simple-auth/test-support';
import { Theme } from 'potber-client/services/settings';
import type SettingsSyncService from 'potber-client/services/settings-sync';
import type { RemoteUserConfiguration } from 'potber-client/services/settings-sync';
import { setupApplicationTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

const enable = '[data-test-settings-sync-enable]';
const forget = '[data-test-settings-sync-forget]';
const confirm = '#modal .modal-submit';
const keyInput = '#modal textarea';

async function setUpSync() {
  await waitFor(enable);
  await click(enable);
  await click(confirm);
  const field = await waitFor(keyInput);
  if (!(field instanceof HTMLTextAreaElement))
    throw new Error('Recovery key field missing');
  const key = field.value;
  await click(confirm);
  await waitFor(forget);
  return key;
}

module('Acceptance | Settings sync', function (hooks) {
  setupApplicationTest(hooks);
  let remote: RemoteUserConfiguration | undefined;
  let originalFetch: typeof fetch;
  let originalErrorHandler: typeof window.onerror;
  let originalTheme: string | null;
  let storedValues: Map<string, string | null>;

  hooks.beforeEach(async function () {
    this.owner.register('session-store:application', EphemeralSessionStore);
    originalFetch = window.fetch;
    originalErrorHandler = window.onerror;
    originalTheme = document.documentElement.getAttribute('data-theme');
    const userId = 'settings-sync-browser-test';
    storedValues = new Map(
      [
        'potber-settings',
        'potber-boardFavorites',
        'potber-lastEncountedVersion',
        'potber-settingsSyncDeviceId',
        `potber-settingsSyncMetadata-${userId}`,
      ].map((key) => [key, localStorage.getItem(key)]),
    );
    for (const key of storedValues.keys()) localStorage.removeItem(key);
    localStorage.setItem(
      'potber-settings',
      JSON.stringify({
        theme: Theme['tokyo-night'],
        autoRefreshSidebar: false,
        appsignalErrorReporting: false,
      }),
    );
    remote = undefined;
    window.fetch = async (input, init) => {
      const request = new Request(input, init);
      const { pathname } = new URL(request.url);
      switch (`${request.method} ${pathname}`) {
        case 'GET /auth/session':
          return Response.json({
            userId,
            username: 'Test User',
            avatarUrl: '',
            cookie: '',
            iat: 0,
            exp: 0,
          });
        case 'GET /bookmarks':
        case 'GET /privateMessages':
          return Response.json([]);
        case 'GET /version.json':
          return new Response(null, { status: 404 });
        case 'GET /user-configuration':
          return remote
            ? Response.json(remote)
            : new Response(null, { status: 404 });
        case 'PUT /user-configuration': {
          const body = await request.json();
          remote = {
            ...body,
            revision: (remote?.revision ?? 0) + 1,
            updatedAt: '2026-01-01T12:00:00Z',
          };
          return Response.json(remote);
        }
        default:
          throw new Error(
            `Unexpected settings sync request: ${request.method} ${pathname}`,
          );
      }
    };
    await authenticateSession({ access_token: 'settings-sync-test-token' });
  });

  hooks.afterEach(async function () {
    const sync = this.owner.lookup(
      'service:settings-sync',
    ) as SettingsSyncService;
    await sync.forgetThisDevice();
    window.fetch = originalFetch;
    window.onerror = originalErrorHandler;
    if (originalTheme === null)
      document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', originalTheme);
    for (const [key, value] of storedValues) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
  });

  test('setting up sync uploads encrypted settings and shows a recovery key', async function (assert) {
    await visit('/settings');

    const recoveryKey = await setUpSync();

    assert.true(recoveryKey.startsWith('potber-sync-v1-'));
    assert.ok(remote?.ciphertext, 'the server received encrypted settings');
    assert.false(
      JSON.stringify(remote).includes(recoveryKey),
      'the server never receives the recovery key',
    );
    assert.dom(forget).exists('this device can now use sync');
  });
});
