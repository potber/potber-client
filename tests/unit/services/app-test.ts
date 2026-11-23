import Service from '@ember/service';
import type { ConfirmModalOptions } from 'potber-client/components/modal/types/confirm';
import { appConfig } from 'potber-client/config/app.config';
import AppService from 'potber-client/services/app';
import { setupTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

class LocalStorageStub extends Service {
  encounteredVersion: string | undefined;
  writes: string[] = [];

  getEncounteredVersion() {
    return this.encounteredVersion;
  }

  setEncounteredVersion(version: string) {
    this.encounteredVersion = version;
    this.writes.push(version);
  }
}

class ModalStub extends Service {
  confirmCalls: ConfirmModalOptions[] = [];

  confirm(options: ConfirmModalOptions) {
    this.confirmCalls.push(options);
  }
}

module('Unit | Service | App | Version check', function (hooks) {
  setupTest(hooks);

  let originalVersion: string;

  hooks.beforeEach(function () {
    originalVersion = appConfig.version;
    appConfig.version = '1.29.0';
    this.owner.register('service:local-storage', LocalStorageStub);
    this.owner.register('service:modal', ModalStub);
  });

  hooks.afterEach(function () {
    appConfig.version = originalVersion;
  });

  test('establishes a first-use baseline without showing the modal', async function (assert) {
    const app = this.owner.lookup('service:app') as AppService;
    const storage = this.owner.lookup(
      'service:local-storage',
    ) as LocalStorageStub;
    const modal = this.owner.lookup('service:modal') as ModalStub;

    await app.checkForNewVersion();

    assert.deepEqual(storage.writes, ['1.29.0']);
    assert.strictEqual(modal.confirmCalls.length, 0);
  });

  test('shows the modal only for a newer version', async function (assert) {
    const app = this.owner.lookup('service:app') as AppService;
    const storage = this.owner.lookup(
      'service:local-storage',
    ) as LocalStorageStub;
    const modal = this.owner.lookup('service:modal') as ModalStub;
    storage.encounteredVersion = '1.28.1';
    app.versionModalDelayMs = 0;

    await app.checkForNewVersion();

    assert.deepEqual(storage.writes, ['1.29.0']);
    assert.strictEqual(modal.confirmCalls.length, 1);
  });

  test('ignores invalid current versions and rollbacks', async function (assert) {
    const app = this.owner.lookup('service:app') as AppService;
    const storage = this.owner.lookup(
      'service:local-storage',
    ) as LocalStorageStub;
    appConfig.version = '';
    await app.checkForNewVersion();

    appConfig.version = '1.29.0';
    storage.encounteredVersion = '1.30.0';
    await app.checkForNewVersion();

    assert.deepEqual(storage.writes, []);
  });
});

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
    app.checkForNewVersion = async () => undefined;
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
