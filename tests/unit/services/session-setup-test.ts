import { destroy } from '@ember/destroyable';
import Service from '@ember/service';
import type SessionSetupService from 'potber-client/services/session-setup';
import { setupTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Service | Session setup', function (hooks) {
  setupTest(hooks);
  hooks.beforeEach(function () {
    class SessionStub extends Service {
      isAuthenticated = true;
      accessToken = 'fixture';
      sessionData = null;
    }
    this.owner.register('service:session', SessionStub);
  });

  test('stops startup if destroyed while reading the forum session', async function (assert) {
    const setup = this.owner.lookup(
      'service:session-setup',
    ) as SessionSetupService;
    setup.session.setup = async () => undefined;
    setup.session.update = async () => {
      assert.step('read session');
      destroy(setup);
    };
    setup.socials.load = () => {
      throw new Error(
        'Expected startup to stop before loading social settings',
      );
    };

    await setup.setup();

    assert.verifySteps(['read session']);
  });

  test('stops startup if destroyed while loading synced settings', async function (assert) {
    const setup = this.owner.lookup(
      'service:session-setup',
    ) as SessionSetupService;
    setup.session.setup = async () => undefined;
    setup.session.update = async () => {
      setup.session.sessionData = {
        userId: '42',
        username: 'Fixture',
        avatarUrl: '',
        cookie: '',
        iat: 0,
        exp: 0,
      };
    };
    setup.settingsSync.initialize = async (settings) => {
      assert.step('load synced settings');
      destroy(setup);
      return settings;
    };
    setup.localStorage.initialize = async () => {
      throw new Error('Expected startup to stop before initializing storage');
    };

    await setup.setup();

    assert.verifySteps(['load synced settings']);
  });
});
