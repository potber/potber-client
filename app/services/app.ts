import RouterService from '@ember/routing/router-service';
import Service, { service } from '@ember/service';
import { sleep } from 'potber-client/utils/misc';
import DeviceManagerService from './device-manager';
import LocalStorageService from './local-storage';
import ModalService from './modal';
import NewsfeedService from './newsfeed';
import RendererService from './renderer';
import CustomSession from './custom-session';
import SettingsService from './settings';
import ExceptionHandler from './exception-handler';
import SocialsService from './socials';
import { gt, valid } from 'semver';
import { appConfig } from 'potber-client/config/app.config';

export default class AppService extends Service {
  @service declare settings: SettingsService;
  @service declare renderer: RendererService;
  @service declare deviceManager: DeviceManagerService;
  @service declare router: RouterService;
  @service declare modal: ModalService;
  @service declare localStorage: LocalStorageService;
  @service declare newsfeed: NewsfeedService;
  @service declare session: CustomSession;
  @service declare exceptionHandler: ExceptionHandler;
  @service declare socials: SocialsService;
  initialized = false;
  versionModalDelayMs = 1000;
  deferredInstallPrompt: any = undefined;

  async initialize() {
    if (this.initialized) return;
    this.exceptionHandler.initialize();
    this.settings.initialize();
    this.newsfeed.initialize();
    this.renderer.initialize();
    this.deviceManager.initialize();
    this.setupSession();
    this.checkForNewVersion();
    this.renderer.removeAppSkeleton(3000);
    this.initialized = true;
  }

  async setupSession() {
    await this.session.setup();
    if (this.session.isAuthenticated) {
      this.session.update();
      this.localStorage.initialize();
      this.newsfeed.refresh();
      this.socials.load();
    }
  }

  async checkForNewVersion() {
    try {
      const currentVersion = valid(appConfig.version);
      if (!currentVersion) return;

      const encounteredVersion = this.localStorage.getEncounteredVersion();
      if (encounteredVersion && !gt(currentVersion, encounteredVersion)) return;

      this.localStorage.setEncounteredVersion(currentVersion);

      // Establish a baseline on first use without presenting an update modal.
      if (!encounteredVersion) return;

      await sleep(this.versionModalDelayMs);
      this.modal.confirm({
        title: 'Es gibt Neuigkeiten!',
        text: `Potber wurde auf Version ${currentVersion} aktualisiert.
          Tippe auf 'Details', um mehr über die Änderungen zu erfahren.`,
        icon: 'star',
        cancelLabel: 'Details',
        onSubmit: () => {
          this.modal.close();
        },
        onCancel: () => {
          this.modal.close();
          this.router.transitionTo('changelog');
        },
      });
    } catch {
      // Occasionally this check might fail on cold starts of the PWA.
      // If it does, we simply move on.
    }
  }
}
