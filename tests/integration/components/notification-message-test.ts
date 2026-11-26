import Service from '@ember/service';
import {
  click,
  render,
  triggerEvent,
  type TestContext,
} from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import NotificationMessage from 'potber-client/components/notification-message';
import { NotificationEntry } from 'potber-client/services/notifications';
import { setupRenderingTest } from 'potber-client/tests/helpers';

interface Context extends TestContext {
  NotificationMessage: typeof NotificationMessage;
  notification: NotificationEntry;
}

module('Integration | Component | Notification message', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function (this: Context) {
    this.NotificationMessage = NotificationMessage;
  });

  test('runs a notification action and dismisses without running it again', async function (this: Context, assert) {
    this.notification = new NotificationEntry({
      type: 'error',
      message: 'Save failed',
      onClick: (entry) => {
        assert.strictEqual(entry, this.notification);
        assert.step('action');
      },
    });
    const notification = this.notification;
    this.owner.register(
      'service:notifications',
      class extends Service {
        removeNotification(entry: NotificationEntry) {
          assert.strictEqual(entry, notification);
          entry.dismiss = true;
          assert.step('dismiss');
        }
      },
    );

    await render<Context>(
      hbs`<this.NotificationMessage @notification={{this.notification}} />`,
    );

    assert.dom('.c-notification').hasClass('c-notification--clickable');
    assert.dom('.c-notification__icon [data-icon="circle-xmark"]').exists();
    await click('.c-notification__message');
    await click('.c-notification__close');

    assert.verifySteps(['action', 'dismiss']);
    assert.dom('.c-notification').doesNotHaveClass('c-notification--in');
  });

  test('pauses and resumes the countdown while hovering', async function (this: Context, assert) {
    this.notification = new NotificationEntry({
      type: 'warning',
      message: 'Connection interrupted',
      autoClear: true,
      clearDuration: 3200,
    });
    this.owner.register(
      'service:notifications',
      class extends Service {
        pauseAutoClear(entry: NotificationEntry) {
          entry.paused = true;
        }

        resumeAutoClear(entry: NotificationEntry) {
          entry.paused = false;
        }
      },
    );

    await render<Context>(
      hbs`<this.NotificationMessage @notification={{this.notification}} />`,
    );

    const countdown = '.c-notification__countdown';
    assert
      .dom('.c-notification__icon [data-icon="triangle-exclamation"]')
      .exists();
    assert.dom(countdown).hasStyle({ animationPlayState: 'running' });
    await triggerEvent('.c-notification', 'mouseenter');
    assert.dom(countdown).hasStyle({ animationPlayState: 'paused' });
    await triggerEvent('.c-notification', 'mouseleave');
    assert.dom(countdown).hasStyle({ animationPlayState: 'running' });
  });
});
