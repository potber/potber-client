import { click, fillIn, visit, waitFor, waitUntil } from '@ember/test-helpers';
import EphemeralSessionStore from 'ember-simple-auth/session-stores/ephemeral';
import { authenticateSession } from 'ember-simple-auth/test-support';
import type SettingsService from 'potber-client/services/settings';
import { LandingPage, Theme } from 'potber-client/services/settings';
import type SettingsSyncService from 'potber-client/services/settings-sync';
import type { RemoteUserConfiguration } from 'potber-client/services/settings-sync';
import { setupApplicationTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

const userId = 'settings-sync-browser-test';
const accessToken = 'settings-sync-test-token';
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
  let syncUnavailable: boolean;
  let originalFetch: typeof fetch;
  let originalErrorHandler: typeof window.onerror;
  let originalTheme: string | null;
  let storedValues: Map<string, string | null>;

  hooks.beforeEach(async function () {
    this.owner.register('session-store:application', EphemeralSessionStore);
    originalFetch = window.fetch;
    originalErrorHandler = window.onerror;
    originalTheme = document.documentElement.getAttribute('data-theme');
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
        landingPage: LandingPage.home,
        theme: Theme['tokyo-night'],
        autoRefreshSidebar: false,
        appsignalErrorReporting: false,
      }),
    );
    remote = undefined;
    syncUnavailable = false;
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
          if (syncUnavailable) return new Response(null, { status: 503 });
          return remote
            ? Response.json(remote)
            : new Response(null, { status: 404 });
        case 'DELETE /user-configuration':
          remote = undefined;
          return new Response(null, { status: 204 });
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
    await authenticateSession({ access_token: accessToken });
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

  test('a device without a key can recover the remote settings', async function (assert) {
    await visit('/settings');
    const key = await setUpSync();
    await click(forget);
    await click(confirm);
    const unlock = '[data-test-settings-sync-unlock]';
    await waitFor(unlock);

    // With the key removed, a local theme change cannot overwrite the remote copy.
    await click('.dropdown-toggle');
    await click('.dropdown-menu-visible .dropdown-item');
    assert.dom('.dropdown-toggle').hasText('potber');

    await click(unlock);
    await fillIn(keyInput, key);
    await click(confirm);
    await waitFor('[data-test-modal-alternative]');
    assert.dom(confirm).hasText('Remote');

    // Observe the reload, keeping the test runner on the same page.
    if (
      !('navigation' in window) ||
      !(window.navigation instanceof EventTarget)
    ) {
      throw new Error('Recovery test requires the browser Navigation API');
    }
    const { navigation } = window;
    let reloadRequested = false;
    function captureReload(event: Event) {
      if ('navigationType' in event && event.navigationType === 'reload') {
        event.preventDefault();
        reloadRequested = true;
      }
    }
    navigation.addEventListener('navigate', captureReload);
    try {
      await click(confirm);
      await waitUntil(() => reloadRequested);
    } finally {
      navigation.removeEventListener('navigate', captureReload);
    }

    assert.dom('.dropdown-toggle').hasText('Tokyo Night');
    assert.dom(forget).exists('the recovery key activates this device');

    const settings = this.owner.lookup('service:settings') as SettingsService;
    const factory = this.owner.factoryFor('service:settings-sync');
    if (!factory) throw new Error('Missing settings sync service factory');
    const restartedSync = factory.create() as SettingsSyncService;
    try {
      const local = { ...settings.getSettings(), theme: Theme.default };
      const remembered = await restartedSync.initialize(local, {
        userId,
        accessToken,
      });

      assert.strictEqual(remembered.theme, Theme['tokyo-night']);
      assert.strictEqual(
        restartedSync.state,
        'enabled',
        'startup loads the saved key without asking again',
      );
    } finally {
      restartedSync.destroy();
    }
  });

  test('a sync outage keeps local settings and offers a working retry', async function (assert) {
    syncUnavailable = true;
    await visit('/settings');

    const retry = '[data-test-settings-sync-retry]';
    await waitFor(retry);
    assert.dom('.dropdown-toggle').hasText('Tokyo Night');
    assert.dom().includesText('Deine Einstellungen bleiben lokal gespeichert.');

    syncUnavailable = false;
    await click(retry);
    await waitFor(enable);

    assert.dom(retry).doesNotExist();
    assert.dom('.dropdown-toggle').hasText('Tokyo Night');
    assert
      .dom()
      .doesNotIncludeText('Deine Einstellungen bleiben lokal gespeichert.');
  });

  test('disabling sync deletes the remote copy and keeps local preferences', async function (assert) {
    await visit('/settings');
    await setUpSync();
    assert.ok(remote?.ciphertext);

    await click('[data-test-settings-sync-delete]');
    await click(confirm);
    await waitFor(enable);
    assert.strictEqual(remote, undefined);
    assert.dom(forget).doesNotExist();

    await visit('/home');
    await visit('/settings');
    assert.dom(enable).exists();
    assert.dom('.dropdown-toggle').hasText('Tokyo Night');
    assert.strictEqual(
      JSON.parse(localStorage.getItem('potber-settings') ?? '{}').theme,
      Theme['tokyo-night'],
    );
  });
});
