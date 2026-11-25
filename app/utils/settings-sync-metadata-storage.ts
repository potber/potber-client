import * as v from 'valibot';
import { createInitialMetadata, nextModifiedAt } from './settings-sync-clocks';
import type {
  EncryptedSettingsPayload,
  FieldClock,
} from './settings-sync-payload';
import {
  mergeSettings,
  type SettingsSyncMetadata,
} from './settings-sync-merge';

const METADATA_PREFIX = 'potber-settingsSyncMetadata-';
const DEVICE_ID_KEY = 'potber-settingsSyncDeviceId';

const metadataSchema = v.object({
  fields: v.pipe(
    v.unknown(),
    v.check((fields) => !Array.isArray(fields)),
    v.record(
      v.string(),
      v.object({
        modifiedAt: v.pipe(v.number(), v.safeInteger(), v.minValue(0)),
        deviceId: v.pipe(v.string(), v.nonEmpty()),
      }),
    ),
  ),
});

export function readSyncMetadata(
  userId: string | undefined,
): SettingsSyncMetadata | undefined {
  if (!userId) return undefined;
  try {
    const stored = localStorage.getItem(`${METADATA_PREFIX}${userId}`);
    if (!stored) return undefined;
    const metadata: unknown = JSON.parse(stored);
    const result = v.safeParse(metadataSchema, metadata);
    return result.success ? result.output : undefined;
  } catch {
    return undefined;
  }
}

export function writeSyncMetadata(
  userId: string,
  metadata: SettingsSyncMetadata,
) {
  localStorage.setItem(`${METADATA_PREFIX}${userId}`, JSON.stringify(metadata));
}

export function clearSyncMetadata(userId: string) {
  localStorage.removeItem(`${METADATA_PREFIX}${userId}`);
}

export function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export function createLocalFieldClock(
  metadata: SettingsSyncMetadata,
): FieldClock {
  return {
    modifiedAt: nextModifiedAt(metadata, Date.now()),
    deviceId: getOrCreateDeviceId(),
  };
}

/**
 * Returns the stored field clocks for an upload. When none are stored, it
 * stamps every current field as a local change and persists those clocks so
 * later edits advance from them.
 */
export function readOrCreateSyncMetadata(
  userId: string,
  values: Record<string, unknown>,
): SettingsSyncMetadata {
  const stored = readSyncMetadata(userId);
  if (stored) return stored;
  const metadata = createInitialMetadata(values, createLocalFieldClock);
  writeSyncMetadata(userId, metadata);
  return metadata;
}

export function recordLocalFieldChange(userId: string, field: string): void {
  const metadata = readSyncMetadata(userId) ?? { fields: {} };
  metadata.fields[field] = createLocalFieldClock(metadata);
  writeSyncMetadata(userId, metadata);
}

export function mergeAndStoreRemoteSettings(
  userId: string,
  localValues: Record<string, unknown>,
  payload: EncryptedSettingsPayload,
) {
  const merged = mergeSettings(
    localValues,
    payload,
    readSyncMetadata(userId),
    createLocalFieldClock,
  );
  writeSyncMetadata(userId, merged.metadata);
  return merged;
}
