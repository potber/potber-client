import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { appConfig } from 'potber-client/config/app.config';
import type { PersistedSavedPost } from 'potber-client/components/features/bookmarks/saved-posts/post';
import type { Settings } from './settings';
import type { BlockedUser } from './socials';

const ENVELOPE_VERSION = 1;
const RECOVERY_KEY_PREFIX = 'potber-sync-v1-';
const KEY_DATABASE = 'potber-settings-sync';
const KEY_STORE = 'keys';
const METADATA_PREFIX = 'potber-settingsSyncMetadata-';
const DEVICE_ID_KEY = 'potber-settingsSyncDeviceId';
const SYNC_DEBOUNCE_MS = 750;
const SETTINGS_FIELD_PREFIX = 'settings.';
const BLOCKED_USERS_FIELD = 'blockedUsers';
const BOARD_FAVORITES_FIELD = 'boardFavoriteIds';
const SAVED_POSTS_FIELD = 'savedPosts';

export type SettingsSyncState =
  'busy' | 'disabled' | 'locked' | 'enabled' | 'unavailable';

interface FieldClock {
  modifiedAt: number;
  deviceId: string;
}

interface SyncedField {
  value: unknown;
  clock: FieldClock;
}

interface EncryptedSettingsPayload {
  schemaVersion: 1;
  fields: Record<string, SyncedField>;
}

interface SettingsSyncMetadata {
  fields: Record<string, FieldClock>;
}

export interface RemoteUserConfiguration {
  version: number;
  iv: string;
  ciphertext: string;
  revision: number;
  updatedAt: string;
}

interface WriteUserConfiguration {
  version: number;
  iv: string;
  ciphertext: string;
  expectedRevision?: number;
}

interface MergeResult {
  values: Record<string, unknown>;
  shouldUpload: boolean;
}

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

export type SettingsSyncUnlockSource = 'local' | 'remote';

export interface SyncedCollections {
  blockedUsers: BlockedUser[];
  boardFavoriteIds: string[];
  savedPosts: PersistedSavedPost[];
}

