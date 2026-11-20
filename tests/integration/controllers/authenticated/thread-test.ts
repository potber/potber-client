import { render, settled } from '@ember/test-helpers';
import type { TestContext } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import ThreadController from 'potber-client/controllers/authenticated/thread';
import ThreadRoute from 'potber-client/routes/authenticated/thread';
import { setupRenderingTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

interface Context extends TestContext {
  controller: ThreadController;
}

module('Integration | Controller | Authenticated | Thread', function (hooks) {
  setupRenderingTest(hooks);

  test('resets consumed query parameters when leaving the route', async function (this: Context, assert) {
    const controller = this.owner.lookup(
      'controller:authenticated.thread',
    ) as ThreadController;
    const route = this.owner.lookup(
      'route:authenticated.thread',
    ) as ThreadRoute;

    controller.TID = '213203';
    controller.page = '3';
    controller.PID = '1250000000';
    controller.scrollToBottom = 'true';
    this.controller = controller;

    await render<Context>(hbs`
      <span data-test-query-params>
        {{this.controller.TID}}/{{this.controller.page}}/{{this.controller.PID}}/{{this.controller.scrollToBottom}}
      </span>
    `);

    route.resetController(controller);
    await settled();

    assert.dom('[data-test-query-params]').hasText('///');
  });
});
