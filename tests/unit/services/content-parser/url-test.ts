import { setupTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';
import { urlTagMocks } from './_mock/url';
import { parseUrl } from 'potber-client/services/content-parser/url';

module('Unit | Service | ContentParser | [url]', (hooks) => {
  setupTest(hooks);

  test('Parses all [url] tags.', (assert) => {
    assert.expect(urlTagMocks.normal.length);
    for (const mock of urlTagMocks.normal) {
      assert.strictEqual(parseUrl(mock.input), mock.expected);
    }
  });

  test('Parses adjacent [url] tags independently.', (assert) => {
    const input =
      '[url]https://www.youtube.com/shorts/nKEF44PaRJM[/url]' +
      '[url]https://www.youtube.com/shorts/8B5Yi29DExM[/url]';

    assert.strictEqual(
      parseUrl(input),
      '<a href="https&#58;//www.youtube.com/shorts/nKEF44PaRJM" target="_blank">https://www.youtube.com/shorts/nKEF44PaRJM</a>' +
        '<a href="https&#58;//www.youtube.com/shorts/8B5Yi29DExM" target="_blank">https://www.youtube.com/shorts/8B5Yi29DExM</a>',
    );
  });

  test('Parses all [url] tags while replacing forum.mods.de URLs.', (assert) => {
    assert.expect(urlTagMocks.withReplacingForumUrls.length);
    for (const mock of urlTagMocks.withReplacingForumUrls) {
      assert.strictEqual(
        parseUrl(mock.input, { replaceForumUrls: true }),
        mock.expected,
      );
    }
  });
});
