import Service from '@ember/service';
import { registerDestructor } from '@ember/destroyable';
import { valid } from 'semver';
import * as v from 'valibot';
import { appConfig } from 'potber-client/config/app.config';

const DEPLOYMENT_VERSION_URL = '/version.json';
const VERSION_QUERY_PARAMETER = '_potber_version';
const RELOAD_QUERY_PARAMETER = '_potber_reload';

const deploymentVersionSchema = v.object({ version: v.string() });

export default class DeploymentVersionService extends Service {
  deploymentVersionCheckIntervalMs = 60_000;
  private deploymentVersionChecksInitialized = false;
  private lastDeploymentVersionCheckAt = 0;
  private deploymentVersionCheck?: Promise<void>;

  initialize() {
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
   * currently running bundle. ReleaseNoticeService announces upgrades based on
   * the version already running.
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

      const payload: unknown = await response.json();
      if (!v.is(deploymentVersionSchema, payload)) return;
      const deployedVersion = valid(payload.version);
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

  refreshApp() {
    this.navigateToDeployedVersion(valid(appConfig.version) ?? 'refresh');
  }
}
