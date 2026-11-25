import { settled } from '@ember/test-helpers';
import { module, test } from 'qunit';
import NotificationsService, {
  NotificationEntry,
} from 'potber-client/services/notifications';
import { setupTest } from 'potber-client/tests/helpers';

module('Unit | Service | Notifications', function (hooks) {
  setupTest(hooks);

  test('uses service defaults and honors explicit notification options', async function (assert) {
    const notifications = this.owner.lookup(
      'service:notifications',
    ) as NotificationsService;
    notifications.setDefaultAutoClear(true);
    notifications.setDefaultClearDuration(0);

    const temporary = notifications.addNotification({ message: 'Temporary' });
    const persistent = notifications.warning('Persistent', {
      autoClear: false,
      clearDuration: 200,
    });

    assert.strictEqual(temporary.type, 'info');
    assert.strictEqual(temporary.clearDuration, 0);
    assert.strictEqual(persistent.type, 'warning');
    assert.strictEqual(persistent.clearDuration, 200);
    await settled();

    assert.deepEqual(notifications.content, [persistent]);
    assert.false(persistent.dismiss);
  });

  test('pauses a notification until its auto-clear timer is resumed', async function (assert) {
    const notifications = this.owner.lookup(
      'service:notifications',
    ) as NotificationsService;
    const notification = notifications.info('Pause me', {
      autoClear: true,
      clearDuration: 100,
    });

    notifications.pauseAutoClear(notification);
    notifications.pauseAutoClear(notification);
    await settled();

    assert.true(notification.paused);
    assert.false(notification.dismiss);
    assert.deepEqual(notifications.content, [notification]);

    notifications.resumeAutoClear(notification);
    assert.false(notification.paused);
    await settled();

    assert.true(notification.dismiss);
    assert.deepEqual(notifications.content, []);
  });

  test('starts dismissing immediately when a resumed notification has no time left', async function (assert) {
    const notifications = this.owner.lookup(
      'service:notifications',
    ) as NotificationsService;
    const notification = notifications.info('Expired', {
      autoClear: true,
      clearDuration: 0,
    });

    notifications.pauseAutoClear(notification);
    assert.strictEqual(notification.remaining, 0);
    notifications.resumeAutoClear(notification);

    assert.false(notification.paused);
    assert.true(notification.dismiss);
    await settled();
    assert.deepEqual(notifications.content, []);
  });

  test('ignores invalid removals and clears active notifications', async function (assert) {
    const notifications = this.owner.lookup(
      'service:notifications',
    ) as NotificationsService;
    assert.throws(
      () => notifications.addNotification({ message: '' }),
      /No notification message set/,
    );

    const first = notifications.info('First');
    const second = notifications.info('Second');
    const foreign = new NotificationEntry({ message: 'Other service' });

    notifications.setupAutoClear(first);
    notifications.pauseAutoClear(first);
    notifications.resumeAutoClear(first);
    notifications.removeNotification();
    notifications.removeNotification(foreign);
    assert.false(first.paused);
    assert.false(foreign.dismiss);
    assert.deepEqual(notifications.content, [first, second]);

    notifications.removeNotification(first);
    notifications.clearAll();
    assert.true(first.dismiss);
    assert.true(second.dismiss);
    await settled();
    assert.deepEqual(notifications.content, []);
  });
});
