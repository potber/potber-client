import Service, { service } from '@ember/service';
import type CustomSession from './custom-session';
import type DeviceManagerService from './device-manager';
import type LocalStorageService from './local-storage';
import type NewsfeedService from './newsfeed';
import type RendererService from './renderer';
import type SettingsService from './settings';
import type { Settings } from './settings';
import type SettingsSyncService from './settings-sync';
import type { SyncedCollections } from './settings-sync';
import type SocialsService from './socials';

export default class SessionSetupService extends Service {
  @service declare session: CustomSession;
  @service declare settings: SettingsService;
  @service declare settingsSync: SettingsSyncService;
  @service declare socials: SocialsService;
  @service declare localStorage: LocalStorageService;
  @service declare renderer: RendererService;
  @service declare deviceManager: DeviceManagerService;
  @service declare newsfeed: NewsfeedService;

  async setup() {
    await this.session.setup();
    if (!this.session.isAuthenticated) return;

    await this.session.update();
    const session = this.session.sessionData;
    const accessToken = this.session.data.authenticated.access_token;
    const socials = this.socials.load();
    if (session && accessToken) {
      const syncedSettings = await this.settingsSync.initialize(
        this.settings.getSettings(),
        { userId: session.userId, accessToken },
        this.applySyncedSettings,
        {
          blockedUsers: socials.blockedUsers,
          boardFavoriteIds: this.localStorage.readBoardFavoriteIds(),
          savedPosts: this.localStorage.readPersistedSavedPosts(),
        },
        this.applySyncedCollections,
      );
      this.applySyncedSettings(syncedSettings);
    }
    void this.localStorage.initialize();
    this.newsfeed.refresh();
  }

  private applySyncedSettings = (settings: Settings) => {
    this.settings.replaceSettings(settings);
    this.renderer.updateTheme();
    this.renderer.updateSidebarLayout();
    this.renderer.updateFontSize();
    this.deviceManager.toggleGesturesSupport();
    this.settings.toggleDebugMode(this.settings.getSetting('debug'));
  };

  private applySyncedCollections = (collections: SyncedCollections) => {
    this.socials.applySyncedBlockedUsers(collections.blockedUsers);
    this.localStorage.applySyncedBoardFavorites(collections.boardFavoriteIds);
    this.localStorage.applySyncedSavedPosts(collections.savedPosts);
  };
}
