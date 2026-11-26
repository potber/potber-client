import {
  click,
  currentURL,
  fillIn,
  findAll,
  visit,
  waitFor,
  waitUntil,
} from '@ember/test-helpers';
import EphemeralSessionStore from 'ember-simple-auth/session-stores/ephemeral';
import { authenticateSession } from 'ember-simple-auth/test-support';
import type { PrivateMessages } from 'potber-client/services/api/types';
import type RendererService from 'potber-client/services/renderer';
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

const systemMessage: PrivateMessages.Read = {
  id: '44',
  title: 'Maintenance notice',
  date: '2026-01-01T12:00:00Z',
  folder: 'system',
  unread: false,
  important: false,
  sender: { id: '0', name: 'Forum system' },
  content: 'Scheduled maintenance.',
};

const recipientInput =
  '#private-message-form input[aria-placeholder="Empfänger:in"]';
const subjectInput = '#private-message-form input[aria-placeholder="Betreff"]';
const bodyInput = '#private-message-form textarea';
const submitButton = 'button[type="submit"][form="private-message-form"]';

async function clickMessageAction(label: string) {
  await click('.nav-element-center .menu-button');
  const action = findAll('menu[data-visible="true"] button.menu-item').find(
    (button) => button.textContent?.trim() === label,
  );
  if (!action) throw new Error(`Missing message action: ${label}`);
  await click(action);
}

async function sendMessage(assert: Assert) {
  // Ember's test router does not create browser history entries. Seed one at
  // the current URL so the form's history.back() stays inside the runner.
  const originalState: unknown = window.history.state;
  window.history.pushState({ privateMessageForm: true }, '');
  try {
    const submission = click(submitButton);
    const notice = '[data-test-notification-message="success"]';
    await waitFor(notice);
    assert.dom(notice).includesText('Die Nachricht wurde gesendet.');
    await submission;
    await waitUntil(() => !window.history.state?.privateMessageForm);
  } finally {
    window.history.replaceState(originalState, '');
  }
}

