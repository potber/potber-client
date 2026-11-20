import { sanitizeHtml } from 'potber-client/utils/sanitize-html';
import { parseImg } from 'potber-client/services/content-parser/img';
import { parseUrl } from 'potber-client/services/content-parser/url';
import { setupTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Utils | sanitizeHtml', (hooks) => {
  setupTest(hooks);

  test('removes executable markup and unsafe URL protocols', function (assert) {
    const parserOutput = `${parseImg(
      '[img]https://example.com/image.png" onerror="alert(1)[/img]',
    )}${parseUrl('[url=javascript:alert(1)]link[/url]')}`;
    const result = sanitizeHtml(`${parserOutput}
      <script>alert('script')</script>
      <a href="https://example.com" onclick="alert('click')">safe link</a>
      <video src="data:text/html;base64,PHNjcmlwdD4=" controls></video>
    `);
    const container = document.createElement('div');
    container.innerHTML = result;

    assert.dom(container.querySelector('script')).doesNotExist();
    assert.dom(container.querySelector('[onerror]')).doesNotExist();
    assert.dom(container.querySelector('[onclick]')).doesNotExist();
    assert.dom(container.querySelector('a')).doesNotHaveAttribute('onclick');
    assert.dom(container.querySelectorAll('a')[0]).doesNotHaveAttribute('href');
    assert.dom(container.querySelector('video')).doesNotHaveAttribute('src');
    assert
      .dom(container.querySelector('img'))
      .hasAttribute('src', 'https://example.com/image.png');
  });

  test('preserves supported parser output', function (assert) {
    const result = sanitizeHtml(`
      <span class="quote" data-author-name="Alice">
        <a href="/thread?TID=1" target="_blank">Quote</a>
      </span>
      <iframe
        class="youtube-player"
        src="https://www.youtube.com/embed/video-id?origin=https://potber.de"
        allow="fullscreen;"
        frameborder="0"
      ></iframe>
      <video src="https://example.com/video.mp4#t=0.001" controls muted></video>
    `);
    const container = document.createElement('div');
    container.innerHTML = result;

    assert
      .dom(container.querySelector('.quote'))
      .hasAttribute('data-author-name', 'Alice');
    assert
      .dom(container.querySelector('a'))
      .hasAttribute('rel', 'noopener noreferrer');
    assert
      .dom(container.querySelector('iframe'))
      .hasAttribute(
        'src',
        'https://www.youtube.com/embed/video-id?origin=https://potber.de',
      );
    assert
      .dom(container.querySelector('video'))
      .hasAttribute('src', 'https://example.com/video.mp4#t=0.001');
  });

  test('removes non-YouTube iframes', function (assert) {
    const result = sanitizeHtml(
      '<iframe src="https://example.com/embedded-content"></iframe>',
    );
    const container = document.createElement('div');
    container.innerHTML = result;

    assert.dom(container.querySelector('iframe')).doesNotExist();
  });
});
