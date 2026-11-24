import * as v from 'valibot';
import {
  AvatarStyle,
  FontSize,
  Gestures,
  LandingPage,
  SidebarLayout,
  Theme,
  Transitions,
  type Settings,
} from './types';

const settingsSchema = v.object({
  avatarStyle: v.fallback(v.enum(AvatarStyle), AvatarStyle.small),
  theme: v.fallback(v.enum(Theme), Theme.default),
  landingPage: v.fallback(v.enum(LandingPage), LandingPage.boardOverview),
  autoRefreshSidebar: v.fallback(v.boolean(), true),
  sidebarLayout: v.fallback(v.enum(SidebarLayout), SidebarLayout.leftTop),
  fontSize: v.fallback(v.enum(FontSize), FontSize.medium),
  collapseQuotes: v.fallback(v.boolean(), false),
  replaceForumUrls: v.fallback(v.boolean(), true),
  darkenReadPosts: v.fallback(v.boolean(), false),
  hideGlobalAndAnnouncementThreads: v.fallback(v.boolean(), false),
  goToBottomOfThreadPage: v.fallback(v.boolean(), true),
  transitions: v.fallback(v.enum(Transitions), Transitions.static),
  gestures: v.fallback(v.enum(Gestures), Gestures.none),
  debug: v.fallback(v.boolean(), false),
});

export function normalizeSettings(input: unknown): Settings {
  const result = v.safeParse(settingsSchema, input);
  return result.success ? result.output : v.parse(settingsSchema, {});
}
