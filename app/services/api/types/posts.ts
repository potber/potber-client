import { Users } from '.';

export type Author = Users.Read;

export interface Read {
  id: string;
  message: string;
  date: string;
  threadId: string;
  boardId: string;
  author: Users.Read;
  title?: string;
  icon?: string;
  avatarUrl?: string;
  editedCount?: number;
  lastEdit?: LastEdit;
  contentHidden?: boolean;
}

export interface LastEdit {
  user: Users.Read;
  date: string;
}

export interface Write {
  message: string;
  threadId: string;
  title?: string;
  icon?: string;
  convertUrls?: boolean;
  disableBbCode?: boolean;
  disableEmojis?: boolean;
}

export interface Quote {
  message: string;
}

export interface Report {
  cause: string;
}

export interface Preview {
  icon?: string;
  author: Users.Read;
  date: string;
  threadId: string;
  boardId: string;
}
