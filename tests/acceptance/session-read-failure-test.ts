import { currentURL, visit, waitUntil } from '@ember/test-helpers';
import EphemeralSessionStore from 'ember-simple-auth/session-stores/ephemeral';
import { authenticateSession } from 'ember-simple-auth/test-support';
import type CustomSession from 'potber-client/services/custom-session';
import { LandingPage } from 'potber-client/services/settings';
import { setupApplicationTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

module('Acceptance | Session read failure', function (hooks) {
  setupApplicationTest(hooks);

  let originalFetch: typeof fetch;
  let originalOnError: typeof window.onerror;
  let storedValues: Map<string, string | null>;
  let requests: string[];
  let navigations: string[];
  let navigation: EventTarget;

  function recordNavigation(event: Event) {
    // Sign-out reloads the app; record it instead of leaving the test runner.
    const { destination } = event as Event & { destination: { url: string } };
    navigations.push(destination.url);
    event.preventDefault();
  }

  hooks.beforeEach(async function () {
    if (
      !('navigation' in window) ||
      !(window.navigation instanceof EventTarget)
    ) {
      throw new Error('This test requires the browser Navigation API');
    }
    navigation = window.navigation;
    this.owner.register('session-store:application', EphemeralSessionStore);
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

    requests = [];
    navigations = [];
    navigation.addEventListener('navigate', recordNavigation);
    originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const request = new Request(input, init);
      const { pathname } = new URL(request.url);
      requests.push(`${request.method} ${pathname}`);
      switch (`${request.method} ${pathname}`) {
        case 'GET /auth/session':
          return Response.json(
            { message: 'Forum unavailable' },
            { status: 500 },
          );
        case 'GET /bookmarks':
        case 'GET /privateMessages':
          return Response.json([]);
        case 'GET /version.json':
          return new Response(null, { status: 404 });
        default:
          throw new Error(
            `Unexpected session read failure test request: ${request.method} ${pathname}`,
          );
      }
    };
    await authenticateSession({ access_token: 'forum-token' });
  });

  hooks.afterEach(function () {
    navigation.removeEventListener('navigate', recordNavigation);
    window.fetch = originalFetch;
    window.onerror = originalOnError;
    for (const [key, value] of storedValues) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
  });

  test('a server error while reading the forum session at startup keeps the user signed in', async function (assert) {
    await visit('/home');
    await waitUntil(() => requests.includes('GET /privateMessages'));

    const session = this.owner.lookup(
      'service:session',
    ) as unknown as CustomSession;
    assert.true(session.isAuthenticated, 'still signed in');
    assert.strictEqual(session.accessToken, 'forum-token');
    assert.strictEqual(session.sessionData, null);
    assert.deepEqual(navigations, [], 'the app did not reload');
    assert.strictEqual(currentURL(), '/home');
    assert.true(requests.includes('GET /auth/session'));
    assert.false(
      requests.includes('GET /user-configuration'),
      'settings sync waits for forum session data',
    );
  });
});
