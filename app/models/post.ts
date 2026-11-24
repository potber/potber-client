import * as v from 'valibot';
import type { Posts } from 'potber-client/services/api/types';

export const persistedSavedPostSchema = v.object({
  id: v.string(),
  threadId: v.string(),
});

export type PersistedSavedPost = v.InferOutput<typeof persistedSavedPostSchema>;

type Post = Posts.Read;
type LastEdit = Posts.LastEdit;
type PostPreview = Posts.Preview;
type PostQuote = Posts.Quote;
type PostReport = Posts.Report;

export type { Post as default, LastEdit, PostPreview, PostQuote, PostReport };
