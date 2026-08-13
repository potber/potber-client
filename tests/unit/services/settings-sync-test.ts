import SettingsSyncService, {
  SettingsSyncRequestError,
  type RemoteUserConfiguration,
  type SyncedCollections,
} from 'potber-client/services/settings-sync';
import {
  AvatarStyle,
  FontSize,
  Gestures,
  LandingPage,
  SidebarLayout,
  Theme,
  Transitions,
  type Settings,
} from 'potber-client/services/settings';
import { setupTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

const settings: Settings = {
  avatarStyle: AvatarStyle.small,
  theme: Theme['tokyo-night'],
  landingPage: LandingPage.pot,
  autoRefreshSidebar: false,
  sidebarLayout: SidebarLayout.rightBottom,
  fontSize: FontSize.large,
  collapseQuotes: true,
  replaceForumUrls: false,
  darkenReadPosts: true,
  hideGlobalAndAnnouncementThreads: true,
  goToBottomOfThreadPage: false,
  transitions: Transitions.dynamic,
  gestures: Gestures.all,
  debug: true,
  appsignalErrorReporting: false,
};

const collections: SyncedCollections = {
  blockedUsers: [{ id: '12', name: 'Alice' }],
  boardFavoriteIds: ['14', '99'],
  savedPosts: [{ id: '1234', threadId: '5678' }],
};

class SettingsSyncStub extends SettingsSyncService {
  remoteValue: RemoteUserConfiguration | null = null;
  persistedKey?: CryptoKey;
  conflictNextWrite = false;
  writes: Array<{
    version: number;
    iv: string;
    ciphertext: string;
    expectedRevision?: number;
  }> = [];

  protected override async fetchRemote() {
    return this.remoteValue;
  }

  protected override async writeRemote(value: {
    version: number;
    iv: string;
    ciphertext: string;
    expectedRevision?: number;
  }) {
    if (this.conflictNextWrite) {
      this.conflictNextWrite = false;
      throw new SettingsSyncRequestError(409, 'Conflict');
    }
    this.writes.push(value);
    this.remoteValue = {
      version: value.version,
      iv: value.iv,
      ciphertext: value.ciphertext,
      revision: (value.expectedRevision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    return this.remoteValue;
  }

  protected override async deleteRemote() {
    this.remoteValue = null;
  }

  protected override async loadKey() {
    return this.persistedKey;
  }

  protected override async storeKey(key: CryptoKey) {
    this.persistedKey = key;
  }

  protected override async removeKey() {
    this.persistedKey = undefined;
  }
}

module('Unit | Service | SettingsSync', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:settings-sync', SettingsSyncStub);
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('potber-settingsSync')) localStorage.removeItem(key);
    }
  });

  hooks.afterEach(function () {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('potber-settingsSync')) localStorage.removeItem(key);
    }
  });

  test('creates an opaque remote payload and a recovery key', async function (assert) {
    const service = this.owner.lookup(
      'service:settings-sync',
    ) as SettingsSyncStub;
    await service.initialize(settings, {
      userId: '123',
      accessToken: 'token',
    });

    const recoveryKey = await service.enable(settings);

    assert.true(recoveryKey.startsWith('potber-sync-v1-'));
    assert.strictEqual(service.state, 'enabled');
    assert.strictEqual(service.writes.length, 1);
    assert.notOk(
      service.writes[0]!.ciphertext.includes('tokyo-night'),
      'ciphertext does not contain a recognizable setting',
    );
    assert.ok(service.persistedKey, 'a non-extractable key is remembered');
    assert.false(service.persistedKey!.extractable);
  });

  test('unlocks the same settings on a new device using only the recovery key', async function (assert) {
    const service = this.owner.lookup(
      'service:settings-sync',
    ) as SettingsSyncStub;
    await service.initialize(settings, {
      userId: '123',
      accessToken: 'token',
    });
    const recoveryKey = await service.enable(settings);
    await service.forgetThisDevice();
    assert.strictEqual(service.state, 'locked');

    const defaults = { ...settings, theme: Theme.default, debug: false };
    const recovered = await service.unlock(recoveryKey, defaults);

    assert.deepEqual(recovered, settings);
    assert.strictEqual(service.state, 'enabled');
  });

  test('encrypts and restores blocklist, board favorites and saved posts', async function (assert) {
    const service = this.owner.lookup(
      'service:settings-sync',
    ) as SettingsSyncStub;
    await service.initialize(
      settings,
      { userId: '123', accessToken: 'token' },
      undefined,
      collections,
    );
    const recoveryKey = await service.enable(settings);

    assert.notOk(
      service.writes[0]!.ciphertext.includes('Alice'),
      'collection data is encrypted',
    );

    await service.forgetThisDevice();
    let restoredCollections: SyncedCollections | undefined;
    await service.initialize(
      settings,
      { userId: '123', accessToken: 'token' },
      undefined,
      { blockedUsers: [], boardFavoriteIds: [], savedPosts: [] },
      (value) => {
        restoredCollections = value;
      },
    );
    await service.unlock(recoveryKey, settings);

    assert.deepEqual(restoredCollections, collections);
  });

  test('rejects an incorrect recovery key', async function (assert) {
    const service = this.owner.lookup(
      'service:settings-sync',
    ) as SettingsSyncStub;
    await service.initialize(settings, {
      userId: '123',
      accessToken: 'token',
    });
    const recoveryKey = await service.enable(settings);
    await service.forgetThisDevice();
    const keyOffset = 'potber-sync-v1-'.length;
    const firstKeyCharacter = recoveryKey[keyOffset] === 'A' ? 'B' : 'A';
    const incorrectKey = `${recoveryKey.slice(0, keyOffset)}${firstKeyCharacter}${recoveryKey.slice(keyOffset + 1)}`;

    await assert.rejects(service.unlock(incorrectKey, settings));
    assert.strictEqual(service.state, 'locked');
    assert.notOk(service.persistedKey, 'the incorrect key is not persisted');
  });

  test('preserves the device key when the remote payload cannot be decrypted', async function (assert) {
    const service = this.owner.lookup(
      'service:settings-sync',
    ) as SettingsSyncStub;
    await service.initialize(settings, {
      userId: '123',
      accessToken: 'token',
    });
    await service.enable(settings);
    const persistedKey = service.persistedKey;
    service.remoteValue = {
      ...service.remoteValue!,
      ciphertext: 'bm90LXZhbGlkLWFlcy1nY20=',
    };

    await service.initialize(settings, {
      userId: '123',
      accessToken: 'token',
    });

    assert.strictEqual(service.state, 'locked');
    assert.strictEqual(
      service.persistedKey,
      persistedKey,
      'a transient or corrupted remote payload does not erase the local key',
    );
    assert.ok(service.lastError, 'the failure remains visible for diagnosis');
  });

  test('deleting sync removes the remote payload and local key', async function (assert) {
    const service = this.owner.lookup(
      'service:settings-sync',
    ) as SettingsSyncStub;
    await service.initialize(settings, {
      userId: '123',
      accessToken: 'token',
    });
    await service.enable(settings);

    await service.deleteSyncedConfiguration();

    assert.strictEqual(service.state, 'disabled');
    assert.strictEqual(service.remoteValue, null);
    assert.notOk(service.persistedKey);
  });

  test('merges and retries after a concurrent update', async function (assert) {
    const service = this.owner.lookup(
      'service:settings-sync',
    ) as SettingsSyncStub;
    await service.initialize(settings, {
      userId: '123',
      accessToken: 'token',
    });
    await service.enable(settings);

    const changedSettings = { ...settings, theme: Theme.default };
    service.settingChanged('theme', changedSettings);
    service.conflictNextWrite = true;
    await service.syncNow();

    assert.strictEqual(service.state, 'enabled');
    assert.strictEqual(service.lastError, null);
    assert.strictEqual(
      service.writes.length,
      2,
      'the merged payload is retried',
    );
    assert.strictEqual(service.writes[1]!.expectedRevision, 1);
  });
});
