import { render, type TestContext } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import MessageItem from 'potber-client/components/routes/applog/message-item';
import type { Message } from 'potber-client/services/messages';
import { setupRenderingTest } from 'potber-client/tests/helpers';

interface Context extends TestContext {
  MessageItem: typeof MessageItem;
  message: Message;
}

module('Integration | Component | Application log message', function (hooks) {
  setupRenderingTest(hooks);

  for (const [type, icon] of [
    ['info', 'circle-info'],
    ['success', 'circle-check'],
    ['warning', 'triangle-exclamation'],
    ['error', 'circle-exclamation'],
  ] as const) {
    test(`shows the ${type} severity and message context`, async function (this: Context, assert) {
      this.MessageItem = MessageItem;
      this.message = {
        date: new Date('2026-11-26T12:00:00Z'),
        type,
        context: 'Settings sync',
        text: 'Local preferences loaded',
      };

      await render<Context>(
        hbs`<this.MessageItem @message={{this.message}} />`,
      );

      assert.dom('.message-item').hasClass(`bg-${type}`);
      assert.dom('.message-item .subtitle').includesText('[Settings sync]');
      assert.dom(`.message-item [data-icon="${icon}"]`).exists();
      assert
        .dom('.message-item p:last-child')
        .hasText('Local preferences loaded');
    });
  }
});
