import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import type { PersistedSavedPost } from 'potber-client/components/features/bookmarks/saved-posts/post';
import {
  createRecoveryKey,
  decryptSettings,
  encryptSettings,
  importRecoveryKey,
} from 'potber-client/utils/settings-sync-crypto';
import {
  deleteDeviceKey,
  readDeviceKey,
  writeDeviceKey,
} from 'potber-client/utils/settings-sync-key-storage';
import {
  deleteRemoteSettings,
  fetchRemoteSettings,
  SettingsSyncRequestError,
  writeRemoteSettings,
  type RemoteUserConfiguration,
  type WriteUserConfiguration,
} from 'potber-client/utils/settings-sync-transport';
import {
  mergeSettings,
  type MergeResult,
  type SettingsSyncMetadata,
} from 'potber-client/utils/settings-sync-merge';
import {
  clearSyncMetadata,
  getOrCreateDeviceId,
  readSyncMetadata,
  writeSyncMetadata,
} from 'potber-client/utils/settings-sync-metadata-storage';
import {
  parseSettingsPayload,
  serializeSettingsPayload,
  valuesFromPayload,
  type EncryptedSettingsPayload,
  type FieldClock,
  type SyncedField,
} from 'potber-client/utils/settings-sync-payload';
import {
  BLOCKED_USERS_FIELD,
  BOARD_FAVORITES_FIELD,
  collectionsFromValues,
  mergeUnlockValues,
  SAVED_POSTS_FIELD,
  syncedValuesDiffer,
  type SettingsSyncUnlockSource,
  type SyncedCollections,
} from 'potber-client/utils/settings-sync-recovery-merge';
import type { Settings } from './settings';
import type { BlockedUser } from './socials';

export {
  SettingsSyncRequestError,
  type RemoteUserConfiguration,
} from 'potber-client/utils/settings-sync-transport';

export type {
  SettingsSyncUnlockSource,
  SyncedCollections,
} from 'potber-client/utils/settings-sync-recovery-merge';

const SYNC_DEBOUNCE_MS = 750;
const SETTINGS_FIELD_PREFIX = 'settings.';

export type SettingsSyncState =
  'busy' | 'disabled' | 'locked' | 'enabled' | 'unavailable';

interface DecryptedRemote {
  key: CryptoKey;
  payload: EncryptedSettingsPayload;
  remote: RemoteUserConfiguration;
  values: Record<string, unknown>;
}

interface OverwriteResult {
  metadata: SettingsSyncMetadata;
  remote: RemoteUserConfiguration;
}

export default class SettingsSyncService extends Service {
  @tracked state: SettingsSyncState = 'busy';
  @tracked lastError: string | null = null;

  private accessToken?: string;
  private userId?: string;
  private key?: CryptoKey;
  private remote?: RemoteUserConfiguration;
  private uploadTimer?: number;
  private currentSettings?: Settings;
  private collections: SyncedCollections = emptyCollections();
  private pendingValues?: Record<string, unknown>;
  private onRemoteSettings?: (settings: Settings) => void;
  private onRemoteCollections?: (collections: SyncedCollections) => void;

  get hasRemoteConfiguration() {
    return Boolean(this.remote);
  }

  async initialize(
    localSettings: Settings,
    authentication: { userId: string; accessToken: string },
    onRemoteSettings?: (settings: Settings) => void,
    localCollections: SyncedCollections = emptyCollections(),
    onRemoteCollections?: (collections: SyncedCollections) => void,
  ): Promise<Settings> {
    this.state = 'busy';
    this.lastError = null;
    this.userId = authentication.userId;
    this.accessToken = authentication.accessToken;
    this.onRemoteSettings = onRemoteSettings;
    this.onRemoteCollections = onRemoteCollections;
    this.currentSettings = { ...localSettings };
    this.collections = cloneCollections(localCollections);

    try {
      const remote = await this.fetchRemote();
      if (!remote) {
        await this.clearLocalSyncState();
        this.remote = undefined;
        this.state = 'disabled';
        return localSettings;
      }

      this.remote = remote;
      this.key = await this.loadKey();
      if (!this.key) {
        this.state = 'locked';
        return localSettings;
      }

      try {
        const merged = await this.decryptAndMerge(
          remote,
          this.key,
          this.currentValues,
        );
        const settings = this.settingsFromValues(merged.values);
        this.applyCollectionsFromValues(merged.values);
        this.state = 'enabled';
        if (merged.shouldUpload) this.scheduleUpload(merged.values);
        return settings;
      } catch (error) {
        this.lastError = errorMessage(error);
        this.state = 'locked';
        return localSettings;
      }
    } catch (error) {
      this.handleRequestError(error);
      return localSettings;
    }
  }

