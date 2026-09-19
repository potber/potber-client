import Controller from '@ember/controller';
import { service } from '@ember/service';
import type { DropdownOption } from 'potber-client/components/common/control/dropdown/types';
import RendererService from 'potber-client/services/renderer';
import MessagesService from 'potber-client/services/messages';
import AppService from 'potber-client/services/app';
import ModalService from 'potber-client/services/modal';
import type { SettingsRouteModel } from 'potber-client/routes/authenticated/settings';
import type { Settings } from 'potber-client/services/settings';
import SettingsService from 'potber-client/services/settings';
import DeviceManagerService from 'potber-client/services/device-manager';
import CustomSession from 'potber-client/services/custom-session';
import {
  getCurrentSettingOptions,
  settingsConfig,
} from 'potber-client/routes/authenticated/settings';
import SettingsSyncService, {
  type SettingsSyncUnlockSource,
} from 'potber-client/services/settings-sync';
import { tracked } from '@glimmer/tracking';
import type IntlService from 'ember-intl/services/intl';

export default class SettingsController extends Controller {
  declare model: SettingsRouteModel;

  @service declare settings: SettingsService;
  @service declare session: CustomSession;
  @service declare renderer: RendererService;
  @service declare messages: MessagesService;
  @service declare modal: ModalService;
  @service declare app: AppService;
  @service declare deviceManager: DeviceManagerService;
  @service declare settingsSync: SettingsSyncService;
  @service declare intl: IntlService;

  @tracked syncActionBusy = false;

  config = settingsConfig;

  get currentOptions() {
    return getCurrentSettingOptions(this.settings.getSettings());
  }

  handleSettingSelect = (
    settingKey: keyof Settings,
    option: DropdownOption,
  ) => {
    if (this.settings.getSetting(settingKey) === undefined)
      throw new Error(`Unknown setting key: ${settingKey}`);
    this.settings.setSetting(settingKey, option.data);
  };

  handleThemeSelect = (option: DropdownOption) => {
    this.settings.setSetting('theme', option.data);
    this.renderer.updateTheme();
  };

  handleSidebarLayoutSelect = (option: DropdownOption) => {
    if (this.renderer.isDesktop) {
      this.modal.confirm({
        title: 'Desktopmodus',
        icon: 'desktop',
        text: 'Aufgrund der Größe Deines Monitors läuft die Anwendung im Desktopmodus. Eine Änderung des Sidebarlayouts hat im Desktopmodus keine Auswirkungen.',
        onSubmit: () => this.modal.close(),
      });
    }
    this.settings.setSetting('sidebarLayout', option.data);
    this.renderer.updateSidebarLayout();
  };

  handleFontSizeSelect = (option: DropdownOption) => {
    this.settings.setSetting('fontSize', option.data);
    this.renderer.updateFontSize();
  };

  handleAutoRefreshSidebarSelect = (option: DropdownOption) => {
    this.settings.setSetting('autoRefreshSidebar', option.data);
    window.location.reload();
  };

  handleGesturesSelect = (option: DropdownOption) => {
    this.settings.setSetting('gestures', option.data);
    this.deviceManager.toggleGesturesSupport();
  };

  handleDebugSelect = (option: DropdownOption) => {
    this.settings.setSetting('debug', option.data);
    this.settings.toggleDebugMode(option.data);
  };

  handleAppsignalErrorReportingSelect = (option: DropdownOption) => {
    this.settings.setSetting('appsignalErrorReporting', option.data);
    window.location.reload();
  };

  handleRefreshApp = () => {
    this.app.refreshApp();
  };

  get syncStatusLabel() {
    return this.intl.t(`route.settings.sync.status.${this.settingsSync.state}`);
  }

  get syncIsDisabled() {
    return this.settingsSync.state === 'disabled';
  }

  get syncIsLocked() {
    return this.settingsSync.state === 'locked';
  }

  get syncIsEnabled() {
    return this.settingsSync.state === 'enabled';
  }

  get syncIsUnavailable() {
    return this.settingsSync.state === 'unavailable';
  }

  handleEnableSync = () => {
    this.modal.confirm({
      title: this.intl.t('route.settings.sync.setup.title'),
      icon: 'lock',
      text: this.intl.t('route.settings.sync.setup.text'),
      submitLabel: this.intl.t('route.settings.sync.enable'),
      onSubmit: () => void this.enableSync(),
    });
  };

