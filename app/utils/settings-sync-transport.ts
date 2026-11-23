import * as v from 'valibot';
import { appConfig } from 'potber-client/config/app.config';
import type { SettingsSyncEnvelope } from './settings-sync-crypto';

const remoteUserConfigurationSchema = v.object({
  version: v.pipe(v.number(), v.safeInteger()),
  iv: v.string(),
  ciphertext: v.string(),
  revision: v.pipe(v.number(), v.safeInteger(), v.minValue(1)),
  updatedAt: v.string(),
});

const errorMessageSchema = v.object({ message: v.string() });

export type RemoteUserConfiguration = v.InferOutput<
  typeof remoteUserConfigurationSchema
>;

export interface WriteUserConfiguration extends SettingsSyncEnvelope {
  expectedRevision?: number;
}

export class SettingsSyncRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function fetchRemoteSettings(
  accessToken: string,
): Promise<RemoteUserConfiguration | null> {
  const response = await request(accessToken);
  if (response.status === 404) return null;
  return readConfiguration(response);
}

export async function writeRemoteSettings(
  accessToken: string,
  value: WriteUserConfiguration,
): Promise<RemoteUserConfiguration> {
  const response = await request(accessToken, {
    method: 'PUT',
    body: JSON.stringify(value),
  });
  return readConfiguration(response);
}

export async function deleteRemoteSettings(accessToken: string): Promise<void> {
  const response = await request(accessToken, { method: 'DELETE' });
  if (!response.ok) await throwResponseError(response);
}

function request(accessToken: string, init: RequestInit = {}) {
  return fetch(new URL('/user-configuration', appConfig.apiUrl), {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

async function readConfiguration(
  response: Response,
): Promise<RemoteUserConfiguration> {
  if (!response.ok) await throwResponseError(response);
  const body: unknown = await response.json().catch(() => undefined);
  const result = v.safeParse(remoteUserConfigurationSchema, body);
  if (!result.success) {
    throw new SettingsSyncRequestError(
      response.status,
      'Unexpected settings sync response',
    );
  }
  return result.output;
}

async function throwResponseError(response: Response): Promise<never> {
  const body: unknown = await response.json().catch(() => undefined);
  const result = v.safeParse(errorMessageSchema, body);
  throw new SettingsSyncRequestError(
    response.status,
    result.success ? result.output.message : response.statusText,
  );
}