  async enable(localSettings: Settings): Promise<string> {
    this.ensureAuthenticated();
    this.state = 'busy';
    this.lastError = null;

    try {
      const existing = await this.fetchRemote();
      if (existing) {
        this.remote = existing;
        this.state = 'locked';
        throw new Error(
          'Encrypted settings already exist. Unlock them with the recovery key.',
        );
      }

      const { key, recoveryKey } = await createRecoveryKey();
      this.currentSettings = { ...localSettings };
      const values = this.currentValues;
      const metadata = this.createInitialMetadata(values);
      writeSyncMetadata(this.requireUserId(), metadata);
      const encrypted = await this.encrypt(values, key, metadata);
      const remote = await this.writeRemote(encrypted);

      await this.storeKey(key);
      this.key = key;
      this.remote = remote;
      this.state = 'enabled';
      return recoveryKey;
    } catch (error) {
      if (this.state !== 'locked') this.handleRequestError(error);
      throw error;
    }
  }

  async unlockHasDifferences(
    recoveryKey: string,
    localSettings: Settings,
  ): Promise<boolean> {
    this.ensureAuthenticated();
    this.lastError = null;

    try {
      this.currentSettings = { ...localSettings };
      const { values } = await this.decryptForUnlock(recoveryKey);
      return syncedValuesDiffer(this.currentValues, values);
    } catch (error) {
      this.throwUnlockError(error);
    }
  }

  async unlock(
    recoveryKey: string,
    localSettings: Settings,
    source: SettingsSyncUnlockSource,
  ): Promise<Settings> {
    this.ensureAuthenticated();
    this.state = 'busy';
    this.lastError = null;

    try {
      this.currentSettings = { ...localSettings };
      const localValues = this.currentValues;
      const decrypted = await this.decryptForUnlock(recoveryKey);
      const values = mergeUnlockValues(source, localValues, decrypted.values);
      let metadata = this.metadataFromPayload(values, decrypted.payload);

      if (syncedValuesDiffer(decrypted.values, values)) {
        const overwritten = await this.overwriteRemote(values, decrypted);
        metadata = overwritten.metadata;
        decrypted.remote = overwritten.remote;
      }

      const settings = this.settingsForValues(values);
      const collections = collectionsFromValues(values);
      await this.storeKey(decrypted.key);
      writeSyncMetadata(this.requireUserId(), metadata);
      this.key = decrypted.key;
      this.remote = decrypted.remote;
      this.currentSettings = settings;
      this.collections = cloneCollections(collections);
      this.state = 'enabled';
      this.onRemoteSettings?.(settings);
      this.onRemoteCollections?.(cloneCollections(collections));
      return settings;
    } catch (error) {
      this.throwUnlockError(error);
    }
  }

  settingChanged(key: keyof Settings, settings: Settings) {
    this.currentSettings = { ...settings };
    if (this.state === 'disabled' || !this.userId) return;
    this.valueChanged(`${SETTINGS_FIELD_PREFIX}${key}`);
  }

  blockedUsersChanged(blockedUsers: BlockedUser[]) {
    this.collections = { ...this.collections, blockedUsers: [...blockedUsers] };
    if (!this.userId) return;
    this.valueChanged(BLOCKED_USERS_FIELD);
  }

  boardFavoritesChanged(boardFavoriteIds: string[]) {
    this.collections = {
      ...this.collections,
      boardFavoriteIds: [...boardFavoriteIds],
    };
    if (!this.userId) return;
    this.valueChanged(BOARD_FAVORITES_FIELD);
  }

