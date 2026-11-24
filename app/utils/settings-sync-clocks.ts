import type { SettingsSyncMetadata } from './settings-sync-merge';
import type {
  EncryptedSettingsPayload,
  FieldClock,
} from './settings-sync-payload';

export function nextModifiedAt(metadata: SettingsSyncMetadata, now: number) {
  const latest = Object.values(metadata.fields).reduce(
    (maximum, clock) => Math.max(maximum, clock.modifiedAt),
    0,
  );
  return Math.max(now, latest + 1);
}

export function createInitialMetadata(
  values: Record<string, unknown>,
  createClock: (metadata: SettingsSyncMetadata) => FieldClock,
): SettingsSyncMetadata {
  const metadata: SettingsSyncMetadata = { fields: {} };
  for (const key of Object.keys(values)) {
    metadata.fields[key] = createClock(metadata);
  }
  return metadata;
}

export function createOverwriteMetadata(
  values: Record<string, unknown>,
  remote: EncryptedSettingsPayload,
  now: number,
  getDeviceId: () => string,
): SettingsSyncMetadata {
  const latestRemoteClock = Object.values(remote.fields).reduce(
    (latest, field) => Math.max(latest, field.clock.modifiedAt),
    0,
  );
  const firstModifiedAt = Math.max(now, latestRemoteClock + 1);
  const metadata: SettingsSyncMetadata = { fields: {} };

  Object.keys(values).forEach((fieldKey, index) => {
    metadata.fields[fieldKey] = {
      modifiedAt: firstModifiedAt + index,
      deviceId: getDeviceId(),
    };
  });
  return metadata;
}

export function metadataFromPayload(
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
