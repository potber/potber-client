import { module, test } from 'qunit';
import { visit, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from 'potber-client/tests/helpers';
import Service from '@ember/service';
import SettingsController from 'potber-client/controllers/authenticated/settings';
import { SidebarLayout } from 'potber-client/services/settings';
import RendererService from 'potber-client/services/renderer';
import SettingsService from 'potber-client/services/settings';

module('Acceptance | Authenticated | Settings', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    class AppStub extends Service {
      initialize = async () => {
        return;
      };
    }

    class SessionStub extends Service {
      isAuthenticated = true;
      sessionData = {
        userId: '1',
        username: 'Test User',
        avatarUrl: '',
        cookie: '',
        iat: 0,
        exp: 0,
      };

      requireAuthentication = () => {
        return;
      };

      update = async () => {
        return;
      };

      invalidate = async () => {
        return;
      };
    }

    this.owner.register('service:app', AppStub);
    this.owner.register('service:session', SessionStub);
  });

  test('visiting /settings', async function (assert) {
    await visit('/settings');
    assert.strictEqual(currentURL(), '/settings');
  });

  test('changing the sidebar layout to bottom-right', async function (assert) {
    await visit('/settings');

    const renderer = this.owner.lookup('service:renderer') as RendererService;
    const settings = this.owner.lookup('service:settings') as SettingsService;
    let updateSidebarLayoutCalls = 0;

    renderer.isDesktop = false;
    renderer.updateSidebarLayout = () => {
      updateSidebarLayoutCalls += 1;
    };

    const controller = this.owner.lookup(
      'controller:authenticated.settings',
    ) as SettingsController;

    controller.handleSidebarLayoutSelect({
      label: 'Rechts (unten)',
      data: SidebarLayout.rightBottom,
    });

    assert.strictEqual(settings.sidebarLayout, SidebarLayout.rightBottom);
    assert.strictEqual(updateSidebarLayoutCalls, 1);
  });
});
