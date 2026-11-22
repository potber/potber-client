import { currentURL, visit } from '@ember/test-helpers';
import { module, test } from 'qunit';
import EphemeralSessionStore from 'ember-simple-auth/session-stores/ephemeral';
import { authConfig } from 'potber-client/config/auth.config';
import { LandingPage } from 'potber-client/services/settings';
import { setupApplicationTest } from 'potber-client/tests/helpers';

const accessToken = 'test+token/with=padding';

function setCallbackFragment(fragment: string) {
  window.history.replaceState(window.history.state, '', fragment);
}

async function captureSignInRedirect(path: string) {
  // Observe the browser's outbound navigation and keep the test runner local.
  if (
    !('navigation' in window) ||
    !(window.navigation instanceof EventTarget)
  ) {
    throw new Error(
      'Sign-in redirect tests require the browser Navigation API',
    );
  }
  const { navigation } = window;
  let destination: URL | undefined;

  function capture(event: Event) {
    const { destination: target } = event as Event & {
      destination: { url: string };
    };
    const url = new URL(target.url);
    if (url.origin === window.location.origin) return;
    event.preventDefault();
    destination = url;
  }

  navigation.addEventListener('navigate', capture);
  try {
    await visit(path);
    return destination;
  } finally {
    navigation.removeEventListener('navigate', capture);
  }
}

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
    setCallbackFragment(
      '#access_token=test%2Btoken%2Fwith%3Dpadding&token_type=Bearer',
    );

    const destination = await captureSignInRedirect('/auth/callback');

    assert.strictEqual(destination, undefined, 'sign-in stays in the app');
    assert.strictEqual(currentURL(), '/home');
    assert.dom('.home h2').hasText('Hallo, Test User!');
    assert.strictEqual(sessionAuthorization, `Bearer ${accessToken}`);
  });

  test('a signed-out visitor to settings is sent to the authorization page', async function (assert) {
    const destination = await captureSignInRedirect('/settings');

    assert.strictEqual(
      destination?.origin,
      new URL(authConfig.issuerUrl).origin,
    );
    assert.strictEqual(destination?.pathname, '/authorize');
    assert.strictEqual(
      destination?.searchParams.get('client_id'),
      authConfig.clientId,
    );
    assert.strictEqual(destination?.searchParams.get('response_type'), 'token');
    assert.strictEqual(
      destination?.searchParams.get('redirect_uri'),
      `${window.location.origin}/auth/callback`,
    );
    assert.dom('[data-test-settings-sync-enable]').doesNotExist();
  });

  test('a rejected callback starts sign-in again without creating a session', async function (assert) {
    setCallbackFragment('#error=access_denied');

    const destination = await captureSignInRedirect('/auth/callback');

    assert.strictEqual(
      destination?.origin,
      new URL(authConfig.issuerUrl).origin,
    );
    assert.strictEqual(destination?.pathname, '/authorize');
    assert.strictEqual(
      sessionAuthorization,
      null,
      'no authenticated session request',
    );
    assert.dom('.home h2').doesNotExist();
  });
});
