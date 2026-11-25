import {
  decryptSettings,
  encryptSettings,
  type SettingsSyncEnvelope,
} from './settings-sync-crypto';
import type { SettingsSyncMetadata } from './settings-sync-merge';
import {
  parseSettingsPayload,
  serializeSettingsPayload,
  type FieldClock,
  type SyncedField,
} from './settings-sync-payload';

export function sealSettingsPayload(
  values: Record<string, unknown>,
  metadata: SettingsSyncMetadata,
  createClock: (metadata: SettingsSyncMetadata) => FieldClock,
  key: CryptoKey,
  userId: string,
): Promise<SettingsSyncEnvelope> {
  const fields: Record<string, SyncedField> = {};
  for (const [fieldKey, value] of Object.entries(values)) {
    fields[fieldKey] = {
      value,
      clock: metadata.fields[fieldKey] ?? createClock(metadata),
    };
  }
  return encryptSettings(serializeSettingsPayload(fields), key, userId);
}

export async function openSettingsPayload(
  envelope: SettingsSyncEnvelope,
  key: CryptoKey,
  userId: string,
) {
  return parseSettingsPayload(await decryptSettings(envelope, key, userId));
}
