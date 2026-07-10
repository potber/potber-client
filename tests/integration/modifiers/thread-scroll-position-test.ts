import Service from '@ember/service';
import { render, type TestContext, waitUntil } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import threadScrollPosition from 'potber-client/modifiers/thread-scroll-position';
import { setupRenderingTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

interface Context extends TestContext {
  threadScrollPosition: typeof threadScrollPosition;
}

module('Integration | Modifier | thread-scroll-position', function (hooks) {
  setupRenderingTest(hooks);

  const originalScrollBy = window.scrollBy;
  const originalScrollTo = window.scrollTo;
  const originalUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  hooks.afterEach(function () {
    window.scrollBy = originalScrollBy;
    window.scrollTo = originalScrollTo;
    window.history.replaceState(null, '', originalUrl);
  });

  test('waits for a post and refocuses it after media loads', async function (this: Context, assert) {
    class RouterStub extends Service {
      currentRouteName = 'authenticated.thread';
    }

    class SettingsStub extends Service {
      getSetting() {
        return false;
      }
    }

    const scrollByCalls: ScrollToOptions[] = [];
    const scrollToCalls: ScrollToOptions[] = [];
    let postTop = 300;

    window.scrollBy = (options?: ScrollToOptions | number, y?: number) => {
      const scrollOptions =
        typeof options === 'number'
          ? { left: options, top: y }
          : (options ?? {});
      scrollByCalls.push(scrollOptions);
      postTop -= scrollOptions.top ?? 0;
    };
    window.scrollTo = (options?: ScrollToOptions | number, y?: number) => {
      scrollToCalls.push(
        typeof options === 'number'
          ? { left: options, top: y }
          : (options ?? {}),
      );
    };

    this.owner.register('service:router', RouterStub);
    this.owner.register('service:settings', SettingsStub);
    this.threadScrollPosition = threadScrollPosition;
    window.history.replaceState(null, '', '/thread?TID=1&PID=123');

    await render<Context>(hbs`
      <div id='top-nav'></div>
      <div class='thread-page' data-testid='thread-page'>
        <span {{this.threadScrollPosition}}></span>
      </div>
    `);

    const topNav = document.getElementById('top-nav') as HTMLElement;
    Object.defineProperty(topNav, 'clientHeight', { value: 50 });

    const post = document.createElement('article');
    post.id = 'post-123';
    post.getBoundingClientRect = () =>
      ({
        top: postTop,
      }) as DOMRect;

    const threadPage = document.querySelector(
      '[data-testid="thread-page"]',
    ) as HTMLElement;
    threadPage.prepend(post);

    await waitUntil(() => scrollByCalls.length > 0);

    assert.deepEqual(scrollToCalls[0], {
      top: window.scrollY + 250,
      behavior: 'auto',
    });
    assert.deepEqual(scrollByCalls[0], {
      top: 250,
      behavior: 'auto',
    });

    postTop = 200;
    const image = document.createElement('img');
    post.append(image);
    image.dispatchEvent(new Event('load'));

    await waitUntil(() => scrollByCalls.length > 1);

    assert.deepEqual(scrollByCalls[1], {
      top: 150,
      behavior: 'auto',
    });
  });
});
