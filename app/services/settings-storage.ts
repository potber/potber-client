import Service from '@ember/service';
import type { Settings } from './settings/types';

const SETTINGS_STORAGE_KEY = 'potber-settings';

export default class SettingsStorageService extends Service {
  read(): unknown {
    try {
      const value = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return JSON.parse(value || '{}');
    } catch {
      return null;
    }
  }

  write(settings: Settings) {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }
}
