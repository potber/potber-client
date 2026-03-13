import { appConfig } from 'potber-client/config/app.config';

/**
 * Retrieves the value of a URL parameter.
 * @param key - The key of the URL parameter.
 * @returns The value of the URL parameter, or null if it doesn't exist.
 */
export function getUrlParameter(key: string) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(key);
}

/**
 * Turns the given unix timestamp into a Date object.
 * @param timestamp The unix timestamp.
 * @returns The Date object.
 */
export function getDateFromUnixTimestamp(timestamp: string) {
  return new Date(parseInt(timestamp) * 1000);
}

/**
 * Returns a promise that resolves after the given amount of miliseconds.
 * @param ms The amount of miliseconds.
 */
export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Debounces the given callback function, which means it's being called after the given delay, but only once per usecase.
 * Every call will reset the delay timer.
 * @param callback The callback function.
 * @param delay The delay in miliseconds.
 */
export function debounce<TArgs extends unknown[], TReturn>(
  callback: (...args: TArgs) => PromiseLike<TReturn> | TReturn,
  delay: number,
) {
  let timer: number;

  return (...args: TArgs): Promise<TReturn> => {
    clearTimeout(timer);
    return new Promise((resolve) => {
      timer = setTimeout(() => resolve(callback(...args)), delay);
    });
  };
}

/**
 * Determins whether it currently is christmas season. Used for showing christmas icons and emojis.
 */
export function isChristmasSeason() {
  const { christmasSeasonStart, christmasSeasonEnd } = appConfig;
  const now = new Date();
  const christmasSeasonStartDate = new Date(
    `${now.getFullYear()}-${christmasSeasonStart}`,
  );
  const christmasSeasonEndDate = new Date(
    `${now.getFullYear()}-${christmasSeasonEnd}`,
  );
  return now > christmasSeasonStartDate && now < christmasSeasonEndDate;
}

/**
 * Tries to parse the input as an integer.
 * @param input - The value to parse.
 * @returns The parsed integer value, or NaN if parsing fails.
 */
export function tryParseInt(input: any) {
  return parseInt(input);
}

/**
 * Checks if the given string is null, empty or only contains whitespace.
 * @param input The string to check.
 * @returns Whether the string is null, empty or only contains whitespace.
 */
export function isNullOrWhitespace(input: string) {
  return input === null || input.match(/^\s*$/) !== null;
}

/**
 * Returns the ID of the corresponding HTML anchor element for the given post.
 * @param postId The post id.
 */
export function getAnchorId(postId: string) {
  return `post-${postId}`;
}

/**
 * Returns the legacy forum.mods.de-style reply anchor id for the given post.
 * @param postId The post id.
 */
export function getLegacyReplyAnchorId(postId: string) {
  return `reply_${postId}`;
}

/**
 * Extracts a post id from a supported thread hash.
 * Supports both potber's "#post-<id>" and forum.mods.de's "#reply_<id>".
 * @param hash The URL hash.
 */
export function getPostIdFromHash(hash: string) {
  return hash.match(/^#(?:post-|reply_)(\d+)$/)?.[1] ?? null;
}

export type ThreadScrollTarget =
  | {
      type: 'post';
      postId: string;
    }
  | {
      type: 'bottom';
    }
  | {
      type: 'top';
    };

/**
 * Determines where the thread page should initially scroll to.
 */
export function getThreadScrollTarget({
  search,
  hash,
  currentRouteName,
  goToBottomOfThreadPage,
}: {
  search: string;
  hash: string;
  currentRouteName: string | null;
  goToBottomOfThreadPage: boolean;
}): ThreadScrollTarget {
  const params = new URLSearchParams(search);
  const postId = params.get('PID') ?? getPostIdFromHash(hash);

  if (postId && currentRouteName === 'authenticated.thread') {
    return {
      type: 'post',
      postId,
    };
  }

  if (params.has('scrollToBottom') && goToBottomOfThreadPage) {
    return {
      type: 'bottom',
    };
  }

  return {
    type: 'top',
  };
}
