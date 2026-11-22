const RECOVERY_KEY_PREFIX = 'potber-sync-v1-';

export async function createRecoveryKey() {
  const generatedKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
  const rawKey = await crypto.subtle.exportKey('raw', generatedKey);
  const recoveryKey = `${RECOVERY_KEY_PREFIX}${toBase64Url(rawKey)}`;
  return { key: await importRawKey(rawKey), recoveryKey };
}

export function importRecoveryKey(recoveryKey: string) {
  return importRawKey(parseRecoveryKey(recoveryKey));
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

export function toBase64(value: ArrayBuffer | ArrayBufferView) {
  const bytes =
    value instanceof ArrayBuffer
      ? new Uint8Array(value)
      : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function fromBase64(value: string) {
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
