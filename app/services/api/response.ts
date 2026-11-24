import * as v from 'valibot';
import { ApiError, PayloadValidationError } from './error';

const errorResponseSchema = v.fallback(
  v.object({
    statusCode: v.fallback(v.optional(v.number()), undefined),
    error: v.fallback(v.optional(v.string()), undefined),
    message: v.fallback(
      v.optional(v.union([v.string(), v.array(v.string())])),
      undefined,
    ),
  }),
  {},
);

export async function decodeForumResponse<Schema extends v.GenericSchema>(
  response: Response,
  schema: Schema,
  path: string,
): Promise<v.InferOutput<Schema>> {
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined);
    const data = v.parse(errorResponseSchema, body);
    throw new ApiError(
      data.statusCode ?? response.status,
      data.error ?? response.statusText,
      data.message ?? response.statusText,
    );
  }
  const body = response.status === 204 ? '' : await response.text();
  const data: unknown = body === '' ? undefined : JSON.parse(body);
  return validatePayload(schema, data, path);
}

function validatePayload<Schema extends v.GenericSchema>(
  schema: Schema,
  data: unknown,
  path: string,
): v.InferOutput<Schema> {
  const result = v.safeParse(schema, data);
  if (result.success) return result.output;
  throw new PayloadValidationError(
    path,
    result.issues.map(
      // `received` can echo string values, so only use it to detect absent keys.
      (issue) =>
        `${v.getDotPath(issue) ?? '(root)'}: ${
          issue.received === 'undefined'
            ? 'missing'
            : `expected ${issue.expected ?? issue.kind}`
        }`,
    ),
  );
}
