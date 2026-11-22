import * as v from 'valibot';
import { postPreviewSchema } from './posts';
import { threadReadSchema } from './threads';

export const boardReadSchema = v.object({
  id: v.string(),
  categoryId: v.string(),
  name: v.string(),
  description: v.optional(v.string(), ''),
  threadsCount: v.number(),
  repliesCount: v.number(),
  lastPost: v.optional(postPreviewSchema),
  page: v.object({
    number: v.number(),
    stickiesCount: v.number(),
    globalsCount: v.number(),
    threadsCount: v.number(),
    threads: v.array(threadReadSchema),
  }),
});
