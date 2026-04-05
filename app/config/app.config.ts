import environment from 'potber-client/config/environment';
import { clean } from 'semver';

const version = clean(environment.APP.version ?? '0.0.0') ?? '0.0.0';
const appsignalFrontendKey = String(
  window.APP?.APPSIGNAL_FRONTEND_KEY ??
    environment.APP['APPSIGNAL_FRONTEND_KEY'] ??
    '',
).trim();
const appsignalRevision = String(
  window.APP?.APPSIGNAL_REVISION ??
    environment.APP['APPSIGNAL_REVISION'] ??
    version,
).trim();

/**
 * Configuration object for the application.
 */
/**
 * Configuration object for the application.
 */
export const appConfig = {
  /**
   * The name of the application.
   */
  name: 'potber',
  /**
   * The current version of the application.
   */
  version,
  /**
   * The hostname of the application.
   */
  hostname: String(
    window.APP?.HOSTNAME ?? environment.APP['HOSTNAME'] ?? 'potber.de',
  ),
  /**
   * The API URL for the application.
   */
  apiUrl: String(
    window.APP?.API_URL ??
      environment.APP['API_URL'] ??
      'https://api.potber.de',
  ),
  /**
   * The URL for imgpot uploads.
   */
  imgpotUrl: String(
    window.APP?.IMGPOT_URL ??
      environment.APP['IMGPOT_URL'] ??
      'https://imgpot.de',
  ),
  /**
   * The URL for the meme host.
   */
  memeHostUrl: String(
    window.APP?.MEME_HOST_URL ??
      environment.APP['MEME_HOST_URL'] ??
      'https://potber.de',
  ),
  appsignal: {
    frontendKey: appsignalFrontendKey,
    revision: appsignalRevision || version,
    enabled: Boolean(appsignalFrontendKey),
  },
  /**
   * The URL for the forum.
   */
  forumUrl: 'https://forum.mods.de/',
  /**
   * The URL for the user page.
   */
  userPageUrl: 'https://my.mods.de/',
  /**
   * The start date and time of the Christmas season.
   */
  christmasSeasonStart: '12-01T00:00:00+01:00',
  /**
   * The end date and time of the Christmas season.
   */
  christmasSeasonEnd: '12-31T23:59:59+01:00',
  /**
   * The threshold for HTTP timeout warning in milliseconds.
   */
  httpTimeoutWarningThreshold: 5000,
  /**
   * The default user group id. Other group ids define mods, admins and the like.
   */
  standardUserGroupId: '3',
  /**
   * The refresh interval for the newsfeed in milliseconds.
   */
  newsfeedRefreshInterval: 20000,
};
