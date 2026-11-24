import Service from '@ember/service';
import type SettingsEffectsService from 'potber-client/services/settings-effects';
import { Gestures } from 'potber-client/services/settings/types';
import { setupTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

class SettingsStub extends Service {
  debug = false;
  gestures = Gestures.none;

  getSetting(key: 'debug' | 'gestures') {
    return this[key];
  }
}

module('Unit | Service | Settings effects', function (hooks) {
  setupTest(hooks);

  test('shows the debug overlay only when debug and gestures are both enabled', function (assert) {
    const styles: Record<string, string> = {};
    this.owner.register('service:settings', SettingsStub);
    this.owner.register(
      'service:renderer',
      class extends Service {
        setStyleVariable(key: string, value: string) {
          styles[key] = value;
        }
      },
    );
    const effects = this.owner.lookup(
      'service:settings-effects',
    ) as SettingsEffectsService;
    const settings = this.owner.lookup('service:settings') as SettingsStub;
    const background = '--gestures-container-background';

    settings.debug = true;
    effects.apply('debug');
    assert.strictEqual(styles[background], 'unset');

    settings.gestures = Gestures.onlySidebar;
    effects.apply('debug');
    assert.strictEqual(
      styles[background],
      'var(--gestures-container-background-debug)',
    );

    settings.debug = false;
    effects.apply('debug');
    assert.strictEqual(styles[background], 'unset');
  });
});
