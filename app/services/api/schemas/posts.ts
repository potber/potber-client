import * as v from 'valibot';
import { userReadSchema } from './users';

export const postReadSchema = v.object({
  id: v.string(),
  message: v.optional(v.string()),
  date: v.string(),
  threadId: v.string(),
  boardId: v.string(),
  author: userReadSchema,
  title: v.optional(v.string()),
  icon: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  // The API serializes a missing edit count (`NaN`) as `null`.
  editedCount: v.optional(
    v.pipe(
      v.nullable(v.number()),
      v.transform((count) => count ?? undefined),
    ),
  ),
  lastEdit: v.optional(v.object({ user: userReadSchema, date: v.string() })),
  contentHidden: v.optional(v.boolean()),
});

export const postPreviewSchema = v.object({
  icon: v.optional(v.string()),
  author: userReadSchema,
  date: v.string(),
  threadId: v.string(),
  boardId: v.string(),
});
