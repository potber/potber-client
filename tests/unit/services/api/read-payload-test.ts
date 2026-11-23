import Service from '@ember/service';
import { module, test } from 'qunit';
import * as v from 'valibot';
import type ApiService from 'potber-client/services/api';
import {
  ApiError,
  PayloadValidationError,
} from 'potber-client/services/api/error';
import { NewPrivateMessage } from 'potber-client/services/api/models/private-message';
import type { IBookmark } from 'potber-client/services/api/models/bookmark';
import { bookmarkSchema } from 'potber-client/services/api/schemas/bookmarks';
import { boardCategoriesSchema } from 'potber-client/services/api/schemas/board-categories';
import { boardReadSchema } from 'potber-client/services/api/schemas/boards';
import { privateMessageSchema } from 'potber-client/services/api/schemas/private-messages';
import { sessionSchema } from 'potber-client/services/api/schemas/session';
import { threadReadSchema } from 'potber-client/services/api/schemas/threads';
import type {
  BoardCategories,
  Boards,
  PrivateMessages,
  Threads,
} from 'potber-client/services/api/types';
import type { Session } from 'potber-client/services/api/types/session';
import { setupTest } from 'potber-client/tests/helpers';

// Compile-time guard: the schema output and the hand-written type must stay identical.
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
const schemaMatchesType: Equals<
  v.InferOutput<typeof threadReadSchema>,
  Threads.Read
> = true;

const boardSchemaMatchesType: Equals<
  v.InferOutput<typeof boardReadSchema>,
  Boards.Read
> = true;

const categorySchemaMatchesType: Equals<
  v.InferOutput<typeof boardCategoriesSchema>,
  BoardCategories.Read[]
> = true;

const bookmarkSchemaMatchesType: Equals<
  v.InferOutput<typeof bookmarkSchema>,
  IBookmark
> = true;

const sessionSchemaMatchesType: Equals<
  v.InferOutput<typeof sessionSchema>,
  Session
> = true;

const session = {
  userId: '101',
  username: 'Forum member',
  cookie: 'test-cookie',
  iat: 1,
  exp: 2,
};

const privateMessageSchemaMatchesType: Equals<
  v.InferOutput<typeof privateMessageSchema>,
  PrivateMessages.Read
> = true;

const privateMessage: PrivateMessages.Read = {
  id: '42',
  title: 'Forum meetup',
  date: '2026-01-01T12:00:00Z',
  folder: 'system',
  unread: true,
  important: false,
};

const bookmark: IBookmark = {
  id: '55',
  postId: '101',
  newPostsCount: 1,
  thread: { id: '42', title: 'Weekend plans', isClosed: false, pagesCount: 2 },
  board: { id: '14', name: 'General discussion' },
};

const author = { id: '7', name: 'Thread Author' };

function threadPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: '42',
    title: 'Weekend plans',
    boardId: '14',
    repliesCount: 1,
    hitsCount: 20,
    pagesCount: 1,
    isClosed: false,
    isSticky: false,
    isImportant: false,
    isAnnouncement: false,
    isGlobal: false,
    page: {
      number: 1,
      offset: 0,
      postCount: 2,
      posts: [
        {
          id: '101',
          message: 'The opening post',
          date: '2026-01-01T12:00:00.000Z',
          threadId: '42',
          boardId: '14',
          author,
          editedCount: 0,
        },
        {
          id: '102',
          date: '2026-01-01T13:00:00.000Z',
          threadId: '42',
          boardId: '14',
          author,
          editedCount: null,
          contentHidden: true,
        },
      ],
    },
    ...overrides,
  };
}

function boardPayload(threads: unknown[]) {
  return {
    id: '14',
    categoryId: '1',
    name: 'General discussion',
    threadsCount: 1,
    repliesCount: 1,
    page: {
      number: 1,
      stickiesCount: 0,
      globalsCount: 0,
      threadsCount: 1,
      threads,
    },
  };
}

