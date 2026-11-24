import {
  click,
  currentURL,
  findAll,
  visit,
  waitUntil,
} from '@ember/test-helpers';
import { module, test } from 'qunit';
import BaseSessionStore from 'ember-simple-auth/session-stores/base';
import { authConfig } from 'potber-client/config/auth.config';
import { LandingPage } from 'potber-client/services/settings';
import { setupApplicationTest } from 'potber-client/tests/helpers';

const accessToken = 'test+token/with=padding';
const callbackFragment =
  '#access_token=test%2Btoken%2Fwith%3Dpadding&token_type=Bearer';

// Outlives the app instance, like the cookie that keeps the target across the OAuth redirect.
let persistedRedirectTarget: string | null = null;

/**
 * Keeps session data in memory, which avoids the cookie store's background renewal timers in
 * the browser runner, and keeps the redirect target outside the app instance.
 */
class TestSessionStore extends BaseSessionStore {
  private data = '{}';

  persist(data: unknown) {
    this.data = JSON.stringify(data);
    return Promise.resolve();
  }

  restore() {
    return Promise.resolve(JSON.parse(this.data) as unknown);
  }

  clear() {
    this.data = '{}';
    return Promise.resolve();
  }

  setRedirectTarget(url: string) {
    persistedRedirectTarget = url;
  }

  getRedirectTarget() {
    return persistedRedirectTarget;
  }

  clearRedirectTarget() {
    persistedRedirectTarget = null;
  }
}

function setCallbackFragment(fragment: string) {
  window.history.replaceState(window.history.state, '', fragment);
}

async function captureSignInRedirect(perform: () => Promise<unknown>) {
  // Keep the runner in place during OAuth redirects and sign-out reloads.
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
    event.preventDefault();
    if (url.origin !== window.location.origin) destination = url;
  }

  navigation.addEventListener('navigate', capture);
  try {
    await perform();
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
  let startupRefreshed: boolean;
  let sessionAuthorization: string | null;

  hooks.beforeEach(function () {
    this.owner.register('session-store:application', TestSessionStore);
    persistedRedirectTarget = null;
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
      }),
    );

    startupRefreshed = false;
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
        case '/privateMessages':
          startupRefreshed = true;
          return Response.json([]);
        case '/bookmarks':
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
    setCallbackFragment(callbackFragment);

    const destination = await captureSignInRedirect(() =>
      visit('/auth/callback'),
    );

    assert.strictEqual(destination, undefined, 'sign-in stays in the app');
    assert.strictEqual(currentURL(), '/home');
    assert.dom('.home h2').hasText('Hallo, Test User!');
    assert.strictEqual(sessionAuthorization, `Bearer ${accessToken}`);
  });

  test('a signed-out visitor to settings is sent to the authorization page', async function (assert) {
    const destination = await captureSignInRedirect(() => visit('/settings'));

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

  test('signing in after visiting settings returns the user to settings', async function (assert) {
    await captureSignInRedirect(() => visit('/settings'));
    assert.strictEqual(persistedRedirectTarget, '/settings');

    setCallbackFragment(callbackFragment);
    const destination = await captureSignInRedirect(() =>
      visit('/auth/callback'),
    );

    assert.strictEqual(destination, undefined, 'sign-in stays in the app');
    assert.strictEqual(currentURL(), '/settings');
    assert.true(
      findAll('button').some(
        (button) => button.textContent?.trim() === 'Abmelden',
      ),
      'the signed-in settings page renders',
    );
    assert.strictEqual(persistedRedirectTarget, null, 'target is cleared');
  });

  for (const target of [
    'https://example.com/settings',
    '//example.com/settings',
    '/\\example.com/settings',
    'settings',
    '/auth/callback',
    '/login',
  ]) {
    test(`a redirect target of ${target} is ignored after sign-in`, async function (assert) {
      persistedRedirectTarget = target;
      setCallbackFragment(callbackFragment);

      const destination = await captureSignInRedirect(() =>
        visit('/auth/callback'),
      );

      assert.strictEqual(destination, undefined, 'sign-in stays in the app');
      assert.strictEqual(currentURL(), '/home');
      assert.strictEqual(persistedRedirectTarget, null, 'target is cleared');
    });
  }

  test('a rejected callback starts sign-in again without creating a session', async function (assert) {
    setCallbackFragment('#error=access_denied');

    const destination = await captureSignInRedirect(() =>
      visit('/auth/callback'),
    );

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

  test('signing out requires authorization to revisit settings', async function (assert) {
    setCallbackFragment(callbackFragment);
    await visit('/auth/callback');
    await waitUntil(() => startupRefreshed);
    await visit('/settings');
    const signOut = findAll('button').find(
      (button) => button.textContent?.trim() === 'Abmelden',
    );
    if (!signOut) throw new Error('Sign-out button missing');

    await captureSignInRedirect(() => click(signOut));
    await visit('/about');
    const destination = await captureSignInRedirect(() => visit('/settings'));
    assert.strictEqual(
      destination?.origin,
      new URL(authConfig.issuerUrl).origin,
    );
    assert.strictEqual(destination?.pathname, '/authorize');
    assert.dom('[data-test-settings-sync-enable]').doesNotExist();
  });
});
