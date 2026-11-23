import ApiService from 'potber-client/services/api';
import type { PublicFetchOptions } from 'potber-client/services/api';
import { sessionSchema } from '../schemas/session';
import type { Session } from '../types/session';
/**
 * Returns the current session.
 */
export async function _get(
  this: ApiService,
  options?: PublicFetchOptions,
): Promise<Session> {
  return this.fetch(`auth/session`, {
    ...options,
    schema: sessionSchema,
    statusNotifications: [
      {
        statusCode: '*',
        message: this.intl.t('error.unknown'),
      },
    ],
    request: { method: 'GET' },
  });
}
