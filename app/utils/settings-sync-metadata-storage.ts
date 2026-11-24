import * as v from 'valibot';
import type { SettingsSyncMetadata } from './settings-sync-merge';

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
