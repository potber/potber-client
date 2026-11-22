import { click, currentURL, fillIn, visit, waitFor } from '@ember/test-helpers';
import EphemeralSessionStore from 'ember-simple-auth/session-stores/ephemeral';
import { authenticateSession } from 'ember-simple-auth/test-support';
import type { Posts, Threads } from 'potber-client/services/api/types';
import { setupApplicationTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

const threadId = '42';
const replyId = '102';
const editor = '#create-post-form textarea';
const submit =
  '#create-post-form button[type="submit"], button[type="submit"][form="create-post-form"]';

const openingPost: Posts.Read = {
  id: '101',
  message: 'The opening post',
  date: '2026-01-01T12:00:00Z',
  threadId,
  boardId: '14',
  author: { id: '7', name: 'Thread Author' },
};

function threadWithPosts(posts: Posts.Read[]): Threads.Read {
  return {
    id: threadId,
    title: 'Test thread',
    boardId: openingPost.boardId,
    repliesCount: posts.length - 1,
    hitsCount: 20,
    pagesCount: 1,
    isClosed: false,
    isSticky: false,
    isImportant: false,
    isAnnouncement: false,
    isGlobal: false,
    firstPost: openingPost,
    lastPost: posts.at(-1),
    page: { number: 1, offset: 0, postCount: posts.length, posts },
  };
}

module('Acceptance | Posting a reply', function (hooks) {
  setupApplicationTest(hooks);

  let originalFetch: typeof fetch;
  let originalOnError: typeof window.onerror;
  let storedValues: Map<string, string | null>;
  let submittedReplies: Posts.Write[];
  let failNextSubmission: boolean;

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

    const posts = [openingPost];
    submittedReplies = [];
    failNextSubmission = false;
    originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const request = new Request(input, init);
      const { pathname } = new URL(request.url);

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
        case 'GET /privateMessages':
          return Response.json([]);
        case 'GET /version.json':
        case 'GET /user-configuration':
          return new Response(null, { status: 404 });
        case `GET /threads/${threadId}`:
          return Response.json(threadWithPosts(posts));
        case 'POST /posts': {
          const payload: Posts.Write = await request.json();
          submittedReplies.push(payload);
          if (failNextSubmission) {
            failNextSubmission = false;
            return Response.json(
              {
                statusCode: 500,
                error: 'Internal Server Error',
                message: 'Try again',
              },
              { status: 500 },
            );
          }
          const reply: Posts.Read = {
            ...openingPost,
            id: replyId,
            threadId: payload.threadId,
            message: payload.message,
            author: { id: '9', name: 'Test User' },
          };
          posts.push(reply);
          return Response.json(reply, { status: 201 });
        }
        default:
          throw new Error(
            `Unexpected reply test request: ${request.method} ${pathname}`,
          );
      }
    };
    await authenticateSession({ access_token: 'reply-test-token' });
  });

  hooks.afterEach(function () {
    window.fetch = originalFetch;
    window.onerror = originalOnError;
    for (const [key, value] of storedValues) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
  });

  test('submitting a reply returns the user to the thread with the new post', async function (assert) {
    await visit(`/thread?TID=${threadId}`);
    await click('a[href^="/post/create?"]');
    await fillIn(editor, 'A reply from the browser');

    await click(submit);
    await waitFor(`#post-${replyId}`);

    assert.dom(`#post-${replyId}`).includesText('A reply from the browser');
    assert.true(currentURL().startsWith('/thread?'));
    assert.deepEqual(
      submittedReplies.map(({ threadId, message }) => ({ threadId, message })),
      [{ threadId, message: 'A reply from the browser' }],
    );
  });

  test('a failed submission keeps the reply draft and lets the user retry', async function (assert) {
    const draft = 'Keep this draft for my retry';
    failNextSubmission = true;

    await visit(`/thread?TID=${threadId}`);
    await click('a[href^="/post/create?"]');
    await fillIn(editor, draft);
    const editorURL = currentURL();

    const firstAttempt = click(submit);
    await waitFor('[data-test-notification-message="error"]');
    assert.dom('[data-test-notification-message="error"]').exists();
    await firstAttempt;

    assert.strictEqual(currentURL(), editorURL);
    assert.dom(editor).hasValue(draft);
    assert.dom(submit).isNotDisabled();

    await click(submit);
    await waitFor(`#post-${replyId}`);

    assert.dom(`#post-${replyId}`).includesText(draft);
    assert.true(currentURL().startsWith('/thread?'));
    assert.deepEqual(
      submittedReplies.map(({ threadId, message }) => ({ threadId, message })),
      [
        { threadId, message: draft },
        { threadId, message: draft },
      ],
    );
  });
});
