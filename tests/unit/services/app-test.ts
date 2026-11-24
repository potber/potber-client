import type AppService from 'potber-client/services/app';
import { setupTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Service | App | Initialization', function (hooks) {
  setupTest(hooks);

  test('loads synchronized settings without blocking application startup', async function (assert) {
    const app = this.owner.lookup('service:app') as AppService;
    let finishSessionSetup: (() => void) | undefined;

    app.exceptionHandler.initialize = () => undefined;
    app.settings.initialize = () => undefined;
    app.newsfeed.initialize = () => undefined;
    app.renderer.initialize = () => undefined;
    app.deviceManager.initialize = () => undefined;
    app.renderer.removeAppSkeleton = async () => undefined;
    app.releaseNotice.showIfUpdated = async () => undefined;
    app.deploymentVersion.initialize = () => undefined;
    app.sessionSetup.setup = async () =>
      new Promise<void>((resolve) => {
        finishSessionSetup = resolve;
      });

    await app.initialize();

    assert.true(
      app.initialized,
      'startup completes while settings are loading',
    );
    assert.ok(finishSessionSetup, 'settings synchronization started');
    finishSessionSetup?.();
  });
});
