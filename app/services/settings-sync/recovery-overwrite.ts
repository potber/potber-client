import { createOverwriteMetadata } from './clocks';
import type { SettingsSyncMetadata } from './merge';
import { getOrCreateDeviceId } from './metadata-storage';
import type { EncryptedSettingsPayload } from './payload';
import {
  isRevisionConflict,
  type RemoteUserConfiguration,
  type WriteUserConfiguration,
} from './transport';

interface RecoveryOverwriteOperations {
  fetchRemote(): Promise<RemoteUserConfiguration | null>;
  decrypt(
    remote: RemoteUserConfiguration,
    key: CryptoKey,
  ): Promise<EncryptedSettingsPayload>;
  encrypt(
    values: Record<string, unknown>,
    key: CryptoKey,
    metadata: SettingsSyncMetadata,
  ): Promise<WriteUserConfiguration>;
  write(
    encrypted: WriteUserConfiguration,
    revision: number,
  ): Promise<RemoteUserConfiguration>;
}

export async function overwriteRecoveredSettings(
  values: Record<string, unknown>,
  source: {
    key: CryptoKey;
    payload: EncryptedSettingsPayload;
    remote: RemoteUserConfiguration;
  },
  operations: RecoveryOverwriteOperations,
) {
  const { key, payload, remote } = source;
  async function prepare(payload: EncryptedSettingsPayload) {
    const metadata = createOverwriteMetadata(
      values,
      payload,
      Date.now(),
      getOrCreateDeviceId,
    );
    return {
      metadata,
      encrypted: await operations.encrypt(values, key, metadata),
    };
  }

  const first = await prepare(payload);
  try {
    const written = await operations.write(first.encrypted, remote.revision);
    return { metadata: first.metadata, remote: written };
  } catch (error) {
    if (!isRevisionConflict(error)) throw error;

    const latest = await operations.fetchRemote();
    if (!latest) {
      throw new Error('No encrypted settings exist for this account.', {
        cause: error,
      });
    }

    const latestPayload = await operations.decrypt(latest, key);
    const retry = await prepare(latestPayload);
    const written = await operations.write(retry.encrypted, latest.revision);
    return { metadata: retry.metadata, remote: written };
  }
}
