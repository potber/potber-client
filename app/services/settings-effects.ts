import Service, { service } from '@ember/service';
import type DeviceManagerService from './device-manager';
import type RendererService from './renderer';
import type SettingsService from './settings';

export default class SettingsEffectsService extends Service {
  @service declare deviceManager: DeviceManagerService;
  @service declare renderer: RendererService;
  @service declare settings: SettingsService;

  private readonly effects = {
    theme: () => this.renderer.updateTheme(),
    sidebarLayout: () => this.renderer.updateSidebarLayout(),
    fontSize: () => this.renderer.updateFontSize(),
    gestures: () => this.deviceManager.toggleGesturesSupport(),
    debug: () =>
      this.settings.toggleDebugMode(this.settings.getSetting('debug')),
  };

  apply(setting: keyof SettingsEffectsService['effects']) {
    void this.effects[setting]();
  }

  applyAll() {
    for (const effect of Object.values(this.effects)) {
      void effect();
    }
  }
}
