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

  test('removes empty TeX tags', (assert) => {
    assert.strictEqual(parseTex('Before [tex][/tex] after'), 'Before  after');
  });

  test('renders new formulas without reprocessing existing or empty placeholders', async (assert) => {
    const container = document.createElement('div');
    container.innerHTML = parseTex('[tex]x^2[/tex]');
    await renderTexPlaceholders(container);

    const existing = container.querySelector('.katex');
    assert.ok(existing);
    container.insertAdjacentHTML('beforeend', parseTex('[tex]y^2[/tex]'));
    const empty = document.createElement('span');
    empty.dataset['katexSource'] = '';
    container.append(empty);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('data-katex-source', 'z');
    container.append(svg);

    await renderTexPlaceholders(container);

    assert.strictEqual(container.querySelector('.katex'), existing);
    assert.strictEqual(container.querySelectorAll('.katex').length, 2);
    assert.strictEqual(empty.childElementCount, 0);
    assert.strictEqual(svg.childElementCount, 0);
  });
});
