import * as v from 'valibot';
import { postPreviewSchema, postReadSchema } from './posts';

export const threadReadSchema = v.object({
  id: v.string(),
  title: v.string(),
  subtitle: v.optional(v.string()),
  boardId: v.string(),
  repliesCount: v.number(),
  hitsCount: v.number(),
  pagesCount: v.number(),
  isClosed: v.boolean(),
  isSticky: v.boolean(),
  isImportant: v.boolean(),
  isAnnouncement: v.boolean(),
  isGlobal: v.boolean(),
  firstPost: v.optional(postPreviewSchema),
  lastPost: v.optional(postPreviewSchema),
  page: v.optional(
    v.object({
      number: v.number(),
      postCount: v.number(),
      offset: v.number(),
      posts: v.array(postReadSchema),
    }),
  ),
});
