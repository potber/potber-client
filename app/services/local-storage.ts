import { action } from '@ember/object';
import Service, { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import MessagesService from './messages';
import { gt, valid } from 'semver';
import type Post from 'potber-client/models/post';
import type { PersistedSavedPost } from 'potber-client/components/features/bookmarks/saved-posts/post';
import { appConfig } from 'potber-client/config/app.config';
import { Boards } from './api/types';
import ApiService from './api';
import type { Settings } from './settings';
import type { Socials } from './socials';
import SettingsSyncService from './settings-sync';

const PREFIX = 'potber-';

export default class LocalStorageService extends Service {
  @service declare api: ApiService;
  @service declare messages: MessagesService;
  @service declare settingsSync: SettingsSyncService;

  @tracked boardFavorites: Boards.Read[] | null = [];
  @tracked savedPosts: Post[] | null = [];
  private savedPostsInitialized = false;

  async initialize() {
    await this.getBoardFavorites();
  }

  /**
   * Reads 'settings' from localStorage.
   * @returns The raw settings object or null.
   */
  readSettings(): Settings | null {
    try {
      const jsonString = localStorage.getItem(`${PREFIX}settings`);
      const rawSettings: Settings = JSON.parse(jsonString || '{}');
      return rawSettings;
    } catch (error) {
      // Return null in case of any issues during load.
      return null;
    }
  }

  /**
   * Writes 'settings' to localStorage.
   * @param settings The settings object.
   */
  writeSettings(settings: Settings) {
    const jsonString = JSON.stringify(settings);
    localStorage.setItem(`${PREFIX}settings`, jsonString);
  }

  /**
   * Reads 'socials' from localStorage.
   * @returns The raw socials object or null.
   */
  readSocials(): Socials | null {
    try {
      const jsonString = localStorage.getItem(`${PREFIX}socials`);
      if (!jsonString) return null;
      const rawSocials: Socials = JSON.parse(jsonString);
      return rawSocials;
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
    try {
      const ids = this.readBoardFavoriteIds();
      const boards = await Promise.all(
        ids.map((id) => this.api.findBoardById(id)),
      );
      this.boardFavorites = boards;
    } catch (error) {
      this.messages.log(
        `Error while attempting to fetch board-favorites: ${error}`,
        { type: 'error', context: this.constructor.name },
      );
      this.boardFavorites = null;
    }
    return this.boardFavorites;
  }

  /**
   * Saves the board favorite IDs to localStorage and triggers an async update of
   * the board favorites.
   */
  @action setBoardFavorites(ids: string[]) {
    // Remove duplicates
    const uniqueIds = [...new Set(ids)];
    this.writeBoardFavoriteIds(uniqueIds);
    this.settingsSync.boardFavoritesChanged(uniqueIds);
    this.messages.log(`${PREFIX}boardFavorites set to: '${uniqueIds}'.`, {
      context: this.constructor.name,
    });
    void this.getBoardFavorites();
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
      this.savedPostsInitialized = true;
      try {
        const persistedPosts = this.readPersistedSavedPosts();
        const posts = await Promise.all(
          persistedPosts.map((persistedPost) =>
            this.api.findPostById(persistedPost.id, persistedPost.threadId),
          ),
        );
        this.savedPosts = posts;
      } catch (error) {
        this.messages.log(
          `Error while attempting to fetch saved posts: ${error}`,
          { type: 'error', context: this.constructor.name },
        );
        this.savedPosts = null;
      }
    }
    return this.savedPosts;
  }

  /**
   * Saves the given posts to localStorage and updates the savedPosts property.
   * @param posts The posts to save.
   */
  @action setSavedPosts(posts: Post[]) {
    const keys: PersistedSavedPost[] = [];
    for (const post of posts) {
      keys.push({ id: post.id, threadId: post.threadId });
    }
    this.writePersistedSavedPosts(keys);
    this.settingsSync.savedPostsChanged(keys);
    this.messages.log(
      `${PREFIX}savedPosts set to: '${JSON.stringify(keys)}'.`,
      {
        context: this.constructor.name,
      },
    );
    this.savedPosts = [...posts];
  }

  readPersistedSavedPosts(): PersistedSavedPost[] {
    try {
      const value = localStorage.getItem(`${PREFIX}savedPosts`);
      if (!value) return [];
      const posts = JSON.parse(value) as unknown;
      if (!Array.isArray(posts)) return [];
      return posts.filter(
        (post): post is PersistedSavedPost =>
          Boolean(post) &&
          typeof post === 'object' &&
          typeof (post as PersistedSavedPost).id === 'string' &&
          typeof (post as PersistedSavedPost).threadId === 'string',
      );
    } catch {
      return [];
    }
  }

  applySyncedSavedPosts(posts: PersistedSavedPost[]) {
    this.writePersistedSavedPosts(posts);
    if (this.savedPostsInitialized) {
      void this.getSavedPosts({ reload: true });
    }
  }

  private writePersistedSavedPosts(posts: PersistedSavedPost[]) {
    localStorage.setItem(`${PREFIX}savedPosts`, JSON.stringify(posts));
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
