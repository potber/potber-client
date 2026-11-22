import { appConfig } from 'potber-client/config/app.config';
import type { SettingsSyncEnvelope } from './settings-sync-crypto';

export interface RemoteUserConfiguration extends SettingsSyncEnvelope {
  revision: number;
  updatedAt: string;
}

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
  return (await response.json()) as RemoteUserConfiguration;
}

async function throwResponseError(response: Response): Promise<never> {
  const body = await response.json().catch(() => undefined);
  throw new SettingsSyncRequestError(
    response.status,
    body?.message ?? response.statusText,
  );
}
