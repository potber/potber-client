import * as v from 'valibot';

export const bookmarkSchema = v.object({
  id: v.string(),
  postId: v.string(),
  newPostsCount: v.number(),
  thread: v.object({
    id: v.string(),
    title: v.string(),
    isClosed: v.boolean(),
    pagesCount: v.number(),
  }),
  board: v.object({
    id: v.string(),
    name: v.string(),
  }),
});

export const bookmarkListSchema = v.array(bookmarkSchema);
