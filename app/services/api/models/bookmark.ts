import { Model } from './model';
import ApiService from 'potber-client/services/api';

export interface IBookmark {
  id: string;
  postId: string;
  newPostsCount: number;
  thread: {
    id: string;
    title: string;
    isClosed: boolean;
    pagesCount: number;
  };
  board: {
    id: string;
    name: string;
  };
}

export class Bookmark extends Model implements IBookmark {
  id!: string;
  postId!: string;
  newPostsCount!: number;
  thread!: {
    id: string;
    title: string;
    isClosed: boolean;
    pagesCount: number;
  };
  board!: {
    id: string;
    name: string;
  };

  constructor(init: IBookmark, api: ApiService) {
    super(api);
    Object.assign(this, init);
  }

  /**
   * Deletes the bookmark.
   */
  async delete(): Promise<void> {
    await this.api.deleteBookmark(this.id);
    super.delete();
  }
}
