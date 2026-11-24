import Service, { service } from '@ember/service';
import type RouterService from '@ember/routing/router-service';
import { waitForPromise } from '@ember/test-waiters';
import { gt, valid } from 'semver';
import { appConfig } from 'potber-client/config/app.config';
import { sleep } from 'potber-client/utils/misc';
import type LocalStorageService from './local-storage';
import type ModalService from './modal';

export default class ReleaseNoticeService extends Service {
  @service declare localStorage: LocalStorageService;
  @service declare modal: ModalService;
  @service declare router: RouterService;
  versionModalDelayMs = 1000;

  async showIfUpdated() {
    try {
      const currentVersion = valid(appConfig.version);
      if (!currentVersion) return;

      const encounteredVersion = this.localStorage.getEncounteredVersion();
      if (encounteredVersion && !gt(currentVersion, encounteredVersion)) return;

      this.localStorage.setEncounteredVersion(currentVersion);

      // Establish a baseline on first use without presenting an update modal.
      if (!encounteredVersion) return;

      await waitForPromise(sleep(this.versionModalDelayMs));
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
