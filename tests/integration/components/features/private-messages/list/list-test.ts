import { render, waitFor } from '@ember/test-helpers';
import type { TestContext } from '@ember/test-helpers';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { hbs } from 'ember-cli-htmlbars';
import { setupRenderingTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';
import { privateMessageMocks } from './_mock/private-messages';
import type ApiService from 'potber-client/services/api';
import { PrivateMessage } from 'potber-client/services/api/models/private-message';

class StubScrollObserver extends Service {
  @tracked scrollPosition = { x: 0, y: 0, xMax: 0, yMax: 100 };
}

interface Context extends TestContext {
  element: HTMLElement;
  messages: PrivateMessage[];
}

module(
  'Integration | Component | Feature | Private messages | List',
  function (hooks) {
    setupRenderingTest(hooks);

    test('should render all inbound messages as expected', async function (this: Context, assert) {
      this.messages = privateMessageMocks.inbound as PrivateMessage[];

      await render<Context>(
        hbs`<Features::PrivateMessages::List @messages={{this.messages}}/>`,
      );

      const messageListItems = this.element.getElementsByClassName(
        'private-messages-list-item',
      );
      assert.strictEqual(
        messageListItems.length,
        3,
        'should have 3 list items',
      );

      // First message is an unread message
      let message = messageListItems[0];
      assert
        .dom(message)
        .hasTextContaining(
          'Ungelesene Nachricht von User 1 (13:51 20.07.2023)',
        );
      assert.dom(message).hasClass('private-messages-list-item-unread');
      assert
        .dom(
          message?.getElementsByClassName(
            'private-message-unread-indicator',
          )[0],
        )
        .exists();
      assert.strictEqual(
        message?.getElementsByClassName('private-message-important-indicator')
          .length,
        0,
        'should not have an important indicator',
      );

      // Second message is a read important message
      message = messageListItems[1];
      assert
        .dom(message)
        .hasTextContaining('Wichtige Nachricht von User 2 (11:20 20.07.2023)');
      assert.dom(message).hasNoClass('private-messages-list-item-unread');
      assert.strictEqual(
        message?.getElementsByClassName('private-message-unread-indicator')
          .length,
        0,
        'should not have an unread indicator',
      );
      assert
        .dom(
          message?.getElementsByClassName(
            'private-message-important-indicator',
          )[0],
        )
        .exists();

      // Third message is a normal message that has already been read
      message = messageListItems[2];
      assert
        .dom(message)
        .hasTextContaining('Gelesene Nachricht von User 1 (00:56 02.12.2022)');
      assert.dom(message).hasNoClass('private-messages-list-item-unread');
      assert.strictEqual(
        message?.getElementsByClassName('private-message-unread-indicator')
          .length,
        0,
        'should not have an unread indicator',
      );
      assert.strictEqual(
        message?.getElementsByClassName('private-message-important-indicator')
          .length,
        0,
        'should not have an important indicator',
      );
    });

    test('shows more messages after scrolling near the end of a long list', async function (this: Context, assert) {
      this.owner.register('service:scroll-observer', StubScrollObserver);
      const scrollObserver = this.owner.lookup(
        'service:scroll-observer',
      ) as StubScrollObserver;
      const api = this.owner.lookup('service:api') as ApiService;
      this.messages = Array.from(
        { length: 103 },
        (_, index) =>
          new PrivateMessage(
            {
              id: String(index + 1),
              title: `Message ${index + 1}`,
              date: '2026-01-01T12:00:00Z',
              folder: 'inbound',
              unread: false,
              important: false,
              sender: { id: '7', name: 'Forum Member' },
            },
            { api },
          ),
      );

      await render<Context>(
        hbs`<Features::PrivateMessages::List @messages={{this.messages}} />`,
      );

      assert.dom('.private-messages-list-item').exists({ count: 100 });
      assert.dom('[data-icon="circle-notch"]').exists();

      scrollObserver.scrollPosition = {
        ...scrollObserver.scrollPosition,
        y: 85,
      };
      await waitFor('.private-messages-list-item', { count: 103 });

      assert
        .dom('.private-messages-list-item:last-child')
        .includesText('Message 103');
      assert.dom('[data-icon="circle-notch"]').doesNotExist();
    });
  },
);