  savedPostsChanged(savedPosts: PersistedSavedPost[]) {
    this.collections = { ...this.collections, savedPosts: [...savedPosts] };
    if (!this.userId) return;
    this.valueChanged(SAVED_POSTS_FIELD);
  }

  private valueChanged(key: string) {
    if (this.state === 'disabled' || this.state === 'locked') return;
    const metadata = readSyncMetadata(this.userId) ?? { fields: {} };
    metadata.fields[key] = {
      modifiedAt: this.nextModifiedAt(metadata),
      deviceId: getOrCreateDeviceId(),
    };
    writeSyncMetadata(this.requireUserId(), metadata);
    const values = this.currentValues;
    this.pendingValues = values;
    if (this.state === 'enabled' && this.key) this.scheduleUpload(values);
  }

  scheduleUpload(values: Record<string, unknown>) {
    if (this.state !== 'enabled' || !this.key) return;
    this.pendingValues = { ...values };
    if (this.uploadTimer) window.clearTimeout(this.uploadTimer);
    this.uploadTimer = window.setTimeout(() => {
      this.uploadTimer = undefined;
      void this.syncNow();
    }, SYNC_DEBOUNCE_MS);
  }

  async syncNow(values = this.pendingValues): Promise<void> {
    if (!values || this.state !== 'enabled' || !this.key) return;
    if (this.uploadTimer) {
      window.clearTimeout(this.uploadTimer);
      this.uploadTimer = undefined;
    }
    this.pendingValues = undefined;
    this.lastError = null;

    try {
      const metadata =
        readSyncMetadata(this.userId) ?? this.createInitialMetadata(values);
      writeSyncMetadata(this.requireUserId(), metadata);
      const encrypted = await this.encrypt(values, this.key, metadata);
      this.remote = await this.writeRemote({
        ...encrypted,
        expectedRevision: this.remote?.revision,
      });
    } catch (error) {
      if (error instanceof SettingsSyncRequestError && error.status === 409) {
        try {
          await this.resolveConflict(values);
        } catch (conflictError) {
          this.lastError = errorMessage(conflictError);
          this.pendingValues = values;
        }
        return;
      }
      this.lastError = errorMessage(error);
      this.pendingValues = values;
    }
  }

  async forgetThisDevice() {
    await this.clearLocalSyncState();
    this.key = undefined;
    this.state = this.remote ? 'locked' : 'disabled';
  }

  async deleteSyncedConfiguration() {
    this.ensureAuthenticated();
    await this.deleteRemote();
    await this.clearLocalSyncState();
    this.key = undefined;
    this.remote = undefined;
    this.state = 'disabled';
    this.lastError = null;
  }

  protected async fetchRemote(): Promise<RemoteUserConfiguration | null> {
    return fetchRemoteSettings(this.ensureAuthenticated());
  }

  protected async writeRemote(
    value: WriteUserConfiguration,
  ): Promise<RemoteUserConfiguration> {
    return writeRemoteSettings(this.ensureAuthenticated(), value);
  }

  protected async deleteRemote(): Promise<void> {
    await deleteRemoteSettings(this.ensureAuthenticated());
  }

  protected async loadKey(): Promise<CryptoKey | undefined> {
    return readDeviceKey(this.requireUserId());
  }

  protected async storeKey(key: CryptoKey): Promise<void> {
    await writeDeviceKey(this.requireUserId(), key);
  }

  protected async removeKey(): Promise<void> {
    if (this.userId) await deleteDeviceKey(this.userId);
  }

  private async decryptAndMerge(
    remote: RemoteUserConfiguration,
    key: CryptoKey,
    localValues: Record<string, unknown>,
  ): Promise<MergeResult> {
    const payload = await this.decryptPayload(remote, key);
    const merged = mergeSettings(
      localValues,
      payload,
      readSyncMetadata(this.userId),
      (metadata) => ({
        modifiedAt: this.nextModifiedAt(metadata),
        deviceId: getOrCreateDeviceId(),
      }),
    );
    writeSyncMetadata(this.requireUserId(), merged.metadata);
    return merged;
  }

