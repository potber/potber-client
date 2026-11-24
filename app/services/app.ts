import Service, { service } from '@ember/service';
import DeviceManagerService from './device-manager';
import NewsfeedService from './newsfeed';
import RendererService from './renderer';
import type SettingsEffectsService from './settings-effects';
import ExceptionHandler from './exception-handler';
import SessionSetupService from './session-setup';
import type DeploymentVersionService from './deployment-version';
import type ReleaseNoticeService from './release-notice';

export default class AppService extends Service {
  @service declare settingsEffects: SettingsEffectsService;
  @service declare renderer: RendererService;
  @service declare deviceManager: DeviceManagerService;
  @service declare newsfeed: NewsfeedService;
  @service declare exceptionHandler: ExceptionHandler;
  @service declare sessionSetup: SessionSetupService;
  @service declare deploymentVersion: DeploymentVersionService;
  @service declare releaseNotice: ReleaseNoticeService;
  initialized = false;
  deferredInstallPrompt: any = undefined;

  async initialize() {
    if (this.initialized) return;
    this.exceptionHandler.initialize();
    this.settingsEffects.apply('debug');
    this.newsfeed.initialize();
    this.renderer.initialize();
    this.deviceManager.initialize();
    void this.sessionSetup.setup();
    void this.releaseNotice.showIfUpdated();
    this.deploymentVersion.initialize();
    this.renderer.removeAppSkeleton(3000);
    this.initialized = true;
  }
}