module('Unit | Service | Api | Read payloads', function (hooks) {
  setupTest(hooks);

  let originalFetch: typeof fetch;
  let notifications: string[];
  let body: string;

  hooks.beforeEach(function () {
    notifications = [];
    originalFetch = window.fetch;
    window.fetch = async () =>
      new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    this.owner.register(
      'service:messages',
      class extends Service {
        log() {}
        showNotification(message: string) {
          notifications.push(message);
        }
      },
    );
    this.owner.register(
      'service:intl',
      class extends Service {
        t(key: string) {
          return key;
        }
      },
    );
    this.owner.register(
      'service:session',
      class extends Service {
        isAuthenticated = false;
      },
    );
  });

  hooks.afterEach(function () {
    window.fetch = originalFetch;
  });

  test('the thread schema output matches Threads.Read', function (assert) {
    assert.true(schemaMatchesType);
  });

  test('accepts hidden posts and normalizes a null edit count', async function (assert) {
    body = JSON.stringify(threadPayload());
    const api = this.owner.lookup('service:api') as ApiService;

    const thread = await api.findThreadById('42');

    const [opening, hidden] = thread.page?.posts ?? [];
    assert.strictEqual(opening?.message, 'The opening post');
    assert.strictEqual(hidden?.message, undefined);
    assert.true(hidden?.contentHidden);
    assert.strictEqual(hidden?.editedCount, undefined);
    assert.deepEqual(notifications, []);
  });

  test('drops keys the client does not know, including __proto__', async function (assert) {
    body = `{"__proto__":{"polluted":true},"unexpected":"value",${JSON.stringify(
      threadPayload(),
    ).slice(1)}`;
    const api = this.owner.lookup('service:api') as ApiService;

    const thread = await api.findThreadById('42');

    assert.false(Object.hasOwn(thread, 'unexpected'));
    assert.false(Object.hasOwn(thread, '__proto__'));
    assert.strictEqual(
      (thread as unknown as Record<string, unknown>)['polluted'],
      undefined,
    );
    assert.strictEqual(({} as Record<string, unknown>)['polluted'], undefined);
  });

  test('rejects a malformed thread without echoing payload content', async function (assert) {
    body = JSON.stringify(
      threadPayload({
        title: 'Secret title',
        pagesCount: 'many',
        page: { number: 1, offset: 0, postCount: 1, posts: 'Secret body' },
      }),
    );
    const api = this.owner.lookup('service:api') as ApiService;

    try {
      await api.findThreadById('42');
      assert.true(false, 'expected the request to fail');
    } catch (error) {
      assert.true(error instanceof PayloadValidationError);
      const { message, issues } = error as PayloadValidationError;
      assert.deepEqual(issues, [
        'pagesCount: expected number',
        'page.posts: expected Array',
      ]);
      assert.true(message.startsWith('Unexpected API payload for /threads/42'));
      assert.false(message.includes('Secret'));
      assert.false(message.includes('many'));
    }
    assert.strictEqual(notifications.length, 1, 'shows one fallback error');
  });

  test('rejects a JSON array instead of a thread', async function (assert) {
    body = JSON.stringify(['not', 'a', 'thread']);
    const api = this.owner.lookup('service:api') as ApiService;

    try {
      await api.findThreadById('42');
      assert.true(false, 'expected the request to fail');
    } catch (error) {
      assert.true(error instanceof PayloadValidationError);
      assert.true(
        (error as PayloadValidationError).issues.includes('id: missing'),
      );
    }
  });

  test('validates a board page without a description or last post', async function (assert) {
    const thread = threadPayload({ page: undefined });
    body = JSON.stringify(boardPayload([thread]));
    const api = this.owner.lookup('service:api') as ApiService;

    const board = await api.findBoardById('14');

    assert.true(boardSchemaMatchesType);
    assert.strictEqual(board.description, '');
    assert.strictEqual(board.lastPost, undefined);
    assert.strictEqual(board.page.number, 1);
    assert.strictEqual(board.page.threads[0]?.title, 'Weekend plans');
    assert.deepEqual(notifications, []);
  });

  test('rejects a malformed nested thread on a board page', async function (assert) {
    body = JSON.stringify(boardPayload([threadPayload({ title: 123 })]));
    const api = this.owner.lookup('service:api') as ApiService;

    await assert.rejects(
      api.findBoardById('14'),
      (error: unknown) =>
        error instanceof PayloadValidationError &&
        error.issues.includes('page.threads.0.title: expected string'),
    );
    assert.strictEqual(notifications.length, 1, 'shows one fallback error');
  });

  test('accepts board summaries without pagination and categories without boards', async function (assert) {
    const board = {
      id: '14',
      categoryId: '1',
      name: 'General discussion',
      threadsCount: 1,
      repliesCount: 2,
    };
    body = JSON.stringify([
      { id: '1', name: 'Community', boards: [board] },
      { id: '2', name: 'Empty category', description: '', boards: [] },
    ]);
    const api = this.owner.lookup('service:api') as ApiService;

    const categories = await api.findAllBoardCategories();

    assert.true(categorySchemaMatchesType);
    assert.deepEqual(categories, [
      {
        id: '1',
        name: 'Community',
        description: '',
        boards: [{ ...board, description: '' }],
      },
      { id: '2', name: 'Empty category', description: '', boards: [] },
    ]);
    assert.deepEqual(notifications, []);
  });

  test('rejects malformed board summaries in category responses', async function (assert) {
    body = JSON.stringify([
      {
        id: '1',
        name: 'Community',
        boards: [{ ...boardPayload([]), threadsCount: 'many' }],
      },
    ]);
    const api = this.owner.lookup('service:api') as ApiService;

    await assert.rejects(
      api.findAllBoardCategories(),
      (error: unknown) =>
        error instanceof PayloadValidationError &&
        error.issues.includes('0.boards.0.threadsCount: expected number'),
    );
    assert.strictEqual(notifications.length, 1, 'shows one fallback error');
  });

  test('post lookup rejects a malformed success response', async function (assert) {
    body = JSON.stringify({
      id: 101,
      threadId: '42',
      boardId: '14',
      date: '2026-01-01T12:00:00Z',
      author,
    });
    const api = this.owner.lookup('service:api') as ApiService;

    await assert.rejects(
      api.findPostById('101', '42'),
      (error: unknown) =>
        error instanceof PayloadValidationError &&
        error.issues.includes('id: expected string'),
    );
    assert.strictEqual(notifications.length, 1, 'shows one fallback error');
  });

  test('quoting a post rejects a malformed success response', async function (assert) {
    body = JSON.stringify({ message: ['invalid'] });
    const api = this.owner.lookup('service:api') as ApiService;

    await assert.rejects(
      api.quotePost('101'),
      (error: unknown) =>
        error instanceof PayloadValidationError &&
        error.issues.includes('message: expected string'),
    );
    assert.strictEqual(notifications.length, 1, 'shows one fallback error');
  });

  test('creating a post rejects a malformed success response', async function (assert) {
    body = JSON.stringify({
      id: 101,
      threadId: '42',
      boardId: '14',
      date: '2026-01-01T12:00:00Z',
      author,
    });
    const api = this.owner.lookup('service:api') as ApiService;

    await assert.rejects(
      api.createPost({ threadId: '42', message: 'Draft' }),
      (error: unknown) =>
        error instanceof PayloadValidationError &&
        error.issues.includes('id: expected string'),
    );
    assert.strictEqual(notifications.length, 1, 'shows one fallback error');
  });

  test('updating a post rejects a malformed success response', async function (assert) {
    body = JSON.stringify({
      id: 101,
      threadId: '42',
      boardId: '14',
      date: '2026-01-01T12:00:00Z',
      author,
    });
    const api = this.owner.lookup('service:api') as ApiService;

    await assert.rejects(
      api.updatePost('101', { threadId: '42', message: 'Draft' }),
      (error: unknown) =>
        error instanceof PayloadValidationError &&
        error.issues.includes('id: expected string'),
    );
    assert.strictEqual(notifications.length, 1, 'shows one fallback error');
  });

  test('an empty bookmark list is valid', async function (assert) {
    body = '[]';
    const api = this.owner.lookup('service:api') as ApiService;

    assert.true(bookmarkSchemaMatchesType);
    assert.deepEqual(await api.findAllBookmarks(), []);
    assert.deepEqual(notifications, []);
  });

  test('rejects a bookmark list with invalid nested thread data', async function (assert) {
    body = JSON.stringify([
      { ...bookmark, thread: { ...bookmark.thread, pagesCount: 'two' } },
    ]);
    const api = this.owner.lookup('service:api') as ApiService;

    await assert.rejects(
      api.findAllBookmarks(),
      (error: unknown) =>
        error instanceof PayloadValidationError &&
        error.issues.includes('0.thread.pagesCount: expected number'),
    );
    assert.strictEqual(notifications.length, 1, 'shows one fallback error');
  });

  test('rejects a malformed bookmark creation response before returning a model', async function (assert) {
    body = JSON.stringify({ ...bookmark, postId: 101 });
    const api = this.owner.lookup('service:api') as ApiService;

    await assert.rejects(
      api.createBookmark('101', '42'),
      (error: unknown) =>
        error instanceof PayloadValidationError &&
        error.issues.includes('postId: expected string'),
    );
    assert.strictEqual(notifications.length, 1, 'shows one fallback error');
  });

  test('rejects empty success responses for an endpoint that requires JSON', async function (assert) {
    const api = this.owner.lookup('service:api') as ApiService;
    for (const makeResponse of [
      () => new Response(null, { status: 204 }),
      () => new Response(null, { headers: { 'content-length': '0' } }),
      () => new Response(''),
    ]) {
      window.fetch = async () => makeResponse();
      await assert.rejects(
        api.findThreadById('42'),
        (error: unknown) =>
          error instanceof PayloadValidationError &&
          error.issues.includes('(root): missing'),
      );
    }
    assert.strictEqual(
      notifications.length,
      3,
      'one fallback error per request',
    );
  });

  test('infers the transformed schema output and returns the parsed value', async function (assert) {
    body = JSON.stringify('42');
    const api = this.owner.lookup('service:api') as ApiService;
    const result = await api.fetch('/test', {
      schema: v.pipe(v.string(), v.transform(Number)),
    });
    const outputIsNumber: Equals<typeof result, number> = true;

    assert.true(outputIsNumber);
    assert.strictEqual(result, 42);
  });

  test('applies a schema default to an absent body', async function (assert) {
    window.fetch = async () => new Response(null, { status: 204 });
    const api = this.owner.lookup('service:api') as ApiService;

    assert.strictEqual(
      await api.fetch('/test', { schema: v.optional(v.string(), 'default') }),
      'default',
    );
    assert.deepEqual(notifications, []);
  });

  test('allows an empty success response for a no-content endpoint', async function (assert) {
    window.fetch = async () => new Response(null, { status: 204 });
    const api = this.owner.lookup('service:api') as ApiService;

    assert.strictEqual(await api.deleteBookmark('55'), undefined);
    assert.deepEqual(notifications, []);
  });

  test('accepts sessions without an avatar', async function (assert) {
    body = JSON.stringify(session);
    const api = this.owner.lookup('service:api') as ApiService;

    assert.true(sessionSchemaMatchesType);
    assert.deepEqual(await api.getSession(), session);
  });

  test('rejects malformed sessions without including cookie values in errors', async function (assert) {
    body = JSON.stringify({ ...session, exp: '2' });
    const api = this.owner.lookup('service:api') as ApiService;

    await assert.rejects(
      api.getSession(),
      (error: unknown) =>
        error instanceof PayloadValidationError &&
        error.issues.includes('exp: expected number') &&
        !error.message.includes(session.cookie),
    );
    assert.strictEqual(notifications.length, 1);
  });

  test('accepts a system message list item without participants or content', async function (assert) {
    body = JSON.stringify([privateMessage]);
    const api = this.owner.lookup('service:api') as ApiService;
    const [message] = await api.findManyPrivateMessages();

    assert.true(privateMessageSchemaMatchesType);
    assert.strictEqual(message?.id, privateMessage.id);
    assert.strictEqual(message?.sender, undefined);
    assert.strictEqual(message?.content, undefined);
  });

  test('rejects an invalid folder in a private message list', async function (assert) {
    body = JSON.stringify([{ ...privateMessage, folder: 'archive' }]);
    const api = this.owner.lookup('service:api') as ApiService;

    await assert.rejects(
      api.findManyPrivateMessages(),
      (error: unknown) =>
        error instanceof PayloadValidationError &&
        error.issues.some((issue) => issue.startsWith('0.folder:')),
    );
  });

  test('rejects a malformed private message detail', async function (assert) {
    body = JSON.stringify({ ...privateMessage, content: ['invalid'] });
    const api = this.owner.lookup('service:api') as ApiService;

    await assert.rejects(
      api.findPrivateMessageById('42'),
      (error: unknown) =>
        error instanceof PayloadValidationError &&
        error.issues.includes('content: expected string'),
    );
  });

  test('preserves defaults for a draft without a copy preference and explicit false', async function (assert) {
    const draft = {
      title: 'Re: Meetup',
      content: '',
      recipientName: 'Forum member',
    };
    const api = this.owner.lookup('service:api') as ApiService;

    body = JSON.stringify(draft);
    const reply = await api.replyToPrivateMessage('42');
    assert.strictEqual(reply.recipientName, 'Forum member');
    assert.true(reply.saveCopy);

    body = JSON.stringify({ ...draft, recipientName: '', saveCopy: false });
    const forward = await api.forwardPrivateMessage('42');
    assert.strictEqual(forward.recipientName, '');
    assert.false(forward.saveCopy);
  });

  test('rejects malformed reply and forward drafts', async function (assert) {
    body = JSON.stringify({
      title: 'Re: Meetup',
      content: 42,
      recipientName: '',
    });
    const api = this.owner.lookup('service:api') as ApiService;

    for (const fetchDraft of [
      () => api.replyToPrivateMessage('42'),
      () => api.forwardPrivateMessage('42'),
    ]) {
      await assert.rejects(
        fetchDraft(),
        (error: unknown) =>
          error instanceof PayloadValidationError &&
          error.issues.includes('content: expected string'),
      );
    }
    assert.strictEqual(notifications.length, 2);
  });

  test('accepts a user profile without optional avatar or activity details', async function (assert) {
    const user = { id: '7', name: 'Forum member' };
    body = JSON.stringify(user);
    const api = this.owner.lookup('service:api') as ApiService;

    assert.deepEqual(await api.findUserById('7'), user);
  });

  test('rejects malformed user profile values', async function (assert) {
    body = JSON.stringify({ id: '7', name: 'Forum member', locked: 'false' });
    const api = this.owner.lookup('service:api') as ApiService;

    await assert.rejects(
      api.findUserById('7'),
      (error: unknown) =>
        error instanceof PayloadValidationError &&
        error.issues.includes('locked: expected boolean'),
    );
  });

  test('accepts an empty username search result', async function (assert) {
    body = '[]';
    const api = this.owner.lookup('service:api') as ApiService;

    assert.deepEqual(await api.findManyUsernames('Forum'), []);
  });

  test('rejects non-string username suggestions', async function (assert) {
    body = JSON.stringify(['Forum member', { name: 'Another member' }]);
    const api = this.owner.lookup('service:api') as ApiService;

    await assert.rejects(
      api.findManyUsernames('Forum'),
      (error: unknown) =>
        error instanceof PayloadValidationError &&
        error.issues.includes('1: expected string'),
    );
  });

  test('rejects a thread creation response without the new thread ID', async function (assert) {
    body = JSON.stringify(threadPayload({ id: undefined }));
    const api = this.owner.lookup('service:api') as ApiService;

    await assert.rejects(
      api.createThread({
        boardId: '14',
        title: 'Forum meetup',
        openingPost: { message: 'Let’s meet on Saturday.' },
      }),
      (error: unknown) =>
        error instanceof PayloadValidationError &&
        error.issues.includes('id: missing'),
    );
    assert.strictEqual(notifications.length, 1);
  });

  test('accepts the empty success forms used by forum mutations', async function (assert) {
    const api = this.owner.lookup('service:api') as ApiService;

    window.fetch = async () => new Response(null, { status: 204 });
    assert.strictEqual(await api.deleteBookmark('55'), undefined);
    assert.strictEqual(await api.deletePrivateMessage('42'), undefined);

    window.fetch = async () => new Response(null, { status: 200 });
    assert.strictEqual(await api.markPrivateMessageAsUnread('42'), undefined);
    assert.strictEqual(
      await api.movePrivateMessageToFolder('42', 'outbound'),
      undefined,
    );

    window.fetch = async () => new Response(null, { status: 201 });
    assert.strictEqual(
      await api.createPrivateMessage(new NewPrivateMessage(api)),
      undefined,
    );
    assert.strictEqual(
      await api.reportPost('101', { cause: 'Reason' }),
      undefined,
    );
  });

  test('rejects an unexpected success payload from a bodyless mutation', async function (assert) {
    const api = this.owner.lookup('service:api') as ApiService;
    body = JSON.stringify({ unexpected: true });

    await assert.rejects(api.deleteBookmark('55'), PayloadValidationError);
  });

  test('keeps valid error messages and falls back to the HTTP status for invalid fields', async function (assert) {
    const api = this.owner.lookup('service:api') as ApiService;
    window.fetch = async () =>
      Response.json(
        { statusCode: 'wrong', error: false, message: ['First', 'Second'] },
        { status: 400, statusText: 'Bad Request' },
      );

    await assert.rejects(api.deleteBookmark('55'), (error: unknown) => {
      return (
        error instanceof ApiError &&
        error.statusCode === 400 &&
        error.error === 'Bad Request' &&
        error.messages.join('; ') === 'First; Second'
      );
    });
  });

  test('uses the HTTP error when a gateway returns a non-JSON body', async function (assert) {
    const api = this.owner.lookup('service:api') as ApiService;
    window.fetch = async () =>
      new Response('Unavailable', { status: 502, statusText: 'Bad Gateway' });

    await assert.rejects(api.deleteBookmark('55'), (error: unknown) => {
      return (
        error instanceof ApiError &&
        error.statusCode === 502 &&
        error.messages[0] === 'Bad Gateway'
      );
    });
  });
});
