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

export function collectionsToValues(
  collections: SyncedCollections,
): Record<string, unknown> {
  return {
    [BLOCKED_USERS_FIELD]: collections.blockedUsers,
    [BOARD_FAVORITES_FIELD]: collections.boardFavoriteIds,
    [SAVED_POSTS_FIELD]: collections.savedPosts,
  };
}

export function emptyCollections(): SyncedCollections {
  return { blockedUsers: [], boardFavoriteIds: [], savedPosts: [] };
}

export function cloneCollections(
  collections: SyncedCollections,
): SyncedCollections {
  return {
    blockedUsers: collections.blockedUsers.map((user) => ({ ...user })),
    boardFavoriteIds: [...collections.boardFavoriteIds],
    savedPosts: collections.savedPosts.map((post) => ({ ...post })),
  };
}
