import Service from '@ember/service';
import { module, test } from 'qunit';
import type { NotificationEntry } from 'potber-client/services/notifications';
import MessagesService from 'potber-client/services/messages';
import { setupTest } from 'potber-client/tests/helpers';

module('Unit | Service | Messages', function (hooks) {
  setupTest(hooks);

  test('showNotification forwards the correct type and default options', function (assert) {
    const calls: Array<{
      method: string;
      message: string;
      options: object | undefined;
    }> = [];

    class NotificationsStub extends Service {
      success(message: string, options?: object) {
        calls.push({ method: 'success', message, options });
      }

      warning(message: string, options?: object) {
        calls.push({ method: 'warning', message, options });
      }

      error(message: string, options?: object) {
        calls.push({ method: 'error', message, options });
      }

      info(message: string, options?: object) {
        calls.push({ method: 'info', message, options });
      }
    }

    class SettingsStub extends Service {
      getSetting(): boolean {
        return false;
      }
    }

    this.owner.register('service:notifications', NotificationsStub);
    this.owner.register('service:settings', SettingsStub);

    const messages = this.owner.lookup('service:messages') as MessagesService;

    messages.showNotification('Saved', 'success');
    messages.showNotification('Careful', 'warning');
    messages.showNotification('Failed', 'error');
    messages.showNotification('FYI', 'info');

    assert.deepEqual(calls, [
      {
        method: 'success',
        message: 'Saved',
        options: {
          autoClear: true,
          clearDuration: 5000,
          onClick: undefined,
        },
      },
      {
        method: 'warning',
        message: 'Careful',
        options: {
          autoClear: true,
          clearDuration: 5000,
          onClick: undefined,
        },
      },
      {
        method: 'error',
        message: 'Failed',
        options: {
          autoClear: true,
          clearDuration: 5000,
          onClick: undefined,
        },
      },
      {
        method: 'info',
        message: 'FYI',
        options: {
          autoClear: true,
          clearDuration: 5000,
          onClick: undefined,
        },
      },
    ]);
  });

  test('removeNotification delegates to the notifications service', function (assert) {
    assert.expect(1);

    const notification = {} as NotificationEntry;

    class NotificationsStub extends Service {
      removeNotification(entry: NotificationEntry) {
        assert.strictEqual(entry, notification);
      }
    }

    class SettingsStub extends Service {
      getSetting(): boolean {
        return false;
      }
    }

    this.owner.register('service:notifications', NotificationsStub);
    this.owner.register('service:settings', SettingsStub);

    const messages = this.owner.lookup('service:messages') as MessagesService;

    messages.removeNotification(notification);
  });
});
