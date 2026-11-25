import {
  createInitialMetadata,
  metadataFromPayload,
} from 'potber-client/utils/settings-sync-clocks';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import type { PersistedSavedPost } from 'potber-client/models/post';
import {
  createRecoveryKey,
  importRecoveryKey,
} from 'potber-client/utils/settings-sync-crypto';
import {
  openSettingsPayload,
  sealSettingsPayload,
} from 'potber-client/utils/settings-sync-envelope';
import {
  deleteDeviceKey,
  readDeviceKey,
  writeDeviceKey,
} from 'potber-client/utils/settings-sync-key-storage';
import {
  deleteRemoteSettings,
  fetchRemoteSettings,
  isRevisionConflict,
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
  createLocalFieldClock,
  recordLocalFieldChange,
  readSyncMetadata,
  writeSyncMetadata,
} from 'potber-client/utils/settings-sync-metadata-storage';
import {
  valuesFromPayload,
  type EncryptedSettingsPayload,
} from 'potber-client/utils/settings-sync-payload';
import {
  BLOCKED_USERS_FIELD,
  BOARD_FAVORITES_FIELD,
  SAVED_POSTS_FIELD,
  cloneCollections,
  collectionsFromValues,
  collectionsToValues,
  emptyCollections,
  type SyncedCollections,
} from 'potber-client/utils/settings-sync-collections';
import {
  mergeUnlockValues,
  syncedValuesDiffer,
  type SettingsSyncUnlockSource,
} from 'potber-client/utils/settings-sync-recovery-merge';
import {
  preferenceFieldKey,
  preferencesFromSyncValues,
  preferencesToSyncValues,
} from 'potber-client/utils/settings-sync-preferences';
import { overwriteRecoveredSettings } from 'potber-client/utils/settings-sync-recovery-overwrite';
import type { Settings } from './settings/types';
import type { BlockedUser } from 'potber-client/models/blocked-user';

export {
  SettingsSyncRequestError,
  type RemoteUserConfiguration,
} from 'potber-client/utils/settings-sync-transport';

export type { SettingsSyncUnlockSource } from 'potber-client/utils/settings-sync-recovery-merge';
export type { SyncedCollections } from 'potber-client/utils/settings-sync-collections';

const SYNC_DEBOUNCE_MS = 750;

export type SettingsSyncState =
  'busy' | 'disabled' | 'locked' | 'enabled' | 'unavailable';

interface DecryptedRemote {
  key: CryptoKey;
  payload: EncryptedSettingsPayload;
  remote: RemoteUserConfiguration;
  values: Record<string, unknown>;
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
      const metadata = createInitialMetadata(values, createLocalFieldClock);
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
      let metadata = metadataFromPayload(values, decrypted.payload);

      if (syncedValuesDiffer(decrypted.values, values)) {
        const overwritten = await overwriteRecoveredSettings(
          values,
          decrypted,
          {
            fetchRemote: () => this.fetchRemote(),
            decrypt: this.decryptPayload,
            encrypt: this.encrypt,
            write: (encrypted, revision) =>
              this.writeRevision(encrypted, revision),
          },
        );
        metadata = overwritten.metadata;
        decrypted.remote = overwritten.remote;
      }

      const settings = preferencesFromSyncValues(values, this.currentSettings);
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
    this.valueChanged(preferenceFieldKey(key));
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
    recordLocalFieldChange(this.requireUserId(), key);
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
      await this.uploadWithConflictRetry(values, this.key);
    } catch (error) {
      this.lastError = errorMessage(error);
      this.pendingValues = values;
    }
  }

  private async uploadWithConflictRetry(
    values: Record<string, unknown>,
    key: CryptoKey,
  ) {
    try {
      const metadata =
        readSyncMetadata(this.userId) ??
        createInitialMetadata(values, createLocalFieldClock);
      writeSyncMetadata(this.requireUserId(), metadata);
      const encrypted = await this.encrypt(values, key, metadata);
      this.remote = await this.writeRevision(encrypted, this.remote?.revision);
    } catch (error) {
      if (!isRevisionConflict(error)) throw error;
      await this.resolveConflict(values);
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

  private writeRevision(
    encrypted: WriteUserConfiguration,
    expectedRevision: WriteUserConfiguration['expectedRevision'],
  ): Promise<RemoteUserConfiguration> {
    return this.writeRemote({ ...encrypted, expectedRevision });
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
      createLocalFieldClock,
    );
    writeSyncMetadata(this.requireUserId(), merged.metadata);
    return merged;
  }

  private decryptPayload = (remote: RemoteUserConfiguration, key: CryptoKey) =>
    openSettingsPayload(remote, key, this.requireUserId());

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

  private encrypt = (
    values: Record<string, unknown>,
    key: CryptoKey,
    metadata: SettingsSyncMetadata,
  ) =>
    sealSettingsPayload(
      values,
      metadata,
      createLocalFieldClock,
      key,
      this.requireUserId(),
    );

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
      createInitialMetadata(merged.values, createLocalFieldClock);
    const encrypted = await this.encrypt(merged.values, this.key!, metadata);
    this.remote = await this.writeRevision(encrypted, remote.revision);
  }

  private get currentValues(): Record<string, unknown> {
    return {
      ...preferencesToSyncValues(this.currentSettings),
      ...collectionsToValues(this.collections),
    };
  }

  private settingsFromValues(values: Record<string, unknown>): Settings {
    this.currentSettings = preferencesFromSyncValues(
      values,
      this.currentSettings,
    );
    return this.currentSettings;
  }

  private validateValues(values: Record<string, unknown>) {
    preferencesFromSyncValues(values, this.currentSettings);
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

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message || error.name;
  return String(error);
}
