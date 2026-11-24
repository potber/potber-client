import {
  AvatarStyle,
  FontSize,
  Gestures,
  LandingPage,
  SidebarLayout,
  Theme,
} from 'potber-client/services/settings';
import type { Settings } from 'potber-client/services/settings';
import type { DropdownOption } from 'potber-client/components/common/control/dropdown/types';

type SettingsOptions = {
  [Key in keyof Settings as `${Key}Options`]: Array<{
    label: string;
    data: Settings[Key];
  }>;
};

export const settingsConfig: SettingsOptions = {
  avatarStyleOptions: [
    {
      label: 'An',
      data: AvatarStyle.small,
    },
    {
      label: 'Aus',
      data: AvatarStyle.none,
    },
  ],

  sidebarLayoutOptions: [
    {
      label: 'Links (oben)',
      data: SidebarLayout.leftTop,
    },
    {
      label: 'Links (unten)',
      data: SidebarLayout.leftBottom,
    },
    {
      label: 'Rechts (oben)',
      data: SidebarLayout.rightTop,
    },
    {
      label: 'Rechts (unten)',
      data: SidebarLayout.rightBottom,
    },
  ],

  themeOptions: [
    {
      label: 'potber',
      data: Theme.default,
    },
    {
      label: 'mods.de',
      data: Theme['mods'],
    },
    {
      label: 'Schneemann',
      data: Theme.snowman,
    },
    {
      label: 'Discord',
      data: Theme['discord'],
    },
    {
      label: 'Purple Haze',
      data: Theme['purple-haze'],
    },
    {
      label: 'Tokyo Night',
      data: Theme['tokyo-night'],
    },
    {
      label: 'poppx',
      data: Theme.poppx,
    },
  ],

  fontSizeOptions: [
    {
      label: 'Sehr klein',
      data: FontSize.xSmall,
    },
    {
      label: 'Klein',
      data: FontSize.small,
    },
    {
      label: 'Normal',
      data: FontSize.medium,
    },
    {
      label: 'Groß',
      data: FontSize.large,
    },
  ],

  darkenReadPostsOptions: [
    {
      label: 'Ja',
      data: true,
    },
    {
      label: 'Nein',
      data: false,
    },
  ],

  hideGlobalAndAnnouncementThreadsOptions: [
    {
      label: 'Anzeigen',
      data: false,
    },
    { label: 'Ausblenden', data: true },
  ],

  collapseQuotesOptions: [
    {
      label: 'An',
      data: true,
    },
    {
      label: 'Aus',
      data: false,
    },
  ],

  goToBottomOfThreadPageOptions: [
    {
      label: 'Zum Seitenende springen',
      data: true,
    },
    { label: 'Auf Seitenanfang bleiben', data: false },
  ],

  landingPageOptions: [
    {
      label: 'Forenübersicht',
      data: LandingPage.boardOverview,
    },
    {
      label: 'Home',
      data: LandingPage.home,
    },
    {
      label: 'Public Offtopic',
      data: LandingPage.pot,
    },
  ],

  autoRefreshSidebarOptions: [
    {
      label: 'An',
      data: true,
    },
    {
      label: 'Aus',
      data: false,
    },
  ],

  replaceForumUrlsOptions: [
    {
      label: 'Ja',
      data: true,
    },
    {
      label: 'Nein',
      data: false,
    },
  ],

  transitionsOptions: [
    {
      label: 'Dynamisch',
      data: 'dynamic',
    },
    {
      label: 'Statisch',
      data: 'static',
    },
  ],

  gesturesOptions: [
    {
      label: 'Alle',
      data: Gestures.all,
    },
    {
      label: 'Nur Sidebar',
      data: Gestures.onlySidebar,
    },
    {
      label: 'Aus',
      data: Gestures.none,
    },
  ],

  debugOptions: [
    {
      label: 'An',
      data: true,
    },
    {
      label: 'Aus',
      data: false,
    },
  ],
};

export type CurrentSettingOptions = {
  [Key in keyof Settings as `current${Capitalize<Key>}Option`]: DropdownOption<
    Settings[Key]
  >;
};

export function getCurrentSettingOptions(
  settings: Settings,
): CurrentSettingOptions {
  // Object.entries loses the pairing between each key and its option type, so the record
  // is built untyped and checked against CurrentSettingOptions on return.
  const result: Record<string, DropdownOption | undefined> = {};

  for (const [optionsKey, options] of Object.entries(settingsConfig)) {
    const settingKey = optionsKey.replace('Options', '') as keyof Settings;
    const currentOptionKey = `current${optionsKey.charAt(0).toUpperCase()}${optionsKey.slice(1, -1)}`;
    result[currentOptionKey] = options.find(
      (option) => option.data === settings[settingKey],
    );
  }

  return result as CurrentSettingOptions;
}
