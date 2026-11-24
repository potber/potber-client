import * as v from 'valibot';

export const blockedUserSchema = v.object({
  id: v.string(),
  name: v.string(),
});

export type BlockedUser = v.InferOutput<typeof blockedUserSchema>;

export interface Socials {
  blockedUsers: BlockedUser[];
}
