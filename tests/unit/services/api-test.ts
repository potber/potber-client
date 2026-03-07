import Service from '@ember/service';
import { module, test } from 'qunit';
import ApiService from 'potber-client/services/api';
import { ApiError } from 'potber-client/services/api/error';
import { setupTest } from 'potber-client/tests/helpers';

module('Unit | Service | Api', function (hooks) {
  setupTest(hooks);

  let originalFetch: typeof fetch;

  hooks.beforeEach(function () {
    originalFetch = window.fetch;
  });

  hooks.afterEach(function () {
    window.fetch = originalFetch;
  });

  test('serializes query params, preserves falsey values, and adds auth headers', async function (assert) {
    class MessagesStub extends Service {
      log(): void {
        return;
      }

      showNotification(): void {
        return;
      }
    }

    class IntlStub extends Service {
      t(key: string): string {
        return key;
      }
    }

    class SessionStub extends Service {
      isAuthenticated = true;
      data = {
        authenticated: {
          access_token: 'test-token',
        },
      };

      async invalidate(): Promise<void> {
        return;
      }
    }

    this.owner.register('service:messages', MessagesStub);
    this.owner.register('service:intl', IntlStub);
    this.owner.register('service:session', SessionStub);

    let capturedUrl = '';
    let capturedRequest: RequestInit | undefined;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedRequest = init;

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    };

    const api = this.owner.lookup('service:api') as ApiService;

    const result = await api.fetch('/test', {
      query: {
        flag: false,
        count: 0,
        search: 'value with spaces & symbols',
      },
    });

    assert.deepEqual(result, { ok: true });

    const url = new URL(capturedUrl);
    assert.strictEqual(url.searchParams.get('flag'), 'false');
    assert.strictEqual(url.searchParams.get('count'), '0');
    assert.strictEqual(
      url.searchParams.get('search'),
      'value with spaces & symbols',
    );
    assert.strictEqual(
      (capturedRequest?.headers as Record<string, string>)['Authorization'],
      'Bearer test-token',
    );
  });

  test('invalidates the session on 401 responses', async function (assert) {
    class MessagesStub extends Service {
      notifications: Array<{ message: string; type: string }> = [];

      log(): void {
        return;
      }

      showNotification(message: string, type: string): void {
        this.notifications.push({ message, type });
      }
    }

    class IntlStub extends Service {
      t(key: string): string {
        return key;
      }
    }

    class SessionStub extends Service {
      isAuthenticated = true;
      data = {
        authenticated: {
          access_token: 'test-token',
        },
      };
      invalidateCalls = 0;

      async invalidate(): Promise<void> {
        this.invalidateCalls += 1;
      }
    }

    this.owner.register('service:messages', MessagesStub);
    this.owner.register('service:intl', IntlStub);
    this.owner.register('service:session', SessionStub);

    window.fetch = async () => {
      return new Response(
        JSON.stringify({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Unauthorized',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    };

    const api = this.owner.lookup('service:api') as ApiService;
    const session = this.owner.lookup('service:session') as SessionStub;
    const messages = this.owner.lookup('service:messages') as MessagesStub;

    await assert.rejects(api.fetch('/test'), (error: unknown) => {
      return error instanceof ApiError && error.statusCode === 401;
    });

    assert.strictEqual(session.invalidateCalls, 1);
    assert.deepEqual(messages.notifications, []);
  });
});
