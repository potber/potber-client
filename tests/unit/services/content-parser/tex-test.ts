import { setupTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';
import { texTagMocks } from './_mock/tex';
import {
  parseTex,
  renderTexPlaceholders,
} from 'potber-client/services/content-parser/tex';

module('Unit | Service | ContentParser | [tex]', (hooks) => {
  setupTest(hooks);

  test('Parses all [tex] tags.', (assert) => {
    assert.expect(texTagMocks.length);
    for (const mock of texTagMocks) {
      assert.strictEqual(parseTex(mock.input), mock.expected);
    }
  });

  test('renders tex placeholders lazily', async (assert) => {
    const container = document.createElement('div');
    container.innerHTML = parseTex(`[tex]hello world[/tex]`);

    await renderTexPlaceholders(container);

    const katexElement = container.querySelector('.katex');
    assert.dom(katexElement).exists();
    assert
      .dom(container.querySelector('[data-katex-source]'))
      .hasAttribute('data-katex-rendered', 'true');
  });
});
