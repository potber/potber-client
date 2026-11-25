import type ApiService from 'potber-client/services/api';
import type { PublicFetchOptions } from '../../forum-transport';
import { sessionSchema } from '../schemas/session';
import type IntlService from 'ember-intl/services/intl';
import type { Session } from '../types/session';

export const sessionPath = 'auth/session';

export function sessionRequest(
  intl: IntlService,
  options?: PublicFetchOptions,
) {
  return {
    ...options,
    schema: sessionSchema,
    statusNotifications: [
      {
        statusCode: '*' as const,
        message: intl.t('error.unknown'),
      },
    ],
    request: { method: 'GET' },
  };
}

/**
 * Returns the current session.
 */
export async function _get(
  this: ApiService,
  options?: PublicFetchOptions,
): Promise<Session> {
  return this.fetch(sessionPath, sessionRequest(this.intl, options));
}
