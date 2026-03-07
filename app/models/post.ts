import type { Posts } from 'potber-client/services/api/types';

type Post = Posts.Read;
type LastEdit = Posts.LastEdit;
type PostPreview = Posts.Preview;
type PostQuote = Posts.Quote;
type PostReport = Posts.Report;

export type { Post as default, LastEdit, PostPreview, PostQuote, PostReport };
