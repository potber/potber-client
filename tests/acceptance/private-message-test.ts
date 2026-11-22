import { click, currentURL, visit } from '@ember/test-helpers';
import EphemeralSessionStore from 'ember-simple-auth/session-stores/ephemeral';
import { authenticateSession } from 'ember-simple-auth/test-support';
import type { PrivateMessages } from 'potber-client/services/api/types';
import { setupApplicationTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

const inboxPath = '/private-messages/inbound';
const messagePath = '/private-messages/42';
const messageLink = `a[href="${messagePath}"]`;
const unreadIndicator = `${messageLink} .private-message-unread-indicator`;

const inboundMessage: PrivateMessages.Read = {
  id: '42',
  title: 'Forum meetup',
  date: '2026-01-01T12:00:00Z',
  folder: 'inbound',
  unread: true,
  important: false,
  sender: { id: '7', name: 'Forum Member' },
  content: 'Shall we meet on Saturday?',
};

module('Acceptance | Private messages', function (hooks) {
  setupApplicationTest(hooks);

  let originalFetch: typeof fetch;
  let originalOnError: typeof window.onerror;
  let storedValues: Map<string, string | null>;

  hooks.beforeEach(async function () {
    this.owner.register('session-store:application', EphemeralSessionStore);
    originalOnError = window.onerror;
    storedValues = new Map(
      [
        'potber-settings',
        'potber-boardFavorites',
        'potber-lastEncountedVersion',
      ].map((key) => [key, localStorage.getItem(key)]),
    );
    localStorage.removeItem('potber-boardFavorites');
    localStorage.removeItem('potber-lastEncountedVersion');
    localStorage.setItem(
      'potber-settings',
      JSON.stringify({
        autoRefreshSidebar: false,
        appsignalErrorReporting: false,
      }),
    );

    const message = { ...inboundMessage };
    originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const request = new Request(input, init);
      const { pathname, searchParams } = new URL(request.url);

      switch (`${request.method} ${pathname}`) {
        case 'GET /auth/session':
          return Response.json({
            userId: '9',
            username: 'Test User',
            avatarUrl: '',
            cookie: '',
            iat: 0,
            exp: 0,
          });
        case 'GET /bookmarks':
          return Response.json([]);
        case 'GET /version.json':
        case 'GET /user-configuration':
          return new Response(null, { status: 404 });
        case 'GET /privateMessages': {
          const folder = searchParams.get('folder');
          const unreadOnly = searchParams.get('unread') === 'true';
          return Response.json(
            (!folder || folder === message.folder) &&
              (!unreadOnly || message.unread)
              ? [message]
              : [],
          );
        }
        case `GET /privateMessages/${inboundMessage.id}`:
          message.unread = false;
          return Response.json(message);
        default:
          throw new Error(
            `Unexpected private-message test request: ${request.method} ${pathname}`,
          );
      }
    };
    await authenticateSession({ access_token: 'private-message-test-token' });
  });

  hooks.afterEach(function () {
    window.fetch = originalFetch;
    window.onerror = originalOnError;
    for (const [key, value] of storedValues) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
  });

  test('opening an unread message shows its contents and clears the inbox unread indicator', async function (assert) {
    await visit(inboxPath);
    assert.dom(unreadIndicator).exists();

    await click(messageLink);

    assert.strictEqual(currentURL(), messagePath);
    assert.dom('.private-message-view-header').includesText('Forum Member');
    assert
      .dom('.private-message-view-content')
      .hasText('Shall we meet on Saturday?');

    await visit(inboxPath);
    assert.dom(messageLink).includesText('Forum meetup');
    assert.dom(unreadIndicator).doesNotExist();
  });
});