  private async enableSync() {
    this.syncActionBusy = true;
    try {
      const recoveryKey = await this.settingsSync.enable(
        this.settings.getSettings(),
      );
      await this.modal.close();
      this.modal.input({
        title: this.intl.t('route.settings.sync.recovery.title'),
        icon: 'key',
        text: this.intl.t('route.settings.sync.recovery.text'),
        label: this.intl.t('route.settings.sync.recovery.label'),
        value: recoveryKey,
        useTextarea: true,
        submitLabel: this.intl.t('route.settings.sync.recovery.saved'),
        onSubmit: () => {
          void this.modal.close();
          this.messages.showNotification(
            this.intl.t('route.settings.sync.enabled'),
            'success',
          );
        },
        onCancel: () => void this.cancelSyncSetup(),
      });
    } catch {
      await this.modal.close();
      this.showSyncError();
    } finally {
      this.syncActionBusy = false;
    }
  }

  private async cancelSyncSetup() {
    try {
      await this.settingsSync.deleteSyncedConfiguration();
    } catch {
      this.showSyncError();
    }
  }

  handleUnlockSync = () => {
    this.modal.input({
      title: this.intl.t('route.settings.sync.unlock.title'),
      icon: 'key',
      text: this.intl.t('route.settings.sync.unlock.text'),
      label: this.intl.t('route.settings.sync.recovery.label'),
      useTextarea: true,
      submitLabel: this.intl.t('route.settings.sync.unlock.submit'),
      submitIcon: 'key',
      onSubmit: (recoveryKey) => void this.unlockSync(recoveryKey),
    });
  };

  private async unlockSync(recoveryKey: string) {
    this.syncActionBusy = true;
    try {
      const hasDifferences = await this.settingsSync.unlockHasDifferences(
        recoveryKey,
        this.settings.getSettings(),
      );
      if (hasDifferences) {
        this.showUnlockChoice(recoveryKey);
      } else {
        await this.completeUnlock(recoveryKey, 'remote');
      }
    } catch {
      this.messages.showNotification(
        this.intl.t('route.settings.sync.unlock.invalid'),
        'error',
      );
    } finally {
      this.syncActionBusy = false;
    }
  }

  private showUnlockChoice(recoveryKey: string) {
    this.modal.confirm({
      title: this.intl.t('route.settings.sync.unlock.choice.title'),
      icon: 'sync',
      text: this.intl.t('route.settings.sync.unlock.choice.text'),
      submitLabel: this.intl.t('route.settings.sync.unlock.choice.remote'),
      submitIcon: 'sync',
      alternativeLabel: this.intl.t('route.settings.sync.unlock.choice.local'),
      alternativeIcon: 'cloud-arrow-up',
      alternativeVariant: 'error',
      onSubmit: () => void this.completeUnlock(recoveryKey, 'remote'),
      onAlternative: () => void this.completeUnlock(recoveryKey, 'local'),
    });
  }

  private async completeUnlock(
    recoveryKey: string,
    source: SettingsSyncUnlockSource,
  ) {
    this.syncActionBusy = true;
    try {
      await this.settingsSync.unlock(
        recoveryKey,
        this.settings.getSettings(),
        source,
      );
      await this.modal.close();
      window.location.reload();
    } catch {
      await this.modal.close();
      this.showSyncError();
    } finally {
      this.syncActionBusy = false;
    }
  }

  handleForgetSyncKey = () => {
    this.modal.confirm({
      title: this.intl.t('route.settings.sync.forget.title'),
      icon: 'key',
      text: this.intl.t('route.settings.sync.forget.text'),
      submitLabel: this.intl.t('route.settings.sync.forget.submit'),
      onSubmit: () => void this.forgetSyncKey(),
    });
  };

  private async forgetSyncKey() {
    await this.settingsSync.forgetThisDevice();
    await this.modal.close();
  }

  handleDeleteSync = () => {
    this.modal.confirm({
      title: this.intl.t('route.settings.sync.delete.title'),
      icon: 'trash',
      variant: 'error',
      text: this.intl.t('route.settings.sync.delete.text'),
      submitLabel: this.intl.t('route.settings.sync.delete.submit'),
      submitIcon: 'trash',
      onSubmit: () => void this.deleteSync(),
    });
  };

  private async deleteSync() {
    this.syncActionBusy = true;
    try {
      await this.settingsSync.deleteSyncedConfiguration();
      await this.modal.close();
      this.messages.showNotification(
        this.intl.t('route.settings.sync.deleted'),
        'success',
      );
    } catch {
      await this.modal.close();
      this.showSyncError();
    } finally {
      this.syncActionBusy = false;
    }
  }

  handleRetrySync = async () => {
    this.syncActionBusy = true;
    try {
      await this.app.setupSession();
    } finally {
      this.syncActionBusy = false;
    }
  };

  private showSyncError() {
    this.messages.showNotification(
      this.intl.t('route.settings.sync.error'),
      'error',
    );
  }

  handleSignOut = () => {
    this.session.invalidate();
  };
}