  private async decryptPayload(
    remote: RemoteUserConfiguration,
    key: CryptoKey,
  ): Promise<EncryptedSettingsPayload> {
    const plaintext = await decryptSettings(remote, key, this.requireUserId());
    return parseSettingsPayload(plaintext);
  }

  private async decryptForUnlock(
    recoveryKey: string,
  ): Promise<DecryptedRemote> {
    const key = await importRecoveryKey(recoveryKey);
    const remote = this.remote ?? (await this.fetchRemote());
    if (!remote) {
      throw new Error('No encrypted settings exist for this account.');
    }
    this.remote = remote;
    const payload = await this.decryptPayload(remote, key);
    const values = valuesFromPayload(payload);
    this.validateValues(values);
    return { key, payload, remote, values };
  }

  private async overwriteRemote(
    values: Record<string, unknown>,
    decrypted: DecryptedRemote,
  ): Promise<OverwriteResult> {
    let remote = decrypted.remote;
    let payload = decrypted.payload;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const metadata = this.createOverwriteMetadata(values, payload);
      const encrypted = await this.encrypt(values, decrypted.key, metadata);
      try {
        const written = await this.writeRemote({
          ...encrypted,
          expectedRevision: remote.revision,
        });
        return { metadata, remote: written };
      } catch (error) {
        if (
          attempt !== 0 ||
          !(error instanceof SettingsSyncRequestError) ||
          error.status !== 409
        ) {
          throw error;
        }

        const latest = await this.fetchRemote();
        if (!latest) {
          throw new Error('No encrypted settings exist for this account.', {
            cause: error,
          });
        }
        remote = latest;
        payload = await this.decryptPayload(latest, decrypted.key);
      }
    }

