import SettingsStorageService from 'potber-client/services/settings-storage';
import SettingsService, {
  AvatarStyle,
  FontSize,
  Gestures,
  LandingPage,
  SidebarLayout,
  Theme,
  Transitions,
} from 'potber-client/services/settings';
import type { Settings } from 'potber-client/services/settings';
import { setupTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

const mockedSettings: Settings = {
  avatarStyle: AvatarStyle.small,
  theme: Theme.default,
  landingPage: LandingPage.pot,
  autoRefreshSidebar: false,
  sidebarLayout: SidebarLayout.leftTop,
  fontSize: FontSize.medium,
  collapseQuotes: true,
  replaceForumUrls: true,
  darkenReadPosts: false,
  hideGlobalAndAnnouncementThreads: false,
  goToBottomOfThreadPage: true,
  transitions: Transitions.static,
  gestures: Gestures.none,
  debug: false,
};

module('Unit | Service | Settings', function (hooks) {
  setupTest(hooks);

  test('Loads settings.', function (assert) {
    // Stub the settings storage service
    class SettingsStorageStub extends SettingsStorageService {
      read(): Settings | null {
        return { ...mockedSettings };
      }
    }
    this.owner.register('service:settings-storage', SettingsStorageStub);

    const settings = this.owner.lookup(
      'service:settings',
    ) as unknown as SettingsService;

    const actual = settings.getSettings();
    const expected: Settings = { ...settings.default, ...mockedSettings };
    assert.deepEqual(actual, expected);
  });

  test('Resorts to using default values in case of empty or corrupt storage.', function (assert) {
    class SettingsStorageStub extends SettingsStorageService {
      read(): Settings | null {
        return null;
      }
    }
    this.owner.register('service:settings-storage', SettingsStorageStub);

    const settings = this.owner.lookup(
      'service:settings',
    ) as unknown as SettingsService;

    const actual = settings.getSettings();
    const expected: Settings = { ...settings.default };
    assert.deepEqual(actual, expected);
  });

  test('keeps valid stored fields and defaults missing or malformed ones', function (assert) {
    class SettingsStorageStub extends SettingsStorageService {
      read() {
        return {
          theme: Theme['tokyo-night'],
          replaceForumUrls: false,
          landingPage: 'home',
          autoRefreshSidebar: 'false',
        };
      }
    }
    this.owner.register('service:settings-storage', SettingsStorageStub);
    const settings = this.owner.lookup('service:settings') as SettingsService;

    assert.deepEqual(settings.getSettings(), {
      ...settings.default,
      theme: Theme['tokyo-night'],
      replaceForumUrls: false,
    });
  });

  test('Saves the active settings to localStorage', function (assert) {
    assert.expect(1);

    const actual = { ...mockedSettings };

    class SettingsStorageStub extends SettingsStorageService {
      read(): Settings | null {
        return { ...mockedSettings };
      }

      write(settings: Settings) {
        assert.deepEqual(settings, actual);
      }
    }
    this.owner.register('service:settings-storage', SettingsStorageStub);

    const settings = this.owner.lookup(
      'service:settings',
    ) as unknown as SettingsService;

    settings.save();
  });
});
