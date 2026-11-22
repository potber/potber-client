import Service from '@ember/service';
import { module, test } from 'qunit';
import type * as v from 'valibot';
import type ApiService from 'potber-client/services/api';
import { PayloadValidationError } from 'potber-client/services/api/error';
import { threadReadSchema } from 'potber-client/services/api/schemas/threads';
import type { Threads } from 'potber-client/services/api/types';
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

module('Unit | Service | Api | Thread payloads', function (hooks) {
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
});
