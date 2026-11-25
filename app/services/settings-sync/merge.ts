import type { EncryptedSettingsPayload, FieldClock } from './payload';

export interface SettingsSyncMetadata {
  fields: Record<string, FieldClock>;
}

export interface MergeResult {
  values: Record<string, unknown>;
  shouldUpload: boolean;
}

export function mergeSettings(
  localValues: Record<string, unknown>,
  remote: EncryptedSettingsPayload,
  localMetadata: SettingsSyncMetadata | undefined,
  createClock: (metadata: SettingsSyncMetadata) => FieldClock,
): MergeResult & { metadata: SettingsSyncMetadata } {
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
      mergedMetadata.fields[key] = createClock(mergedMetadata);
      shouldUpload = true;
    }
  }

  return { values: merged, metadata: mergedMetadata, shouldUpload };
}

function compareClocks(first: FieldClock, second: FieldClock) {
  if (first.modifiedAt !== second.modifiedAt) {
    return first.modifiedAt - second.modifiedAt;
  }
  return first.deviceId.localeCompare(second.deviceId);
}