module('Acceptance | Private messages', function (hooks) {
  setupApplicationTest(hooks);

  let originalFetch: typeof fetch;
  let originalOnError: typeof window.onerror;
  let storedValues: Map<string, string | null>;
  let sentMessages: PrivateMessages.Create[];
  let startupRefreshed: boolean;
  let failNextSend: boolean;

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
      }),
    );

    const message = { ...inboundMessage };
    let messageDeleted = false;
    sentMessages = [];
    failNextSend = false;
    let sentMessage: PrivateMessages.Read | undefined;
    startupRefreshed = false;
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
          startupRefreshed = true;
          return Response.json([]);
        case 'GET /version.json':
        case 'GET /user-configuration':
          return new Response(null, { status: 404 });
        case 'GET /privateMessages': {
          const folder = searchParams.get('folder');
          if (folder === 'outbound') {
            return Response.json(sentMessage ? [sentMessage] : []);
          }
          if (folder === 'system') {
            return Response.json(
              !messageDeleted && message.folder === 'system'
                ? [systemMessage, message]
                : [systemMessage],
            );
          }
          const unreadOnly = searchParams.get('unread') === 'true';
          return Response.json(
            !messageDeleted &&
              (!folder || folder === message.folder) &&
              (!unreadOnly || message.unread)
              ? [message]
              : [],
          );
        }
        case `GET /privateMessages/${inboundMessage.id}`:
          message.unread = false;
          return Response.json(message);
        case `PUT /privateMessages/${inboundMessage.id}/markAsUnread`:
          message.unread = true;
          return new Response(null, { status: 204 });
        case `PUT /privateMessages/${inboundMessage.id}/moveToFolder`: {
          const payload = await request.json();
          if (payload.folder !== 'system')
            throw new Error('Unexpected destination');
          message.folder = payload.folder;
          return new Response(null, { status: 204 });
        }
        case `DELETE /privateMessages/${inboundMessage.id}`:
          messageDeleted = true;
          return new Response(null, { status: 204 });
        case `GET /privateMessages/${inboundMessage.id}/reply`:
          return Response.json({
            recipientName: 'Forum Member',
            title: 'Re: Forum meetup',
            content: '',
            saveCopy: true,
          } satisfies PrivateMessages.Create);
        case 'GET /usernames':
          return Response.json(['Another Member']);
        case 'GET /privateMessages/44':
          return Response.json(systemMessage);
        case 'GET /privateMessages/43':
          return Response.json(sentMessage);
        case 'GET /privateMessages/42/forward':
          return Response.json({
            recipientName: '',
            title: 'Fw: Forum meetup',
            content: '> Shall we meet on Saturday?',
            saveCopy: true,
          } satisfies PrivateMessages.Create);
        case 'POST /privateMessages': {
          const payload: PrivateMessages.Create = await request.json();
          if (failNextSend) {
            failNextSend = false;
            return Response.json({ message: 'Try again' }, { status: 500 });
          }
          sentMessages.push(payload);
          if (payload.saveCopy) {
            sentMessage = {
              ...inboundMessage,
              id: '43',
              title: payload.title,
              content: payload.content,
              folder: 'outbound',
              unread: false,
              recipient: { id: '8', name: payload.recipientName },
            };
          }
          return new Response(null, { status: 204 });
        }
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
    await waitUntil(() => startupRefreshed);
    assert.dom(unreadIndicator).exists();

    await click(messageLink);

    assert.strictEqual(currentURL(), messagePath);
    assert.dom('.private-message-view-header').includesText('Forum Member');
    assert
      .dom('.private-message-view-content')
      .hasText('Shall we meet on Saturday?');

    await visit(inboxPath);
    await waitUntil(() => startupRefreshed);
    assert.dom(messageLink).includesText('Forum meetup');
    assert.dom(unreadIndicator).doesNotExist();
  });

  for (const isDesktop of [false, true]) {
    test(`opens an unread Quickstart message on ${isDesktop ? 'desktop' : 'mobile'}`, async function (assert) {
      await visit(inboxPath);
      await waitUntil(() => startupRefreshed);
      const renderer = this.owner.lookup('service:renderer') as RendererService;
      renderer.isDesktop = isDesktop;
      await renderer.openSidebar();

      const quickstartLink = `#sidebar-content .quickstart-item ${messageLink}`;
      await waitFor(quickstartLink);
      assert.dom(`${quickstartLink} .title`).hasText('Forum meetup');
      assert.dom(`${quickstartLink} .subtitle`).hasText('Forum Member');
      assert.dom(`${quickstartLink} [data-icon="envelope"]`).exists();

      await click(quickstartLink);

      assert.strictEqual(currentURL(), messagePath);
      assert
        .dom('.private-message-view-content')
        .hasText('Shall we meet on Saturday?');
      assert.strictEqual(renderer.sidebarExpanded, isDesktop);
    });
  }

  test('shows system messages in their folder with the system subtitle', async function (assert) {
    const systemPath = '/private-messages/system';
    const systemLink = 'a[href="/private-messages/44"]';
    await visit(systemPath);
    await waitFor(systemLink);

    assert.dom(systemLink).includesText('Maintenance notice');
    assert.dom(systemLink).includesText('Systemnachricht');

    await click(systemLink);

    assert.strictEqual(currentURL(), '/private-messages/44');
    assert.dom('.private-message-view-header').includesText('Ordner: System');
    assert
      .dom('.private-message-view-content')
      .hasText('Scheduled maintenance.');
  });

  test('marks a read message as unread and shows its inbox indicator again', async function (assert) {
    await visit(inboxPath);
    await click(messageLink);
    await clickMessageAction('Als ungelesen markieren');

    await visit(inboxPath);
    assert.dom(unreadIndicator).exists();
  });

  test('moves a message from the inbox to the system folder', async function (assert) {
    await visit(inboxPath);
    await click(messageLink);
    await clickMessageAction('Verschieben nach System');

    assert.dom('.private-message-view-header').includesText('Ordner: System');
    await visit(inboxPath);
    assert.dom(messageLink).doesNotExist();

    await visit('/private-messages/system');
    assert.dom(messageLink).includesText('Forum meetup');
  });

  test('deletes a message only after confirmation and returns to its folder', async function (assert) {
    await visit(inboxPath);
    await click(messageLink);
    await clickMessageAction('Nachricht löschen');
    await click('#modal .modal-footer button[type="button"]');

    assert.strictEqual(currentURL(), messagePath);
    assert
      .dom('.private-message-view-content')
      .hasText('Shall we meet on Saturday?');

    await clickMessageAction('Nachricht löschen');
    await click('#modal .modal-footer button.modal-submit');

    assert.strictEqual(currentURL(), inboxPath);
    assert.dom(messageLink).doesNotExist();
  });

  test('replying sends the message to the original sender and shows confirmation', async function (assert) {
    await visit(inboxPath);
    await waitUntil(() => startupRefreshed);
    await click(messageLink);
    await click('.nav-element-center .menu-button');
    await click(`menu[data-visible="true"] a[href="${messagePath}/reply"]`);

    assert.strictEqual(currentURL(), `${messagePath}/reply`);
    assert
      .dom('#private-message-form input[aria-placeholder="Empfänger:in"]')
      .hasValue('Forum Member');
    assert
      .dom('#private-message-form input[aria-placeholder="Betreff"]')
      .hasValue('Re: Forum meetup');
    await fillIn('#private-message-form textarea', 'Saturday works for me.');

    await sendMessage(assert);

    assert.deepEqual(
      sentMessages.map(({ recipientName, title, content, saveCopy }) => ({
        recipientName,
        title,
        content,
        saveCopy,
      })),
      [
        {
          recipientName: 'Forum Member',
          title: 'Re: Forum meetup',
          content: 'Saturday works for me.',
          saveCopy: true,
        },
      ],
    );
  });

  test('composing a message sends it and makes a copy available in Sent', async function (assert) {
    await visit(inboxPath);
    await waitUntil(() => startupRefreshed);
    await click('a[href="/private-messages/create"]');
    await fillIn(recipientInput, 'Another Member');
    await fillIn(subjectInput, 'Meetup details');
    await fillIn(bodyInput, 'The café opens at ten.');
    await sendMessage(assert);

    await visit('/private-messages/outbound');
    assert.dom('a[href="/private-messages/43"]').includesText('Meetup details');
    await click('a[href="/private-messages/43"]');
    assert.dom('.private-message-view-header').includesText('Another Member');
    assert
      .dom('.private-message-view-content')
      .hasText('The café opens at ten.');
  });

  test('forwarding includes the original message and sends to the new recipient', async function (assert) {
    await visit(inboxPath);
    await waitUntil(() => startupRefreshed);
    await click(messageLink);
    await click('.nav-element-center .menu-button');
    await click(`menu[data-visible="true"] a[href="${messagePath}/forward"]`);

    assert.dom(subjectInput).hasValue('Fw: Forum meetup');
    assert.dom(bodyInput).hasValue('> Shall we meet on Saturday?');
    await fillIn(recipientInput, 'Another Member');
    await sendMessage(assert);

    assert.strictEqual(sentMessages[0]?.recipientName, 'Another Member');
    assert.strictEqual(
      sentMessages[0]?.content,
      '> Shall we meet on Saturday?',
    );
  });

  test('a failed send preserves all compose fields for a successful retry', async function (assert) {
    failNextSend = true;
    await visit(inboxPath);
    await waitUntil(() => startupRefreshed);
    await click('a[href="/private-messages/create"]');
    await fillIn(recipientInput, 'Another Member');
    await fillIn(subjectInput, 'Meetup details');
    await fillIn(bodyInput, 'The café opens at ten.');

    const submission = click(submitButton);
    const notice = '[data-test-notification-message="error"]';
    await waitFor(notice);
    assert.dom(notice).exists();
    await submission;

    assert.strictEqual(currentURL(), '/private-messages/create');
    assert.dom(recipientInput).hasValue('Another Member');
    assert.dom(subjectInput).hasValue('Meetup details');
    assert.dom(bodyInput).hasValue('The café opens at ten.');
    await sendMessage(assert);
    assert.strictEqual(sentMessages.length, 1);
    assert.strictEqual(sentMessages[0]?.content, 'The café opens at ten.');
  });
});
