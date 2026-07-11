import RouterService from '@ember/routing/router-service';
import Service, { service } from '@ember/service';
import { registerDestructor } from '@ember/destroyable';
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

const DEPLOYMENT_VERSION_URL = '/version.json';
const VERSION_QUERY_PARAMETER = '_potber_version';
const RELOAD_QUERY_PARAMETER = '_potber_reload';

interface DeploymentVersionResponse {
  version?: unknown;
}

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
  deploymentVersionCheckIntervalMs = 60_000;
  deferredInstallPrompt: any = undefined;
  private deploymentVersionChecksInitialized = false;
  private lastDeploymentVersionCheckAt = 0;
  private deploymentVersionCheck?: Promise<void>;

  async initialize() {
    if (this.initialized) return;
    this.exceptionHandler.initialize();
    this.settings.initialize();
    this.newsfeed.initialize();
    this.renderer.initialize();
    this.deviceManager.initialize();
    this.setupSession();
    this.checkForNewVersion();
    this.setupDeploymentVersionChecks();
    this.renderer.removeAppSkeleton(3000);
    this.initialized = true;
  }

  private setupDeploymentVersionChecks() {
    if (this.deploymentVersionChecksInitialized) return;

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('pageshow', this.handlePageShow);
    registerDestructor(this, () => {
      document.removeEventListener(
        'visibilitychange',
        this.handleVisibilityChange,
      );
      window.removeEventListener('pageshow', this.handlePageShow);
    });
    this.deploymentVersionChecksInitialized = true;
    void this.checkForDeployedVersion({ force: true });
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void this.checkForDeployedVersion();
    }
  };

  private handlePageShow = () => {
    void this.checkForDeployedVersion();
  };

  /**
   * Checks the uncached deployment marker for a version that differs from the
   * currently running bundle. This is deliberately separate from
   * checkForNewVersion(), which announces a version only after it has loaded.
   */
  async checkForDeployedVersion(options?: { force?: boolean }) {
    const now = Date.now();
    if (
      !options?.force &&
      now - this.lastDeploymentVersionCheckAt <
        this.deploymentVersionCheckIntervalMs
    ) {
      return;
    }
    if (this.deploymentVersionCheck) return this.deploymentVersionCheck;

    this.lastDeploymentVersionCheckAt = now;
    const check = this.performDeploymentVersionCheck();
    this.deploymentVersionCheck = check;
    try {
      await check;
    } finally {
      if (this.deploymentVersionCheck === check) {
        this.deploymentVersionCheck = undefined;
      }
    }
  }

  private async performDeploymentVersionCheck() {
    try {
      const url = new URL(DEPLOYMENT_VERSION_URL, window.location.origin);
      url.searchParams.set('_', String(Date.now()));
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return;

      const payload = (await response.json()) as DeploymentVersionResponse;
      const deployedVersion = valid(String(payload.version ?? ''));
      const currentVersion = valid(appConfig.version);
      if (
        !deployedVersion ||
        !currentVersion ||
        deployedVersion === currentVersion
      ) {
        return;
      }

      this.navigateToDeployedVersion(deployedVersion);
    } catch {
      // The marker may be unavailable while offline or during a deployment.
      // The next launch or foreground event will retry the check.
    }
  }

  getDeployedVersionUrl(version: string, timestamp = Date.now()) {
    const url = new URL(window.location.href);
    url.searchParams.set(VERSION_QUERY_PARAMETER, version);
    url.searchParams.set(RELOAD_QUERY_PARAMETER, String(timestamp));
    return url;
  }

  navigateToDeployedVersion(version: string) {
    window.location.replace(this.getDeployedVersionUrl(version));
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
