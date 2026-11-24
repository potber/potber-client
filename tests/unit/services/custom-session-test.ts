import Service from '@ember/service';
import { waitUntil } from '@ember/test-helpers';
import { module, test } from 'qunit';
import EphemeralSessionStore from 'ember-simple-auth/session-stores/ephemeral';
import {
  authenticateSession,
  invalidateSession,
} from 'ember-simple-auth/test-support';
import type CustomSession from 'potber-client/services/custom-session';
import {
  ApiError,
  PayloadValidationError,
} from 'potber-client/services/api/error';
import type { Session } from 'potber-client/services/api/types/session';
import { setupTest } from 'potber-client/tests/helpers';

module('Unit | Service | CustomSession', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('session-store:application', EphemeralSessionStore);
  });

  function session(owner: { lookup(name: string): unknown }) {
    return owner.lookup('service:session') as CustomSession;
  }

  // These tests skip `setup()`: its handlers fetch the forum session and reload the page on sign-out.
  test('has no access token while signed out', function (assert) {
    assert.strictEqual(session(this.owner).accessToken, undefined);
  });

  test('exposes the access token after sign-in and drops it after sign-out', async function (assert) {
    await authenticateSession({ access_token: 'forum-token' });
    assert.strictEqual(session(this.owner).accessToken, 'forum-token');

    await invalidateSession();
    assert.strictEqual(session(this.owner).accessToken, undefined);
  });

  test('ignores a persisted token that is not a non-empty string', async function (assert) {
    for (const access_token of ['', 42, { value: 'forum-token' }, null]) {
      await authenticateSession({ access_token });
      assert.strictEqual(
        session(this.owner).accessToken,
        undefined,
        `rejects ${JSON.stringify(access_token)}`,
      );
    }
  });

  module('update', function (hooks) {
    const forumSession: Session = {
      userId: '42',
      username: 'Test User',
      avatarUrl: '',
      cookie: '',
      iat: 0,
      exp: 0,
    };
    let readSession: () => Promise<Session>;
    let invalidations: number;

    hooks.beforeEach(async function () {
      readSession = async () => forumSession;
      class ApiStub extends Service {
        getSession = () => readSession();
      }
      this.owner.register('service:api', ApiStub);
      await authenticateSession({ access_token: 'forum-token' });
      invalidations = 0;
      const current = session(this.owner);
      const invalidate = current.invalidate.bind(current);
      current.invalidate = () => {
        invalidations += 1;
        return invalidate();
      };
    });

    test('loads the forum session', async function (assert) {
      await session(this.owner).update();
      assert.deepEqual(session(this.owner).sessionData, forumSession);
    });

    test('signs out when the forum rejects the token with HTTP 401', async function (assert) {
      const current = session(this.owner);
      readSession = () =>
        Promise.reject(new ApiError(401, 'Unauthorized', 'Unauthorized'));

      await current.update();
      await waitUntil(() => !current.isAuthenticated);

      assert.strictEqual(invalidations, 1);
      assert.strictEqual(current.accessToken, undefined);
    });

    const transientFailures: Array<[string, () => Error]> = [
      ['a network error', () => new TypeError('Failed to fetch')],
      [
        'a timeout',
        () => new DOMException('The operation timed out.', 'TimeoutError'),
      ],
      [
        'HTTP 500',
        () => new ApiError(500, 'Internal Server Error', 'Server error'),
      ],
      [
        'an unexpected payload',
        () => new PayloadValidationError('/auth/session', ['userId: missing']),
      ],
    ];

    for (const [name, failure] of transientFailures) {
      test(`stays signed in after ${name} on first load`, async function (assert) {
        const current = session(this.owner);
        readSession = () => Promise.reject(failure());

        await current.update();

        assert.strictEqual(invalidations, 0, 'does not sign out');
        assert.true(current.isAuthenticated);
        assert.strictEqual(current.accessToken, 'forum-token');
        assert.strictEqual(current.sessionData, null);
      });

      test(`keeps loaded session data after ${name}`, async function (assert) {
        const current = session(this.owner);
        await current.update();
        readSession = () => Promise.reject(failure());

        await current.update();

        assert.strictEqual(invalidations, 0, 'does not sign out');
        assert.true(current.isAuthenticated);
        assert.deepEqual(current.sessionData, forumSession);
      });
    }
  });
});
