import * as v from 'valibot';

export const userReadSchema = v.object({
  id: v.string(),
  name: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  rank: v.optional(v.string()),
  lastLogin: v.optional(v.string()),
  activity: v.optional(v.string()),
  status: v.optional(v.string()),
  age: v.optional(v.string()),
  groupId: v.optional(v.string()),
  locked: v.optional(v.boolean()),
});

export const usernameListSchema = v.array(v.string());
