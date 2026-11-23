import * as v from 'valibot';
import { PrivateMessageFolder } from '../types/private-messages';

const participantSchema = v.object({
  id: v.string(),
  name: v.string(),
  avatarUrl: v.optional(v.string()),
});

export const privateMessageSchema = v.object({
  id: v.string(),
  title: v.string(),
  date: v.string(),
  folder: v.enum(PrivateMessageFolder),
  unread: v.boolean(),
  important: v.boolean(),
  recipient: v.optional(participantSchema),
  sender: v.optional(participantSchema),
  content: v.optional(v.string()),
});

export const privateMessageListSchema = v.array(privateMessageSchema);

export const privateMessageDraftSchema = v.object({
  title: v.string(),
  content: v.string(),
  recipientName: v.string(),
  saveCopy: v.optional(v.boolean()),
});
