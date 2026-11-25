import type LocalStorageService from 'potber-client/services/local-storage';
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
};

const collections: SyncedCollections = {
  blockedUsers: [{ id: '12', name: 'Alice' }],
  boardFavoriteIds: ['14', '99'],
  savedPosts: [{ id: '1234', threadId: '5678' }],
};

class SettingsSyncStub extends SettingsSyncService {
  remoteValue: RemoteUserConfiguration | null = null;
  persistedKey?: CryptoKey;
  conflictsRemaining = 0;
  writeError?: Error;
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
    if (this.writeError) throw this.writeError;
    if (this.conflictsRemaining > 0) {
      this.conflictsRemaining -= 1;
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
    assert.true(
      await service.unlockHasDifferences(recoveryKey, defaults),
      'the service detects that a choice is required',
    );
    const recovered = await service.unlock(recoveryKey, defaults, 'remote');

    assert.deepEqual(recovered, settings);
    assert.strictEqual(service.state, 'enabled');
  });

  test('restores existing v1 settings with a saved recovery key and remembers the device', async function (assert) {
    const recoveryKey =
      'potber-sync-v1--_v7-_v7-_v7-_v7-_v7-_v7-_v7-_v7-_v7-_v7-_s';
    const authentication = { userId: '123', accessToken: 'token' };
    const defaults = { ...settings, theme: Theme.default, debug: false };
    const service = this.owner.lookup(
      'service:settings-sync',
    ) as SettingsSyncStub;
    const key = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(32).fill(251),
      'AES-GCM',
      false,
      ['encrypt'],
    );
    const iv = new Uint8Array(12).fill(7);
    const clock = { modifiedAt: 1, deviceId: 'legacy-device' };
    const values = {
      ...Object.fromEntries(
        Object.entries(settings).map(([key, value]) => [
          `settings.${key}`,
          value,
        ]),
      ),
      ...collections,
    };
    const fields = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, { value, clock }]),
    );
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData: new TextEncoder().encode(
          'potber-user-configuration:v1:123',
        ),
      },
      key,
      new TextEncoder().encode(JSON.stringify({ schemaVersion: 1, fields })),
    );
    service.remoteValue = {
      version: 1,
      iv: 'BwcHBwcHBwcHBwcH',
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
      revision: 4,
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    let restoredCollections: SyncedCollections | undefined;
    await service.initialize(
      defaults,
      authentication,
      undefined,
      undefined,
      (values) => {
        restoredCollections = values;
      },
    );
    assert.strictEqual(service.state, 'locked');

    assert.deepEqual(
      await service.unlock(` ${recoveryKey}\n`, defaults, 'remote'),
      settings,
    );
    assert.deepEqual(restoredCollections, collections);
    assert.deepEqual(
      await service.initialize(defaults, authentication),
      settings,
    );
    assert.strictEqual(service.state, 'enabled');
    assert.false(service.persistedKey?.extractable);
    assert.strictEqual(
      service.writes.length,
      0,
      'recovery leaves the existing payload intact',
    );
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
    await service.unlock(recoveryKey, settings, 'remote');

    assert.deepEqual(restoredCollections, collections);
  });

  test('syncs saved-post edits and restores the persisted references', async function (assert) {
    const sync = this.owner.lookup('service:settings-sync') as SettingsSyncStub;
    const storage = this.owner.lookup(
      'service:local-storage',
    ) as LocalStorageService;
    const authentication = { userId: '123', accessToken: 'token' };
    const storageKey = 'potber-savedPosts';
    const previousPosts = localStorage.getItem(storageKey);
    const removedPost = { id: '101', threadId: '42' };
    const keptPost = { id: '102', threadId: '43' };

    localStorage.setItem(storageKey, JSON.stringify([removedPost]));
    try {
      await sync.initialize(settings, authentication, undefined, {
        ...collections,
        savedPosts: storage.readPersistedSavedPosts(),
      });
      const recoveryKey = await sync.enable(settings);

      assert.true(storage.addSavedPost(keptPost));
      assert.deepEqual(storage.readPersistedSavedPosts(), [
        removedPost,
        keptPost,
      ]);
      storage.removeSavedPost(removedPost.id);
      await sync.syncNow();
      assert.strictEqual(sync.writes.length, 2);

      await sync.forgetThisDevice();
      localStorage.removeItem(storageKey);
      await sync.initialize(
        settings,
        authentication,
        undefined,
        { ...collections, savedPosts: [] },
        (value) => storage.applySyncedSavedPosts(value.savedPosts),
      );
      await sync.unlock(recoveryKey, settings, 'remote');

      assert.deepEqual(storage.readPersistedSavedPosts(), [keptPost]);
      await sync.syncNow();
      assert.strictEqual(
        sync.writes.length,
        2,
        'remote apply does not queue a write',
      );
    } finally {
      if (previousPosts === null) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, previousPosts);
    }
  });

  test('does not change either copy before the user chooses an unlock source', async function (assert) {
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
    await service.forgetThisDevice();

    const localSettings = { ...settings, theme: Theme.default, debug: false };
    const localCollections: SyncedCollections = {
      blockedUsers: [
        { id: '12', name: 'Local Alice' },
        { id: '34', name: 'Bob' },
      ],
      boardFavoriteIds: ['777'],
      savedPosts: [
        { id: '1234', threadId: 'local-thread' },
        { id: '4321', threadId: '8765' },
      ],
    };
    let restoredCollections: SyncedCollections | undefined;
    await service.initialize(
      localSettings,
      { userId: '123', accessToken: 'token' },
      undefined,
      localCollections,
      (value) => {
        restoredCollections = value;
      },
    );
    service.settingChanged('theme', localSettings);

    const hasDifferences = await service.unlockHasDifferences(
      recoveryKey,
      localSettings,
    );

    assert.true(hasDifferences);
    assert.strictEqual(service.state, 'locked');
    assert.notOk(service.persistedKey, 'the key is not stored yet');
    assert.strictEqual(service.writes.length, 1, 'the server is unchanged');
    assert.strictEqual(
      restoredCollections,
      undefined,
      'local data is unchanged',
    );
    assert.strictEqual(
      localStorage.getItem('potber-settingsSyncMetadata-123'),
      null,
      'locked local changes do not receive sync clocks',
    );

    const recovered = await service.unlock(
      recoveryKey,
      localSettings,
      'remote',
    );

    assert.deepEqual(recovered, settings, 'the remote settings are applied');
    assert.deepEqual(restoredCollections, {
      blockedUsers: [
        { id: '12', name: 'Alice' },
        { id: '34', name: 'Bob' },
      ],
      boardFavoriteIds: [...collections.boardFavoriteIds, '777'],
      savedPosts: [
        { id: '1234', threadId: '5678' },
        { id: '4321', threadId: '8765' },
      ],
    });
    assert.strictEqual(
      service.writes.length,
      2,
      'merged collections are written back',
    );
  });

  test('uses local settings while merging remote collections', async function (assert) {
    const service = this.owner.lookup(
      'service:settings-sync',
    ) as SettingsSyncStub;
    const remoteCollections: SyncedCollections = {
      blockedUsers: [
        { id: '12', name: 'Alice' },
        { id: '56', name: 'Carol' },
      ],
      boardFavoriteIds: collections.boardFavoriteIds,
      savedPosts: [
        { id: '1234', threadId: '5678' },
        { id: '9999', threadId: '999' },
      ],
    };
    await service.initialize(
      settings,
      { userId: '123', accessToken: 'token' },
      undefined,
      remoteCollections,
    );
    const recoveryKey = await service.enable(settings);
    await service.forgetThisDevice();

    const localSettings = { ...settings, theme: Theme.default, debug: false };
    const localCollections: SyncedCollections = {
      blockedUsers: [
        { id: '12', name: 'Local Alice' },
        { id: '34', name: 'Bob' },
      ],
      boardFavoriteIds: ['777'],
      savedPosts: [
        { id: '1234', threadId: 'local-thread' },
        { id: '4321', threadId: '8765' },
      ],
    };
    let appliedCollections: SyncedCollections | undefined;
    await service.initialize(
      localSettings,
      { userId: '123', accessToken: 'token' },
      undefined,
      localCollections,
      (value) => {
        appliedCollections = value;
      },
    );

    assert.true(await service.unlockHasDifferences(recoveryKey, localSettings));
    const recovered = await service.unlock(recoveryKey, localSettings, 'local');

    assert.deepEqual(recovered, localSettings);
    assert.strictEqual(service.state, 'enabled');
    assert.strictEqual(service.writes.length, 2);
    assert.strictEqual(service.writes[1]!.expectedRevision, 1);
    assert.deepEqual(appliedCollections, {
      blockedUsers: [
        { id: '12', name: 'Local Alice' },
        { id: '34', name: 'Bob' },
        { id: '56', name: 'Carol' },
      ],
      boardFavoriteIds: [
        ...localCollections.boardFavoriteIds,
        ...remoteCollections.boardFavoriteIds,
      ],
      savedPosts: [
        { id: '1234', threadId: 'local-thread' },
        { id: '4321', threadId: '8765' },
        { id: '9999', threadId: '999' },
      ],
    });

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
    const restoredSettings = await service.unlock(
      recoveryKey,
      settings,
      'remote',
    );

    assert.deepEqual(restoredSettings, localSettings);
    assert.deepEqual(restoredCollections, {
      blockedUsers: [
        { id: '12', name: 'Local Alice' },
        { id: '34', name: 'Bob' },
        { id: '56', name: 'Carol' },
      ],
      boardFavoriteIds: [
        ...localCollections.boardFavoriteIds,
        ...remoteCollections.boardFavoriteIds,
      ],
      savedPosts: [
        { id: '1234', threadId: 'local-thread' },
        { id: '4321', threadId: '8765' },
        { id: '9999', threadId: '999' },
      ],
    });
  });

  test('detects when local and remote data are already identical', async function (assert) {
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
    await service.forgetThisDevice();
    await service.initialize(
      settings,
      { userId: '123', accessToken: 'token' },
      undefined,
      collections,
    );

    assert.false(await service.unlockHasDifferences(recoveryKey, settings));
    assert.strictEqual(service.state, 'locked');
    assert.strictEqual(service.writes.length, 1);
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

    await assert.rejects(service.unlock(incorrectKey, settings, 'remote'));
    assert.strictEqual(service.state, 'locked');
    assert.notOk(service.persistedKey, 'the incorrect key is not persisted');
  });

  test('a recovery key cannot decrypt an envelope for a different account', async function (assert) {
    const service = this.owner.lookup(
      'service:settings-sync',
    ) as SettingsSyncStub;
    await service.initialize(settings, { userId: '123', accessToken: 'token' });
    const recoveryKey = await service.enable(settings);
    await service.forgetThisDevice();
    await service.initialize(settings, { userId: '456', accessToken: 'token' });

    await assert.rejects(service.unlock(recoveryKey, settings, 'remote'));
    assert.strictEqual(service.state, 'locked');
    assert.strictEqual(service.persistedKey, undefined);
    assert.strictEqual(
      service.writes.length,
      1,
      'only the original enable wrote a payload',
    );
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

  test('reuses stored device metadata and clears only the current account on forget', async function (assert) {
    const deviceKey = 'potber-settingsSyncDeviceId';
    const metadataKey = 'potber-settingsSyncMetadata-123';
    const otherMetadataKey = 'potber-settingsSyncMetadata-456';
    const deviceId = 'remembered-device';
    const previousClock = Date.UTC(2100, 0, 1);
    localStorage.setItem(deviceKey, deviceId);
    const service = this.owner.lookup(
      'service:settings-sync',
    ) as SettingsSyncStub;
    await service.initialize(settings, { userId: '123', accessToken: 'token' });
    await service.enable(settings);

    const savedMetadata = JSON.stringify({
      fields: { 'settings.theme': { modifiedAt: previousClock, deviceId } },
    });
    localStorage.setItem(metadataKey, savedMetadata);
    localStorage.setItem(otherMetadataKey, savedMetadata);
    service.settingChanged('theme', { ...settings, theme: Theme.default });
    await service.syncNow();

    const updated = JSON.parse(localStorage.getItem(metadataKey) ?? '{}');
    assert.deepEqual(updated.fields?.['settings.theme'], {
      modifiedAt: previousClock + 1,
      deviceId,
    });

    await service.forgetThisDevice();
    assert.strictEqual(localStorage.getItem(metadataKey), null);
    assert.strictEqual(localStorage.getItem(otherMetadataKey), savedMetadata);
    assert.strictEqual(localStorage.getItem(deviceKey), deviceId);
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
    service.conflictsRemaining = 1;
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

  test('recovers with the local settings after an overwrite conflict', async function (assert) {
    const service = this.owner.lookup(
      'service:settings-sync',
    ) as SettingsSyncStub;
    const authentication = { userId: '123', accessToken: 'token' };
    await service.initialize(settings, authentication);
    const key = await service.enable(settings);
    await service.forgetThisDevice();

    const local = { ...settings, theme: Theme.default };
    await service.initialize(local, authentication);
    service.conflictsRemaining = 1;

    assert.deepEqual(await service.unlock(key, local, 'local'), local);
    assert.strictEqual(service.state, 'enabled');
    assert.strictEqual(service.remoteValue?.revision, 2);
    assert.strictEqual(service.writes[1]?.expectedRevision, 1);
  });

  test('keeps the device locked when both recovery overwrite attempts conflict', async function (assert) {
    const service = this.owner.lookup(
      'service:settings-sync',
    ) as SettingsSyncStub;
    const authentication = { userId: '123', accessToken: 'token' };
    await service.initialize(settings, authentication);
    const key = await service.enable(settings);
    await service.forgetThisDevice();

    const local = { ...settings, theme: Theme.default };
    await service.initialize(local, authentication);
    service.conflictsRemaining = 2;

    await assert.rejects(
      service.unlock(key, local, 'local'),
      /Wiederherstellungsschlüssel/,
    );
    assert.strictEqual(service.conflictsRemaining, 0);
    assert.strictEqual(service.state, 'locked');
    assert.strictEqual(service.remoteValue?.revision, 1);
    assert.strictEqual(service.writes.length, 1);
  });

  test('keeps the pending edit after a non-conflict upload failure', async function (assert) {
    const service = this.owner.lookup(
      'service:settings-sync',
    ) as SettingsSyncStub;
    const authentication = { userId: '123', accessToken: 'token' };
    await service.initialize(settings, authentication);
    await service.enable(settings);

    const local = { ...settings, theme: Theme.default };
    service.settingChanged('theme', local);
    service.writeError = new SettingsSyncRequestError(503, 'Unavailable');
    await service.syncNow();

    assert.strictEqual(service.state, 'enabled');
    assert.strictEqual(service.lastError, 'Unavailable');
    assert.strictEqual(service.writes.length, 1);

    service.writeError = undefined;
    await service.syncNow();
    assert.strictEqual(service.lastError, null);
    assert.strictEqual(service.writes[1]?.expectedRevision, 1);
    assert.deepEqual(await service.initialize(settings, authentication), local);
  });

  test('keeps the pending edit when the conflict retry also fails', async function (assert) {
    const service = this.owner.lookup(
      'service:settings-sync',
    ) as SettingsSyncStub;
    const authentication = { userId: '123', accessToken: 'token' };
    await service.initialize(settings, authentication);
    await service.enable(settings);

    const local = { ...settings, theme: Theme.default };
    service.settingChanged('theme', local);
    service.conflictsRemaining = 2;
    await service.syncNow();

    assert.strictEqual(service.lastError, 'Conflict');
    assert.strictEqual(service.writes.length, 1);

    await service.syncNow();
    assert.strictEqual(service.lastError, null);
    assert.strictEqual(service.remoteValue?.revision, 2);
    assert.deepEqual(await service.initialize(settings, authentication), local);
  });
});
