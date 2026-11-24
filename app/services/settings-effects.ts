import Service, { service } from '@ember/service';
import type DeviceManagerService from './device-manager';
import type RendererService from './renderer';
import type SettingsService from './settings';
import { Gestures } from './settings/types';

export default class SettingsEffectsService extends Service {
  @service declare deviceManager: DeviceManagerService;
  @service declare renderer: RendererService;
  @service declare settings: SettingsService;

  private readonly effects = {
    theme: () => this.renderer.updateTheme(),
    sidebarLayout: () => this.renderer.updateSidebarLayout(),
    fontSize: () => this.renderer.updateFontSize(),
    gestures: () => this.deviceManager.toggleGesturesSupport(),
    debug: () => {
      const showOverlay =
        this.settings.getSetting('debug') &&
        this.settings.getSetting('gestures') !== Gestures.none;
      this.renderer.setStyleVariable(
        '--gestures-container-background',
        showOverlay ? 'var(--gestures-container-background-debug)' : 'unset',
      );
    },
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
