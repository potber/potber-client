import type Post from './post';
import type { PostPreview } from './post';
import type { Threads } from 'potber-client/services/api/types';

export default interface Thread extends Omit<Threads.Read, 'page'> {
  firstPost?: PostPreview;
  lastPost?: PostPreview;
  page?: ThreadPage;
}

export interface ThreadPage {
  number: number;
  postCount: number;
  offset: number;
  posts: Post[];
}
