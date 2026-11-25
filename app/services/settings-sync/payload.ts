export interface FieldClock {
  modifiedAt: number;
  deviceId: string;
}

export interface SyncedField {
  value: unknown;
  clock: FieldClock;
}

export interface EncryptedSettingsPayload {
  schemaVersion: 1;
  fields: Record<string, SyncedField>;
}

export function serializeSettingsPayload(
  fields: Record<string, SyncedField>,
): string {
  const payload: EncryptedSettingsPayload = { schemaVersion: 1, fields };
  return JSON.stringify(payload);
}

export function parseSettingsPayload(
  plaintext: string,
): EncryptedSettingsPayload {
  const payload = JSON.parse(plaintext) as unknown;
  if (!isEncryptedSettingsPayload(payload)) {
    throw new Error('Invalid encrypted settings payload.');
  }
  return payload;
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

export function valuesFromPayload(payload: EncryptedSettingsPayload) {
  return Object.fromEntries(
    Object.entries(payload.fields).map(([fieldKey, field]) => [
      fieldKey,
      field.value,
    ]),
  );
}
