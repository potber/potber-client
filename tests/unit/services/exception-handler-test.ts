import Service from '@ember/service';
import { Exception } from 'potber-client/exceptions';
import type ExceptionHandler from 'potber-client/services/exception-handler';
import { setupTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Service | Exception handler', function (hooks) {
  setupTest(hooks);

  let handler: ExceptionHandler;
  let logs: unknown[];

  hooks.beforeEach(function () {
    logs = [];

    class MessagesStub extends Service {
      log(message: string, options: object) {
        logs.push({ message, options });
      }
    }

    this.owner.register('service:messages', MessagesStub);
    handler = this.owner.lookup(
      'service:exception-handler',
    ) as ExceptionHandler;
  });

  test('installs its handler for browser errors', function (assert) {
    const previous = window.onerror;

    try {
      handler.initialize();
      assert.strictEqual(window.onerror, handler.handleError);
    } finally {
      window.onerror = previous;
    }
  });

  test('logs a handled application exception with its source', function (assert) {
    handler.handleError(
      'Error',
      '/thread.js',
      1,
      1,
      new Exception('Post unavailable'),
    );

    assert.deepEqual(logs, [
      {
        message: 'Post unavailable',
        options: { type: 'error', context: '/thread.js' },
      },
    ]);
  });

  test('keeps an application exception that opts out of handling out of the log', function (assert) {
    const exception = new Exception('Unexpected exception');
    exception.catchMe = false;

    handler.handleError('Error', '/thread.js', 1, 1, exception);

    assert.deepEqual(logs, []);
  });

  test('keeps ordinary browser errors out of the application log', function (assert) {
    handler.handleError(
      'Error',
      '/thread.js',
      1,
      1,
      new Error('Unexpected error'),
    );

    assert.deepEqual(logs, []);
  });

  test('accepts a browser error event without an error object', function (assert) {
    handler.handleError(new Event('error'));

    assert.deepEqual(logs, []);
  });
});
