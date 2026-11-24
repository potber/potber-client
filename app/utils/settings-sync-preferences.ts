import { normalizeSettings } from 'potber-client/services/settings/normalize';
import type { Settings } from 'potber-client/services/settings/types';

export function preferenceFieldKey(key: string): string {
  return `settings.${key}`;
}

export function preferencesToSyncValues(
  preferences?: Settings,
): Record<string, unknown> {
  if (!preferences) return {};

  return {
    ...Object.fromEntries(
      Object.entries(preferences).map(([key, value]) => [
        preferenceFieldKey(key),
        value,
      ]),
    ),
    // Older v1 clients require this field when recovering settings.
    'settings.appsignalErrorReporting': false,
  };
}

export function preferencesFromSyncValues(
  values: Record<string, unknown>,
  localPreferences?: Settings,
): Settings {
  const preferences: Record<string, unknown> = {};
  for (const key of Object.keys(localPreferences ?? {})) {
    const fieldKey = preferenceFieldKey(key);
    if (!(fieldKey in values)) {
      throw new Error(`Missing encrypted configuration field: ${fieldKey}`);
    }
    preferences[key] = values[fieldKey];
  }
  return normalizeSettings(preferences);
}
