import { module, test } from 'qunit';
import EphemeralSessionStore from 'ember-simple-auth/session-stores/ephemeral';
import {
  authenticateSession,
  invalidateSession,
} from 'ember-simple-auth/test-support';
import type CustomSession from 'potber-client/services/custom-session';
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
});
