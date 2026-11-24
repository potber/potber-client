import { action } from '@ember/object';
import Service, { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import MessagesService from './messages';
import { gt, valid } from 'semver';
import {
  persistedSavedPostSchema,
  type default as Post,
  type PersistedSavedPost,
} from 'potber-client/models/post';
import { appConfig } from 'potber-client/config/app.config';
import { Boards } from './api/types';
import ApiService from './api';
import {
  blockedUserSchema,
  type Socials,
} from 'potber-client/models/blocked-user';
import * as v from 'valibot';
import SettingsSyncService from './settings-sync';

const PREFIX = 'potber-';
const storedSocialsSchema = v.object({ blockedUsers: v.array(v.unknown()) });
const SAVED_POST_FETCH_CONCURRENCY = 4;

export default class LocalStorageService extends Service {
  @service declare api: ApiService;
  @service declare messages: MessagesService;
  @service declare settingsSync: SettingsSyncService;

  @tracked boardFavorites: Boards.Read[] | null = [];
  @tracked savedPosts: Post[] | null = [];
  private boardFavoritesLoad = 0;
  private savedPostsLoad = 0;

  async initialize() {
    await this.getBoardFavorites();
  }

  /**
   * Reads 'socials' from localStorage.
   * @returns The valid blocked users, or null if the record cannot be read.
   */
  readSocials(): Socials | null {
    try {
      const jsonString = localStorage.getItem(`${PREFIX}socials`);
      if (!jsonString) return null;
      const rawSocials: unknown = JSON.parse(jsonString);
      if (!v.is(storedSocialsSchema, rawSocials)) return null;
      return {
        blockedUsers: rawSocials.blockedUsers.filter((entry) =>
          v.is(blockedUserSchema, entry),
        ),
      };
    } catch (error) {
      // Return null in case of any issues during load.
      return null;
    }
  }

  /**
   * Writes 'socials' to localStorage.
   * @param socials The socials object.
   */
  writeSocials(socials: Socials) {
    const jsonString = JSON.stringify(socials);
    localStorage.setItem(`${PREFIX}socials`, jsonString);
  }

  /**
   * Gets the board favorite IDs from localStorage and triggers an async update of
   * the board favorites.
   * @returns {Promise<Board[]>} A promise of the board favorites.
   */
  @action async getBoardFavorites() {
    const load = ++this.boardFavoritesLoad;
    let boards: Boards.Read[] | null;
    try {
      const ids = this.readBoardFavoriteIds();
      boards = await Promise.all(ids.map((id) => this.api.findBoardById(id)));
    } catch (error) {
      this.messages.log(
        `Error while attempting to fetch board-favorites: ${error}`,
        { type: 'error', context: this.constructor.name },
      );
      boards = null;
    }
    if (load === this.boardFavoritesLoad) {
      this.boardFavorites = boards;
    }
    return this.boardFavorites;
  }

  addBoardFavorite(id: string) {
    return this.setBoardFavorites([...this.readBoardFavoriteIds(), id]);
  }

  removeBoardFavorite(id: string) {
    return this.setBoardFavorites(
      this.readBoardFavoriteIds().filter((favoriteId) => favoriteId !== id),
    );
  }

  private setBoardFavorites(ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    this.writeBoardFavoriteIds(uniqueIds);
    this.settingsSync.boardFavoritesChanged(uniqueIds);
    this.messages.log(`${PREFIX}boardFavorites set to: '${uniqueIds}'.`, {
      context: this.constructor.name,
    });
    return this.getBoardFavorites();
  }

  readBoardFavoriteIds(): string[] {
    const value = localStorage.getItem(`${PREFIX}boardFavorites`);
    return value ? value.split(',').filter(Boolean) : [];
  }

  applySyncedBoardFavorites(ids: string[]) {
    this.writeBoardFavoriteIds([...new Set(ids)]);
    void this.getBoardFavorites();
  }

  private writeBoardFavoriteIds(ids: string[]) {
    localStorage.setItem(`${PREFIX}boardFavorites`, ids.toString());
  }

  /**
   * Gets the saved posts from local storage and fetches their contents from the API.
   * @param options (optional) More options.
   * @returns The saved posts.
   */
  @action async getSavedPosts(options?: { reload?: boolean }) {
    if (!this.savedPosts || this.savedPosts.length === 0 || options?.reload) {
      const load = ++this.savedPostsLoad;
      let posts: Post[] | null = [];
      try {
        const persistedPosts = this.readPersistedSavedPosts();
        for (
          let start = 0;
          start < persistedPosts.length;
          start += SAVED_POST_FETCH_CONCURRENCY
        ) {
          const batch = persistedPosts.slice(
            start,
            start + SAVED_POST_FETCH_CONCURRENCY,
          );
          posts.push(
            ...(await Promise.all(
              batch.map((persistedPost) =>
                this.api.findPostById(persistedPost.id, persistedPost.threadId),
              ),
            )),
          );
        }
      } catch (error) {
        this.messages.log(
          `Error while attempting to fetch saved posts: ${error}`,
          { type: 'error', context: this.constructor.name },
        );
        posts = null;
      }
      if (load === this.savedPostsLoad) {
        this.savedPosts = posts;
      }
    }
    return this.savedPosts;
  }

  addSavedPost({ id, threadId }: PersistedSavedPost): boolean {
    const posts = this.readPersistedSavedPosts();
    if (posts.some((post) => post.id === id)) return false;

    this.changeSavedPosts([...posts, { id, threadId }]);
    return true;
  }

  removeSavedPost(id: string) {
    const posts = this.readPersistedSavedPosts();
    const remaining = posts.filter((post) => post.id !== id);
    if (remaining.length !== posts.length) this.changeSavedPosts(remaining);
  }

  private changeSavedPosts(posts: PersistedSavedPost[]) {
    this.persistSavedPosts(posts);
    this.settingsSync.savedPostsChanged(posts);
    this.messages.log(
      `${PREFIX}savedPosts set to: '${JSON.stringify(posts)}'.`,
      { context: this.constructor.name },
    );
  }

  readPersistedSavedPosts(): PersistedSavedPost[] {
    try {
      const value = localStorage.getItem(`${PREFIX}savedPosts`);
      if (!value) return [];
      const posts: unknown = JSON.parse(value);
      if (!Array.isArray(posts)) return [];
      return posts.filter((post: unknown) =>
        v.is(persistedSavedPostSchema, post),
      );
    } catch {
      return [];
    }
  }

  applySyncedSavedPosts(posts: PersistedSavedPost[]) {
    this.persistSavedPosts(posts);
  }

  private persistSavedPosts(posts: PersistedSavedPost[]) {
    localStorage.setItem(`${PREFIX}savedPosts`, JSON.stringify(posts));
    if (this.savedPostsLoad > 0) {
      void this.getSavedPosts({ reload: true });
    }
  }

  /**
   * Reads the last encountered valid app version from localStorage.
   */
  getEncounteredVersion(): string | undefined {
    const encounteredVersion = localStorage.getItem(
      `${PREFIX}lastEncountedVersion`,
    );
    return valid(encounteredVersion) ?? undefined;
  }

  /**
   * Stores a valid encountered app version without ever lowering the existing
   * version marker.
   */
  setEncounteredVersion(version = appConfig.version) {
    const normalizedVersion = valid(version);
    if (!normalizedVersion) return;

    const encounteredVersion = this.getEncounteredVersion();
    if (encounteredVersion && !gt(normalizedVersion, encounteredVersion)) {
      return;
    }

    localStorage.setItem(`${PREFIX}lastEncountedVersion`, normalizedVersion);
    this.messages.log(
      `${PREFIX}lastEncountedVersion set to: '${normalizedVersion}'.`,
      { context: this.constructor.name },
    );
  }
}
