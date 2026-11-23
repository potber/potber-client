import * as v from 'valibot';

export const sessionSchema = v.object({
  userId: v.string(),
  username: v.string(),
  avatarUrl: v.optional(v.string()),
  cookie: v.string(),
  iat: v.number(),
  exp: v.number(),
});
