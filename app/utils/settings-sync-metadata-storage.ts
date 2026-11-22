import type { SettingsSyncMetadata } from './settings-sync-merge';

const METADATA_PREFIX = 'potber-settingsSyncMetadata-';
const DEVICE_ID_KEY = 'potber-settingsSyncDeviceId';

export function readSyncMetadata(
  userId: string | undefined,
): SettingsSyncMetadata | undefined {
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