    throw new Error('Unable to overwrite encrypted settings.');
  }

  private async encrypt(
    values: Record<string, unknown>,
    key: CryptoKey,
    metadata: SettingsSyncMetadata,
  ): Promise<WriteUserConfiguration> {
    const fields: Record<string, SyncedField> = {};
    for (const [fieldKey, value] of Object.entries(values)) {
      fields[fieldKey] = {
        value,
        clock:
          metadata.fields[fieldKey] ??
          ({
            modifiedAt: this.nextModifiedAt(metadata),
            deviceId: getOrCreateDeviceId(),
          } satisfies FieldClock),
      };
    }
    return encryptSettings(
      serializeSettingsPayload(fields),
      key,
      this.requireUserId(),
    );
  }

  private async resolveConflict(localValues: Record<string, unknown>) {
    const remote = await this.fetchRemote();
    if (!remote) {
      await this.clearLocalSyncState();
      this.key = undefined;
      this.remote = undefined;
      this.state = 'disabled';
      return;
    }
    const merged = await this.decryptAndMerge(remote, this.key!, localValues);
    this.remote = remote;
    const settings = this.settingsFromValues(merged.values);
    this.onRemoteSettings?.(settings);
    this.applyCollectionsFromValues(merged.values);
    const metadata =
      readSyncMetadata(this.userId) ??
      this.createInitialMetadata(merged.values);
    const encrypted = await this.encrypt(merged.values, this.key!, metadata);
    this.remote = await this.writeRemote({
      ...encrypted,
      expectedRevision: remote.revision,
    });
  }

  private createInitialMetadata(
    values: Record<string, unknown>,
  ): SettingsSyncMetadata {
    const metadata: SettingsSyncMetadata = { fields: {} };
    for (const key of Object.keys(values)) {
      metadata.fields[key] = {
        modifiedAt: this.nextModifiedAt(metadata),
        deviceId: getOrCreateDeviceId(),
      };
    }
    return metadata;
  }

  private createOverwriteMetadata(
    values: Record<string, unknown>,
    remote: EncryptedSettingsPayload,
  ): SettingsSyncMetadata {
    const latestRemoteClock = Object.values(remote.fields).reduce(
      (latest, field) => Math.max(latest, field.clock.modifiedAt),
      0,
    );
    const firstModifiedAt = Math.max(Date.now(), latestRemoteClock + 1);
    const metadata: SettingsSyncMetadata = { fields: {} };

    Object.keys(values).forEach((fieldKey, index) => {
      metadata.fields[fieldKey] = {
        modifiedAt: firstModifiedAt + index,
        deviceId: getOrCreateDeviceId(),
      };
    });
    return metadata;
  }

  private metadataFromPayload(
    values: Record<string, unknown>,
    payload: EncryptedSettingsPayload,
  ): SettingsSyncMetadata {
    const metadata: SettingsSyncMetadata = { fields: {} };
    for (const fieldKey of Object.keys(values)) {
      const remoteField = payload.fields[fieldKey];
      if (!remoteField) {
        throw new Error(`Missing encrypted configuration field: ${fieldKey}`);
      }
      metadata.fields[fieldKey] = remoteField.clock;
    }
    return metadata;
  }

  private get currentValues(): Record<string, unknown> {
    const settings = Object.fromEntries(
      Object.entries(this.currentSettings ?? {}).map(([key, value]) => [
        `${SETTINGS_FIELD_PREFIX}${key}`,
        value,
      ]),
    );
    return {
      ...settings,
      [BLOCKED_USERS_FIELD]: this.collections.blockedUsers,
      [BOARD_FAVORITES_FIELD]: this.collections.boardFavoriteIds,
      [SAVED_POSTS_FIELD]: this.collections.savedPosts,
    };
  }

  private settingsForValues(values: Record<string, unknown>): Settings {
    const settings = { ...this.currentSettings } as Record<string, unknown>;
    for (const key of Object.keys(settings)) {
      const fieldKey = `${SETTINGS_FIELD_PREFIX}${key}`;
      if (!(fieldKey in values)) {
        throw new Error(`Missing encrypted configuration field: ${fieldKey}`);
      }
      settings[key] = values[fieldKey];
    }
    return settings as unknown as Settings;
  }

  private settingsFromValues(values: Record<string, unknown>): Settings {
    this.currentSettings = this.settingsForValues(values);
    return this.currentSettings;
  }

  private validateValues(values: Record<string, unknown>) {
    this.settingsForValues(values);
    collectionsFromValues(values);
  }

  private applyCollectionsFromValues(values: Record<string, unknown>) {
    const collections = collectionsFromValues(values);
    this.collections = cloneCollections(collections);
    this.onRemoteCollections?.(cloneCollections(collections));
  }

  private async clearLocalSyncState() {
    await this.removeKey();
    if (this.userId) {
      clearSyncMetadata(this.userId);
    }
  }

  private nextModifiedAt(metadata: SettingsSyncMetadata) {
    const latest = Object.values(metadata.fields).reduce(
      (maximum, clock) => Math.max(maximum, clock.modifiedAt),
      0,
    );
    return Math.max(Date.now(), latest + 1);
  }

  private ensureAuthenticated() {
    if (!this.accessToken || !this.userId) {
      throw new Error('Encrypted settings sync requires authentication.');
    }
    return this.accessToken;
  }

  private requireUserId() {
    if (!this.userId) throw new Error('No authenticated user is available.');
    return this.userId;
  }

  private handleRequestError(error: unknown) {
    this.lastError = errorMessage(error);
    this.state = 'unavailable';
  }

  private throwUnlockError(error: unknown): never {
    this.state = this.remote ? 'locked' : 'disabled';
    throw new Error('Der Wiederherstellungsschlüssel ist ungültig.', {
      cause: error,
    });
  }
}

function emptyCollections(): SyncedCollections {
  return { blockedUsers: [], boardFavoriteIds: [], savedPosts: [] };
}

function cloneCollections(collections: SyncedCollections): SyncedCollections {
  return {
    blockedUsers: collections.blockedUsers.map((user) => ({ ...user })),
    boardFavoriteIds: [...collections.boardFavoriteIds],
    savedPosts: collections.savedPosts.map((post) => ({ ...post })),
  };
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message || error.name;
  return String(error);
}
