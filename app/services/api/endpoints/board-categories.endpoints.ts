import ApiService from 'potber-client/services/api';
import type { PublicFetchOptions } from 'potber-client/services/api';
import { BoardCategories } from '../types';

/**
 * Finds and returns all board categories.
 */
export async function _findAll(
  this: ApiService,
  options?: PublicFetchOptions,
): Promise<BoardCategories.Read[]> {
  return this.fetch(`boardCategories`, {
    ...options,
    statusNotifications: [
      {
        statusCode: '*',
        message: this.intl.t('error.unknown'),
      },
    ],
    request: { method: 'GET' },
  });
}
