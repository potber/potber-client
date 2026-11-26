import { visit } from '@ember/test-helpers';
import Service from '@ember/service';
import { setupApplicationTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

module('Acceptance | Startup failure', function (hooks) {
  setupApplicationTest(hooks);

  test('renders the startup error and its stack instead of normal navigation', async function (assert) {
    const failure = new Error('Startup failed');
    failure.stack = 'at initialize (startup fixture)';
    this.owner.register(
      'service:app',
      class extends Service {
        async initialize() {
          throw failure;
        }
      },
    );

    await visit('/about');

    assert.dom('.error-container h1').hasText('Verbindungsfehler');
    assert.dom('.error-container').includesText('Error: Startup failed');
    assert
      .dom('.error-container')
      .includesText('at initialize (startup fixture)');
    assert.dom('#page-content').doesNotExist();
  });

  test('renders a thrown string as text without adding a stack trace', async function (assert) {
    this.owner.register(
      'service:app',
      class extends Service {
        async initialize() {
          return Promise.reject('<b>Connection lost</b>');
        }
      },
    );

    await visit('/about');

    assert.dom('.error-container h1').hasText('Verbindungsfehler');
    assert
      .dom('.error-container .subtitle:nth-last-child(2)')
      .hasText('<b>Connection lost</b>');
    assert.dom('.error-container .subtitle:last-child').hasText('Stack:');
    assert.dom('.error-container b').doesNotExist();
  });
});
