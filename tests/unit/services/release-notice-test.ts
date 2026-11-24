import Service from '@ember/service';
import type { ConfirmModalOptions } from 'potber-client/components/modal/types/confirm';
import { appConfig } from 'potber-client/config/app.config';
import type ReleaseNoticeService from 'potber-client/services/release-notice';
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

module('Unit | Service | Release notice', function (hooks) {
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
    const notice = this.owner.lookup(
      'service:release-notice',
    ) as ReleaseNoticeService;
    const storage = this.owner.lookup(
      'service:local-storage',
    ) as LocalStorageStub;
    const modal = this.owner.lookup('service:modal') as ModalStub;

    await notice.showIfUpdated();

    assert.deepEqual(storage.writes, ['1.29.0']);
    assert.strictEqual(modal.confirmCalls.length, 0);
  });

  test('shows the modal only for a newer version', async function (assert) {
    const notice = this.owner.lookup(
      'service:release-notice',
    ) as ReleaseNoticeService;
    const storage = this.owner.lookup(
      'service:local-storage',
    ) as LocalStorageStub;
    const modal = this.owner.lookup('service:modal') as ModalStub;
    storage.encounteredVersion = '1.28.1';
    notice.versionModalDelayMs = 0;

    await notice.showIfUpdated();

    assert.deepEqual(storage.writes, ['1.29.0']);
    assert.strictEqual(modal.confirmCalls.length, 1);
  });

  test('ignores invalid current versions and rollbacks', async function (assert) {
    const notice = this.owner.lookup(
      'service:release-notice',
    ) as ReleaseNoticeService;
    const storage = this.owner.lookup(
      'service:local-storage',
    ) as LocalStorageStub;
    appConfig.version = '';
    await notice.showIfUpdated();

    appConfig.version = '1.29.0';
    storage.encounteredVersion = '1.30.0';
    await notice.showIfUpdated();

    assert.deepEqual(storage.writes, []);
  });
});