export class SettingsSyncRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
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

      const generatedKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt'],
      );
      const rawKey = await crypto.subtle.exportKey('raw', generatedKey);
      const recoveryKey = `${RECOVERY_KEY_PREFIX}${toBase64Url(rawKey)}`;
      const key = await importRawKey(rawKey);
      this.currentSettings = { ...localSettings };
      const values = this.currentValues;
      const metadata = this.createInitialMetadata(values);
      this.writeMetadata(metadata);
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
      const collections = this.collectionsFromValues(values);
      await this.storeKey(decrypted.key);
      this.writeMetadata(metadata);
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
    const metadata = this.readMetadata() ?? { fields: {} };
    metadata.fields[key] = {
      modifiedAt: this.nextModifiedAt(metadata),
      deviceId: this.deviceId,
    };
    this.writeMetadata(metadata);
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
        this.readMetadata() ?? this.createInitialMetadata(values);
      this.writeMetadata(metadata);
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
    const response = await this.request('/user-configuration');
    if (response.status === 404) return null;
    return this.readResponse<RemoteUserConfiguration>(response);
  }

  protected async writeRemote(
    value: WriteUserConfiguration,
  ): Promise<RemoteUserConfiguration> {
    const response = await this.request('/user-configuration', {
      method: 'PUT',
      body: JSON.stringify(value),
    });
    return this.readResponse<RemoteUserConfiguration>(response);
  }

  protected async deleteRemote(): Promise<void> {
    const response = await this.request('/user-configuration', {
      method: 'DELETE',
    });
    if (!response.ok) await this.throwResponseError(response);
  }

  protected async loadKey(): Promise<CryptoKey | undefined> {
    const userId = this.requireUserId();
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(KEY_DATABASE, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(KEY_STORE);
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(KEY_STORE, 'readonly');
        const getRequest = transaction.objectStore(KEY_STORE).get(userId);
        getRequest.onerror = () => reject(getRequest.error);
        getRequest.onsuccess = () => resolve(getRequest.result as CryptoKey);
        transaction.oncomplete = () => database.close();
      };
    });
  }

  protected async storeKey(key: CryptoKey): Promise<void> {
    const userId = this.requireUserId();
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(KEY_DATABASE, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(KEY_STORE);
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(KEY_STORE, 'readwrite');
        transaction.objectStore(KEY_STORE).put(key, userId);
        transaction.onerror = () => reject(transaction.error);
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
      };
    });
  }

  protected async removeKey(): Promise<void> {
    const userId = this.userId;
    if (!userId) return;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(KEY_DATABASE, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(KEY_STORE);
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(KEY_STORE, 'readwrite');
        transaction.objectStore(KEY_STORE).delete(userId);
        transaction.onerror = () => reject(transaction.error);
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
      };
    });
  }

  private async request(path: string, init: RequestInit = {}) {
    this.ensureAuthenticated();
    return fetch(new URL(path, appConfig.apiUrl), {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
        ...init.headers,
      },
    });
  }

  private async readResponse<T>(response: Response): Promise<T> {
    if (!response.ok) await this.throwResponseError(response);
    return (await response.json()) as T;
  }

  private async throwResponseError(response: Response): Promise<never> {
    const body = await response.json().catch(() => undefined);
    throw new SettingsSyncRequestError(
      response.status,
      body?.message ?? response.statusText,
    );
  }

  private async decryptAndMerge(
    remote: RemoteUserConfiguration,
    key: CryptoKey,
    localValues: Record<string, unknown>,
  ): Promise<MergeResult> {
    const payload = await this.decryptPayload(remote, key);
    return this.merge(localValues, payload);
  }

  private async decryptPayload(
    remote: RemoteUserConfiguration,
    key: CryptoKey,
  ): Promise<EncryptedSettingsPayload> {
    if (remote.version !== ENVELOPE_VERSION) {
      throw new Error('Unsupported encrypted settings version.');
    }
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: fromBase64(remote.iv),
        additionalData: this.additionalData,
      },
      key,
      fromBase64(remote.ciphertext),
    );
    const payload = JSON.parse(new TextDecoder().decode(plaintext)) as unknown;
    if (!isEncryptedSettingsPayload(payload)) {
      throw new Error('Invalid encrypted settings payload.');
    }
    return payload;
  }

  private merge(
    localValues: Record<string, unknown>,
    remote: EncryptedSettingsPayload,
  ): MergeResult {
    const localMetadata = this.readMetadata();
    const merged = { ...localValues };
    const mergedMetadata: SettingsSyncMetadata = { fields: {} };
    let shouldUpload = false;

    for (const key of Object.keys(localValues)) {
      const localClock = localMetadata?.fields[key];
      const remoteField = remote.fields[key];
      if (
        remoteField &&
        (!localClock || compareClocks(remoteField.clock, localClock) >= 0)
      ) {
        merged[key] = remoteField.value;
        mergedMetadata.fields[key] = remoteField.clock;
      } else if (localClock) {
        mergedMetadata.fields[key] = localClock;
        shouldUpload = true;
      } else {
        mergedMetadata.fields[key] = {
          modifiedAt: this.nextModifiedAt(mergedMetadata),
          deviceId: this.deviceId,
        };
        shouldUpload = true;
      }
    }

    this.writeMetadata(mergedMetadata);
    return { values: merged, shouldUpload };
  }

  private async decryptForUnlock(
    recoveryKey: string,
  ): Promise<DecryptedRemote> {
    const rawKey = parseRecoveryKey(recoveryKey);
    const key = await importRawKey(rawKey);
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
            deviceId: this.deviceId,
          } satisfies FieldClock),
      };
    }
    const payload: EncryptedSettingsPayload = {
      schemaVersion: 1,
      fields,
    };
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: this.additionalData },
      key,
      new TextEncoder().encode(JSON.stringify(payload)),
    );
    return {
      version: ENVELOPE_VERSION,
      iv: toBase64(iv),
      ciphertext: toBase64(ciphertext),
    };
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
      this.readMetadata() ?? this.createInitialMetadata(merged.values);
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
        deviceId: this.deviceId,
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
        deviceId: this.deviceId,
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

  private collectionsFromValues(
    values: Record<string, unknown>,
  ): SyncedCollections {
    const blockedUsers = values[BLOCKED_USERS_FIELD];
    const boardFavoriteIds = values[BOARD_FAVORITES_FIELD];
    const savedPosts = values[SAVED_POSTS_FIELD];
    if (!isBlockedUsers(blockedUsers)) {
      throw new Error('Invalid encrypted blocklist.');
    }
    if (!isStringArray(boardFavoriteIds)) {
      throw new Error('Invalid encrypted board favorites.');
    }
    if (!isPersistedSavedPosts(savedPosts)) {
      throw new Error('Invalid encrypted saved posts.');
    }
    return { blockedUsers, boardFavoriteIds, savedPosts };
  }

  private validateValues(values: Record<string, unknown>) {
    this.settingsForValues(values);
    this.collectionsFromValues(values);
  }

  private applyCollectionsFromValues(values: Record<string, unknown>) {
    const collections = this.collectionsFromValues(values);
    this.collections = cloneCollections(collections);
    this.onRemoteCollections?.(cloneCollections(collections));
  }

  private readMetadata(): SettingsSyncMetadata | undefined {
    const userId = this.userId;
    if (!userId) return undefined;
    try {
      const stored = localStorage.getItem(`${METADATA_PREFIX}${userId}`);
      if (!stored) return undefined;
      const metadata = JSON.parse(stored) as SettingsSyncMetadata;
      return metadata?.fields ? metadata : undefined;
    } catch {
      return undefined;
    }
  }

  private writeMetadata(metadata: SettingsSyncMetadata) {
    localStorage.setItem(
      `${METADATA_PREFIX}${this.requireUserId()}`,
      JSON.stringify(metadata),
    );
  }

  private async clearLocalSyncState() {
    await this.removeKey();
    if (this.userId) {
      localStorage.removeItem(`${METADATA_PREFIX}${this.userId}`);
    }
  }

  private nextModifiedAt(metadata: SettingsSyncMetadata) {
    const latest = Object.values(metadata.fields).reduce(
      (maximum, clock) => Math.max(maximum, clock.modifiedAt),
      0,
    );
    return Math.max(Date.now(), latest + 1);
  }

  private get deviceId() {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  private get additionalData() {
    return new TextEncoder().encode(
      `potber-user-configuration:v${ENVELOPE_VERSION}:${this.requireUserId()}`,
    );
  }

  private ensureAuthenticated() {
    if (!this.accessToken || !this.userId) {
      throw new Error('Encrypted settings sync requires authentication.');
    }
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

function isEncryptedSettingsPayload(
  value: unknown,
): value is EncryptedSettingsPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<EncryptedSettingsPayload>;
  if (payload.schemaVersion !== 1 || !payload.fields) return false;
  return Object.values(payload.fields).every((field) => {
    if (!field || typeof field !== 'object') return false;
    const candidate = field as Partial<SyncedField>;
    return (
      Boolean(candidate.clock) &&
      typeof candidate.clock?.modifiedAt === 'number' &&
      typeof candidate.clock.deviceId === 'string'
    );
  });
}

function compareClocks(first: FieldClock, second: FieldClock) {
  if (first.modifiedAt !== second.modifiedAt) {
    return first.modifiedAt - second.modifiedAt;
  }
  return first.deviceId.localeCompare(second.deviceId);
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

function valuesFromPayload(payload: EncryptedSettingsPayload) {
  return Object.fromEntries(
    Object.entries(payload.fields).map(([fieldKey, field]) => [
      fieldKey,
      field.value,
    ]),
  );
}

function mergeUnlockValues(
  source: SettingsSyncUnlockSource,
  localValues: Record<string, unknown>,
  remoteValues: Record<string, unknown>,
) {
  const primary = source === 'local' ? localValues : remoteValues;
  const secondary = source === 'local' ? remoteValues : localValues;
  const primaryBlockedUsers = primary[BLOCKED_USERS_FIELD];
  const secondaryBlockedUsers = secondary[BLOCKED_USERS_FIELD];
  const primaryBoardFavorites = primary[BOARD_FAVORITES_FIELD];
  const secondaryBoardFavorites = secondary[BOARD_FAVORITES_FIELD];
  const primarySavedPosts = primary[SAVED_POSTS_FIELD];
  const secondarySavedPosts = secondary[SAVED_POSTS_FIELD];

  if (
    !isBlockedUsers(primaryBlockedUsers) ||
    !isBlockedUsers(secondaryBlockedUsers) ||
    !isStringArray(primaryBoardFavorites) ||
    !isStringArray(secondaryBoardFavorites) ||
    !isPersistedSavedPosts(primarySavedPosts) ||
    !isPersistedSavedPosts(secondarySavedPosts)
  ) {
    throw new Error('Invalid collections while unlocking settings sync.');
  }

  return {
    ...primary,
    [BLOCKED_USERS_FIELD]: unionById(
      primaryBlockedUsers,
      secondaryBlockedUsers,
    ),
    [BOARD_FAVORITES_FIELD]: unionBy(
      primaryBoardFavorites,
      secondaryBoardFavorites,
      (id) => id,
    ),
    [SAVED_POSTS_FIELD]: unionById(primarySavedPosts, secondarySavedPosts),
  };
}

function unionById<T extends { id: string }>(primary: T[], secondary: T[]) {
  return unionBy(primary, secondary, ({ id }) => id);
}

function unionBy<T>(
  primary: T[],
  secondary: T[],
  identity: (value: T) => string,
) {
  const ids = new Set(primary.map(identity));
  return [
    ...primary,
    ...secondary.filter((value) => {
      const id = identity(value);
      if (ids.has(id)) return false;
      ids.add(id);
      return true;
    }),
  ];
}

function syncedValuesDiffer(
  localValues: Record<string, unknown>,
  remoteValues: Record<string, unknown>,
) {
  const localKeys = Object.keys(localValues);
  const remoteKeys = Object.keys(remoteValues);
  return (
    localKeys.length !== remoteKeys.length ||
    localKeys.some(
      (fieldKey) =>
        !jsonValuesEqual(localValues[fieldKey], remoteValues[fieldKey]),
    )
  );
}

function jsonValuesEqual(first: unknown, second: unknown): boolean {
  if (Object.is(first, second)) return true;
  if (Array.isArray(first) || Array.isArray(second)) {
    return (
      Array.isArray(first) &&
      Array.isArray(second) &&
      first.length === second.length &&
      first.every((entry, index) => jsonValuesEqual(entry, second[index]))
    );
  }
  if (
    !first ||
    !second ||
    typeof first !== 'object' ||
    typeof second !== 'object'
  ) {
    return false;
  }

  const firstRecord = first as Record<string, unknown>;
  const secondRecord = second as Record<string, unknown>;
  const firstKeys = Object.keys(firstRecord);
  const secondKeys = Object.keys(secondRecord);
  return (
    firstKeys.length === secondKeys.length &&
    firstKeys.every(
      (key) =>
        Object.hasOwn(secondRecord, key) &&
        jsonValuesEqual(firstRecord[key], secondRecord[key]),
    )
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === 'string')
  );
}

function isBlockedUsers(value: unknown): value is BlockedUser[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        Boolean(entry) &&
        typeof entry === 'object' &&
        typeof (entry as BlockedUser).id === 'string' &&
        typeof (entry as BlockedUser).name === 'string',
    )
  );
}

