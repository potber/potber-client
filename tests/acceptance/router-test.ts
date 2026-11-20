import RouterService from '@ember/routing/router-service';
import { setupApplicationTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

module('Acceptance | Router', function (hooks) {
  setupApplicationTest(hooks);

  test('private-message actions use their matching URL paths', function (assert) {
    const router = this.owner.lookup('service:router') as RouterService;

    assert.strictEqual(
      router.urlFor('authenticated.private-messages.reply', '123'),
      '/private-messages/123/reply',
    );
    assert.strictEqual(
      router.urlFor('authenticated.private-messages.forward', '123'),
      '/private-messages/123/forward',
    );
  });
});
