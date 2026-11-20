import { setupTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';
import { createVideoContainer, videoTagMocks } from './_mock/video';
import { parseVideo } from 'potber-client/services/content-parser/video';

module('Unit | Service | ContentParser | [video]', (hooks) => {
  setupTest(hooks);

  test('Parses all [video] tags.', (assert) => {
    const locationMock: Partial<Location> = {
      protocol: 'https:',
      host: 'test.potber.de',
    };
    assert.expect(videoTagMocks.length);
    for (const mock of videoTagMocks) {
      assert.strictEqual(parseVideo(mock.input, locationMock), mock.expected);
    }
  });

  test('Parses adjacent [video] tags independently.', (assert) => {
    const locationMock: Partial<Location> = {
      protocol: 'https:',
      host: 'test.potber.de',
    };
    const firstUrl = 'https://www.youtube.com/shorts/nKEF44PaRJM';
    const secondUrl = 'https://www.youtube.com/shorts/8B5Yi29DExM';

    assert.strictEqual(
      parseVideo(
        `[video]${firstUrl}[/video][video]${secondUrl}[/video]`,
        locationMock,
      ),
      createVideoContainer(
        'https&#58;//www.youtube.com/shorts/nKEF44PaRJM',
        '<iframe class="youtube-player" type="text/html" src="https://www.youtube.com/embed/nKEF44PaRJM?origin=https://test.potber.de" frameborder="0" allow="fullscreen;"></iframe>',
      ) +
        createVideoContainer(
          'https&#58;//www.youtube.com/shorts/8B5Yi29DExM',
          '<iframe class="youtube-player" type="text/html" src="https://www.youtube.com/embed/8B5Yi29DExM?origin=https://test.potber.de" frameborder="0" allow="fullscreen;"></iframe>',
        ),
    );
  });
});
