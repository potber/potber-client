import Service, { service } from '@ember/service';
import type IntlService from 'ember-intl/services/intl';
import * as Session from './api/endpoints/session.endpoints';
import * as Boards from './api/endpoints/boards.endpoints';
import * as BoardCategories from './api/endpoints/board-categories.endpoints';
import * as Threads from './api/endpoints/threads.endpoints';
import * as Users from './api/endpoints/users.endpoints';
import * as Posts from './api/endpoints/posts.endpoints';
import { ApiError } from './api/error';
import type * as v from 'valibot';
import type CustomSession from './custom-session';
import * as Bookmarks from './api/endpoints/bookmarks.endpoints';
import * as PrivateMessages from './api/endpoints/private-messages.endpoints';

import type ForumTransport from './forum-transport';
import type { ProtectedFetchOptions } from './forum-transport';

export type {
  FetchStatusNotification,
  PublicFetchOptions,
} from './forum-transport';

export default class ApiService extends Service {
  @service declare forumTransport: ForumTransport;
  @service declare intl: IntlService;
  @service declare session: CustomSession;

  // --- Endpoints are being defined in this section --- //
  getSession = Session._get;

  findUserById = Users.findById;
  findManyUsernames = Users.findManyUsernames;

  findBoardById = Boards._findById;
  findAllBoardCategories = BoardCategories._findAll;

  findThreadById = Threads._findById;
  createThread = Threads._create;

  findPostById = Posts.findById;
  createPost = Posts.create;
  updatePost = Posts.update;
  quotePost = Posts.quote;
  reportPost = Posts.report;

  findAllBookmarks = Bookmarks._findAll;
  findBookmarkByThreadId = Bookmarks._findByThreadId;
  createBookmark = Bookmarks._create;
  deleteBookmark = Bookmarks._delete;

  findManyPrivateMessages = PrivateMessages._findMany;
  findPrivateMessageById = PrivateMessages._findById;
  createPrivateMessage = PrivateMessages._create;
  deletePrivateMessage = PrivateMessages._delete;
  movePrivateMessageToFolder = PrivateMessages._moveToFolder;
  markPrivateMessageAsUnread = PrivateMessages._markAsUnread;
  replyToPrivateMessage = PrivateMessages._reply;
  forwardPrivateMessage = PrivateMessages._forward;

  // --------------------------------------------------- //

  fetch = async <Schema extends v.GenericSchema>(
    path: string,
    options: ProtectedFetchOptions<Schema>,
  ): Promise<v.InferOutput<Schema>> => {
    try {
      return await this.forumTransport.fetch(
        path,
        options,
        this.session.accessToken,
      );
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        await this.session.invalidate();
      }
      throw error;
    }
  };
}
