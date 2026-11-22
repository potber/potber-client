import * as v from 'valibot';
import { boardSummarySchema } from './boards';

export const boardCategoriesSchema = v.array(
  v.object({
    id: v.string(),
    name: v.string(),
    description: v.optional(v.string(), ''),
    boards: v.array(boardSummarySchema),
  }),
);
