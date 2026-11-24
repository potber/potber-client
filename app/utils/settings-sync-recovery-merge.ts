import {
  persistedSavedPostSchema,
  type PersistedSavedPost,
} from 'potber-client/models/post';
import * as v from 'valibot';
import {
  blockedUserSchema,
  type BlockedUser,
} from 'potber-client/models/blocked-user';

const blockedUsersSchema = v.array(blockedUserSchema);
const savedPostsSchema = v.array(persistedSavedPostSchema);
const boardFavoriteIdsSchema = v.array(v.string());

export const BLOCKED_USERS_FIELD = 'blockedUsers';
export const BOARD_FAVORITES_FIELD = 'boardFavoriteIds';
export const SAVED_POSTS_FIELD = 'savedPosts';

export type SettingsSyncUnlockSource = 'local' | 'remote';

export interface SyncedCollections {
  blockedUsers: BlockedUser[];
  boardFavoriteIds: string[];
  savedPosts: PersistedSavedPost[];
}

export function collectionsFromValues(
  values: Record<string, unknown>,
): SyncedCollections {
  const blockedUsers = values[BLOCKED_USERS_FIELD];
  const boardFavoriteIds = values[BOARD_FAVORITES_FIELD];
  const savedPosts = values[SAVED_POSTS_FIELD];
  if (!v.is(blockedUsersSchema, blockedUsers)) {
    throw new Error('Invalid encrypted blocklist.');
  }
  if (!v.is(boardFavoriteIdsSchema, boardFavoriteIds)) {
    throw new Error('Invalid encrypted board favorites.');
  }
  if (!v.is(savedPostsSchema, savedPosts)) {
    throw new Error('Invalid encrypted saved posts.');
  }
  return { blockedUsers, boardFavoriteIds, savedPosts };
}

export function mergeUnlockValues(
  source: SettingsSyncUnlockSource,
  localValues: Record<string, unknown>,
  remoteValues: Record<string, unknown>,
) {
  const primary = source === 'local' ? localValues : remoteValues;
  const secondary = source === 'local' ? remoteValues : localValues;
  const primaryCollections = collectionsFromValues(primary);
  const secondaryCollections = collectionsFromValues(secondary);

  return {
    ...primary,
    [BLOCKED_USERS_FIELD]: unionById(
      primaryCollections.blockedUsers,
      secondaryCollections.blockedUsers,
    ),
    [BOARD_FAVORITES_FIELD]: unionBy(
      primaryCollections.boardFavoriteIds,
      secondaryCollections.boardFavoriteIds,
      (id) => id,
    ),
    [SAVED_POSTS_FIELD]: unionById(
      primaryCollections.savedPosts,
      secondaryCollections.savedPosts,
    ),
  };
}

function unionById<T extends { id: string }>(primary: T[], secondary: T[]) {
  return unionBy(primary, secondary, ({ id }) => id);
}

function unionBy<T>(
  primary: T[],
  secondary: T[],
  identity: (value: T) => string,
) {
  const ids = new Set(primary.map(identity));
  return [
    ...primary,
    ...secondary.filter((value) => {
      const id = identity(value);
      if (ids.has(id)) return false;
      ids.add(id);
      return true;
    }),
  ];
}

export function syncedValuesDiffer(
  localValues: Record<string, unknown>,
  remoteValues: Record<string, unknown>,
) {
  const localKeys = Object.keys(localValues);
  const remoteKeys = Object.keys(remoteValues);
  return (
    localKeys.length !== remoteKeys.length ||
    localKeys.some(
      (fieldKey) =>
        !jsonValuesEqual(localValues[fieldKey], remoteValues[fieldKey]),
    )
  );
}

function jsonValuesEqual(first: unknown, second: unknown): boolean {
  if (Object.is(first, second)) return true;
  if (Array.isArray(first) || Array.isArray(second)) {
    return arraysEqual(first, second);
  }
  if (
    !first ||
    !second ||
    typeof first !== 'object' ||
    typeof second !== 'object'
  ) {
    return false;
  }

  const firstRecord = first as Record<string, unknown>;
  const secondRecord = second as Record<string, unknown>;
  const firstKeys = Object.keys(firstRecord);
  const secondKeys = Object.keys(secondRecord);
  return (
    firstKeys.length === secondKeys.length &&
    firstKeys.every(
      (key) =>
        Object.hasOwn(secondRecord, key) &&
        jsonValuesEqual(firstRecord[key], secondRecord[key]),
    )
  );
}

function arraysEqual(first: unknown, second: unknown): boolean {
  return (
    Array.isArray(first) &&
    Array.isArray(second) &&
    first.length === second.length &&
    first.every((entry, index) => jsonValuesEqual(entry, second[index]))
  );
}
