import Service, { service } from '@ember/service';
import { waitForPromise } from '@ember/test-waiters';
import { appConfig } from 'potber-client/config/app.config';
import type IntlService from 'ember-intl/services/intl';
import type * as v from 'valibot';
import type MessagesService from './messages';
import type { MessageType } from './messages';
import { ApiError } from './api/error';
import { decodeForumResponse } from './api/response';

export interface FetchStatusNotification {
  /**
   * The status code that will trigger the notification. A wildcard will be used
   * as a fallback for all unhandled status codes >= 400 and unknown errors.
   */
  statusCode: number | '*';
  /**
   * The notification message.
   */
  message: string;
  /**
   * The notification type. Defaults to 'error'.
   */
  type?: MessageType;
}

export interface PublicFetchOptions {
  /**
   * Whether the user should be warned about the request taking a long time.
   */
  timeoutWarning?: boolean;
  /**
   * Contains notifications that will be shown to the user in case of specific status codes.
   */
  statusNotifications?: FetchStatusNotification[];
  /**
   * Whether the request should be handled silently (and now show any notifications).
   */
  silent?: boolean;
  /**
   * An optional object that will be parsed as query parameters.
   */
  query?: Record<string, string | boolean | number>;
}

export interface ProtectedFetchOptions<
  Schema extends v.GenericSchema,
> extends PublicFetchOptions {
  /**
   * The `RequestInit` object.
   */
  request?: RequestInit;
  /**
   * Validates a successful response body. Mismatches use the same error handling as failed requests.
   */
  schema: Schema;
}

export default class ForumTransport extends Service {
  @service declare messages: MessagesService;
  @service declare intl: IntlService;

  /**
   * Triggers a `fetch` to the API server and returns the data. Any errors will be logged automatically.
   * Tests' `settled()` waits for the request, so it cannot outlive the test that started it.
   * @returns The data.
   */
  fetch = <Schema extends v.GenericSchema>(
    path: string,
    options: ProtectedFetchOptions<Schema>,
    accessToken: string | undefined,
  ): Promise<v.InferOutput<Schema>> =>
    waitForPromise(this.request(path, options, accessToken));

  private async request<Schema extends v.GenericSchema>(
    path: string,
    options: ProtectedFetchOptions<Schema>,
    accessToken: string | undefined,
  ): Promise<v.InferOutput<Schema>> {
    const { request, query, timeoutWarning, schema } = {
      timeoutWarning: false,
      ...options,
    };
    if (!path.startsWith('/')) path = `/${path}`;
    const url = new URL(path, appConfig.apiUrl);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        url.searchParams.set(key, String(value));
      });
    }
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    this.messages.log(
      `Outgoing request: ${request?.method ?? 'GET'} ${url.toString()}`,
      {
        context: 'ApiService',
        type: 'info',
      },
    );
    // The forum can take a long time to respond. We want to warn the user if that happens.
    const timeoutId = window.setTimeout(() => {
      if (timeoutWarning) {
        this.messages.showNotification(
          this.intl.t('error.timeout.warning'),
          'warning',
        );
      }
    }, appConfig.httpTimeoutWarningThreshold);
    const timeoutSignal = AbortSignal.timeout(appConfig.httpTimeoutThreshold);
    const signal = request?.signal
      ? AbortSignal.any([request.signal, timeoutSignal])
      : timeoutSignal;
    try {
      const response = await fetch(url.toString(), {
        ...request,
        headers: { ...headers, ...request?.headers },
        signal,
      });
      return await decodeForumResponse(response, schema, path);
    } catch (error: unknown) {
      this.handleErrors(error, options);
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  private handleErrors(error: unknown, options?: PublicFetchOptions) {
    const { statusNotifications, silent } = {
      statusNotifications: [
        {
          statusCode: '*',
          type: 'error',
          message: this.intl.t('error.unknown'),
        },
      ] as FetchStatusNotification[],
      silent: false,
      ...options,
    };

    this.messages.log(JSON.stringify(error), {
      context: 'ApiService',
      type: 'error',
    });
    if (silent) return;

    let notification: FetchStatusNotification | undefined;
    if (error instanceof ApiError) {
      if (error.statusCode === 401) return;
      notification = statusNotifications.find(
        (candidate) => candidate.statusCode === error.statusCode,
      );
    }

    notification ??= statusNotifications.find(
      (candidate) => candidate.statusCode === '*',
    );
    if (notification) {
      this.messages.showNotification(
        notification.message,
        notification.type ?? 'error',
      );
    }
  }
}
