import {
  click,
  currentURL,
  fillIn,
  visit,
  waitFor,
  waitUntil,
} from '@ember/test-helpers';
import EphemeralSessionStore from 'ember-simple-auth/session-stores/ephemeral';
import { authenticateSession } from 'ember-simple-auth/test-support';
import type { Boards, Posts, Threads } from 'potber-client/services/api/types';
import { setupApplicationTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

const threadId = '42';
const replyId = '102';
const createdThreadId = '43';
const createdPostId = '103';
const quote = '[quote]The opening post[/quote]';
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
    firstPost: posts[0] ?? openingPost,
    lastPost: posts.at(-1),
    page: { number: 1, offset: 0, postCount: posts.length, posts },
  };
}

async function openPostMenuLink(action: 'quote' | 'edit') {
  await click('#post-101 .menu-button');
  await click(`menu[data-visible="true"] a[href^="/post/${action}?"]`);
}

module('Acceptance | Writing posts', function (hooks) {
  setupApplicationTest(hooks);

  let originalFetch: typeof fetch;
  let originalOnError: typeof window.onerror;
  let storedValues: Map<string, string | null>;
  let posts: Posts.Read[];
  let submittedReplies: Posts.Write[];
  let failNextSubmission: boolean;
  let startupRefreshed: boolean;
  let submittedThread: Threads.Create | undefined;

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

    posts = [openingPost];
    let createdThread: Threads.Read | undefined;
    submittedThread = undefined;
    startupRefreshed = false;
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
          return Response.json([]);
        case 'GET /privateMessages':
          startupRefreshed = true;
          return Response.json([]);
        case 'GET /version.json':
        case 'GET /user-configuration':
          return new Response(null, { status: 404 });
        case `GET /threads/${threadId}`:
          return Response.json(threadWithPosts(posts));
        case 'GET /boards/14':
          return Response.json({
            id: '14',
            categoryId: '1',
            name: 'General discussion',
            description: 'Community discussion',
            threadsCount: 1,
            repliesCount: 0,
            lastPost: openingPost,
            page: {
              number: 1,
              stickiesCount: 0,
              globalsCount: 0,
              threadsCount: 1,
              threads: [threadWithPosts(posts)],
            },
          } satisfies Boards.Read);
        case `GET /threads/${createdThreadId}`:
          if (!createdThread)
            throw new Error('The thread has not been created');
          return Response.json(createdThread);
        case 'POST /threads': {
          const payload: Threads.Create = await request.json();
          submittedThread = payload;
          const post: Posts.Read = {
            ...openingPost,
            id: createdPostId,
            threadId: createdThreadId,
            boardId: payload.boardId,
            message: payload.openingPost.message,
            author: { id: '9', name: 'Test User' },
          };
          createdThread = {
            ...threadWithPosts([post]),
            id: createdThreadId,
            boardId: payload.boardId,
            title: payload.title,
            firstPost: post,
          };
          return Response.json(createdThread, { status: 201 });
        }
        case 'GET /posts/101/quote':
          return Response.json({ message: quote });
        case 'GET /posts/101':
          return Response.json(posts[0]);
        case 'PUT /posts/101': {
          const payload: Posts.Write = await request.json();
          posts[0] = { ...openingPost, ...posts[0], message: payload.message };
          return Response.json(posts[0]);
        }
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

  hooks.afterEach(async function () {
    // Allow the thread's scroll frame to run before Ember tears down its owner.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    window.fetch = originalFetch;
    window.onerror = originalOnError;
    for (const [key, value] of storedValues) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
  });

  test('submitting a reply returns the user to the thread with the new post', async function (assert) {
    await visit(`/thread?TID=${threadId}`);
    await waitUntil(() => startupRefreshed);
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
    await waitUntil(() => startupRefreshed);
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

  test('creating a thread opens it and displays the opening post', async function (assert) {
    await visit('/board?BID=14');
    await waitUntil(() => startupRefreshed);
    await click('a[href^="/create-thread?"][href*="BID=14"]');
    await fillIn('#create-thread-form input[required]', 'Weekend meetup');
    await fillIn('#create-thread-form textarea', 'Let’s meet on Saturday.');
    await click(
      '#create-thread-form button[type="submit"], button[type="submit"][form="create-thread-form"]',
    );
    await waitFor(`#post-${createdPostId}`);

    const url = new URL(currentURL(), window.location.origin);
    assert.strictEqual(url.pathname, '/thread');
    assert.strictEqual(url.searchParams.get('TID'), createdThreadId);
    assert
      .dom(`#post-${createdPostId}`)
      .includesText('Let’s meet on Saturday.');
    assert.strictEqual(submittedThread?.boardId, '14');
    assert.strictEqual(submittedThread?.title, 'Weekend meetup');
  });

  test('quoting a post prefills the reply and submits the quote with new text', async function (assert) {
    await visit(`/thread?TID=${threadId}`);
    await waitUntil(() => startupRefreshed);
    await openPostMenuLink('quote');
    assert.dom(editor).hasValue(quote);

    await fillIn(
      editor,
      `${quote}
I agree with this plan.`,
    );
    await click(submit);
    await waitFor(`#post-${replyId}`);

    assert.dom(`#post-${replyId}`).includesText('The opening post');
    assert.dom(`#post-${replyId}`).includesText('I agree with this plan.');
    assert.strictEqual(submittedReplies[0]?.threadId, threadId);
    assert.strictEqual(
      submittedReplies[0]?.message,
      `${quote}
I agree with this plan.`,
    );
  });

  test('editing a post opens the existing draft and updates the same post', async function (assert) {
    posts[0] = { ...openingPost, author: { id: '9', name: 'Test User' } };

    await visit(`/thread?TID=${threadId}`);
    await waitUntil(() => startupRefreshed);
    await openPostMenuLink('edit');
    assert.dom('#edit-post-form textarea').hasValue(openingPost.message);

    await fillIn('#edit-post-form textarea', 'Updated opening post');
    await click(
      '#edit-post-form button[type="submit"], button[type="submit"][form="edit-post-form"]',
    );
    await waitFor('#post-101');

    const url = new URL(currentURL(), window.location.origin);
    assert.strictEqual(url.pathname, '/thread');
    assert.strictEqual(url.searchParams.get('TID'), threadId);
    assert.dom('#post-101').includesText('Updated opening post');
    assert.dom('#post-101').doesNotIncludeText(openingPost.message);
  });
});
