import { currentURL, visit } from '@ember/test-helpers';
import { module, test } from 'qunit';
import EphemeralSessionStore from 'ember-simple-auth/session-stores/ephemeral';
import { LandingPage } from 'potber-client/services/settings';
import { setupApplicationTest } from 'potber-client/tests/helpers';

const accessToken = 'test+token/with=padding';

module('Acceptance | Sign-in', function (hooks) {
  setupApplicationTest(hooks);

  let originalFetch: typeof fetch;
  let originalURL: string;
  let originalOnError: typeof window.onerror;
  let storedValues: Map<string, string | null>;
  let sessionAuthorization: string | null;

  hooks.beforeEach(function () {
    // Avoid the real cookie store's background renewal timers in the browser runner.
    this.owner.register('session-store:application', EphemeralSessionStore);
    originalURL = window.location.href;
    originalOnError = window.onerror;
    storedValues = new Map(
      ['potber-settings', 'potber-lastEncountedVersion'].map((key) => [
        key,
        localStorage.getItem(key),
      ]),
    );
    localStorage.removeItem('potber-lastEncountedVersion');
    localStorage.setItem(
      'potber-settings',
      JSON.stringify({
        landingPage: LandingPage.home,
        autoRefreshSidebar: false,
        appsignalErrorReporting: false,
      }),
    );

    sessionAuthorization = null;
    originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const request = new Request(input, init);
      const { pathname } = new URL(request.url);

      switch (pathname) {
        case '/auth/session':
          sessionAuthorization = request.headers.get('Authorization');
          return Response.json({
            userId: '42',
            username: 'Test User',
            avatarUrl: '',
            cookie: '',
            iat: 0,
            exp: 0,
          });
        case '/bookmarks':
        case '/privateMessages':
          return Response.json([]);
        case '/user-configuration':
        case '/version.json':
          return new Response(null, { status: 404 });
        default:
          throw new Error(`Unexpected sign-in test request to ${pathname}`);
      }
    };
  });

  hooks.afterEach(function () {
    window.fetch = originalFetch;
    window.onerror = originalOnError;
    window.history.replaceState(window.history.state, '', originalURL);
    for (const [key, value] of storedValues) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
  });

  test('a successful callback signs the user in and shows their home page', async function (assert) {
    window.history.replaceState(
      window.history.state,
      '',
      '#access_token=test%2Btoken%2Fwith%3Dpadding&token_type=Bearer',
    );

    await visit('/auth/callback');

    assert.strictEqual(currentURL(), '/home');
    assert.dom('.home h2').hasText('Hallo, Test User!');
    assert.strictEqual(sessionAuthorization, `Bearer ${accessToken}`);
  });
});