function isPersistedSavedPosts(value: unknown): value is PersistedSavedPost[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        Boolean(entry) &&
        typeof entry === 'object' &&
        typeof (entry as PersistedSavedPost).id === 'string' &&
        typeof (entry as PersistedSavedPost).threadId === 'string',
    )
  );
}

async function importRawKey(rawKey: BufferSource) {
  return crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function parseRecoveryKey(recoveryKey: string): ArrayBuffer {
  const normalized = recoveryKey.trim();
  if (!normalized.startsWith(RECOVERY_KEY_PREFIX)) {
    throw new Error('Invalid recovery key prefix.');
  }
  const encodedKey = normalized.slice(RECOVERY_KEY_PREFIX.length);
  if (!/^[A-Za-z0-9_-]{43}$/.test(encodedKey)) {
    throw new Error('Invalid recovery key encoding.');
  }
  const rawKey = fromBase64Url(encodedKey);
  if (rawKey.byteLength !== 32) throw new Error('Invalid recovery key length.');
  if (toBase64Url(rawKey) !== encodedKey) {
    throw new Error('Non-canonical recovery key encoding.');
  }
  return rawKey.buffer as ArrayBuffer;
}

function toBase64(value: ArrayBuffer | ArrayBufferView) {
  const bytes =
    value instanceof ArrayBuffer
      ? new Uint8Array(value)
      : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toBase64Url(value: ArrayBuffer | ArrayBufferView) {
  return toBase64(value)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

function fromBase64Url(value: string) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  return fromBase64(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message || error.name;
  return String(error);
}
