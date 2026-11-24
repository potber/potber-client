import { action } from '@ember/object';
import Service, { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import LocalStorageService from './local-storage';
import SettingsSyncService from './settings-sync';
import { normalizeSettings } from './settings/normalize';
import { SidebarLayout, type Settings } from './settings/types';

export {
  AvatarStyle,
  FontSize,
  Gestures,
  LandingPage,
  SidebarLayout,
  Theme,
  Transitions,
} from './settings/types';
export type { Settings } from './settings/types';
export default class SettingsService extends Service {
  @service declare localStorage: LocalStorageService;
  @service declare settingsSync: SettingsSyncService;

  @tracked protected active: Settings = this.load();
  readonly default = normalizeSettings({});

  /**
   * Loads settings from local storage and/or defaults to default values
   * if one or more settings could not be found.
   * @returns The settings.
   */
  load(): Settings {
    return normalizeSettings(this.localStorage.readSettings());
  }

  /**
   * Saves the active settings.
   */
  @action save() {
    this.localStorage.writeSettings(this.active);
  }

  getSettings() {
    return this.active;
  }

  getSetting<Key extends keyof Settings, Value extends Settings[Key]>(
    key: Key,
  ) {
    return this.active[key] as Value;
  }

  setSetting<Key extends keyof Settings, Value extends Settings[Key]>(
    key: Key,
    value: Value,
  ) {
    this.active = { ...this.active, [key]: value };
    this.save();
    this.settingsSync.settingChanged(key, this.active);
  }

  replaceSettings(settings: Settings) {
    this.active = normalizeSettings(settings);
    this.localStorage.writeSettings(this.active);
  }

  get sidebarLayout() {
    return this.active.sidebarLayout;
  }

  isRightSidebar(): boolean {
    return (
      this.sidebarLayout === SidebarLayout.rightTop ||
      this.sidebarLayout === SidebarLayout.rightBottom
    );
  }
}
