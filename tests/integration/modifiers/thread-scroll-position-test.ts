import Service from '@ember/service';
import {
  clearRender,
  render,
  type TestContext,
  waitUntil,
} from '@ember/test-helpers';
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

  class RouterStub extends Service {
    currentRouteName = 'authenticated.thread';
  }

  class SettingsStub extends Service {
    getSetting() {
      return false;
    }
  }

  hooks.beforeEach(function (this: Context) {
    this.owner.register('service:router', RouterStub);
    this.owner.register('service:settings', SettingsStub);
    this.threadScrollPosition = threadScrollPosition;
  });

  hooks.afterEach(function () {
    window.scrollBy = originalScrollBy;
    window.scrollTo = originalScrollTo;
    window.history.replaceState(null, '', originalUrl);
  });

  test('waits for a post and refocuses it after media loads', async function (this: Context, assert) {
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

    window.history.replaceState(null, '', '/thread?TID=1&PID=123');

    await render<Context>(hbs`
      <div id='top-nav'></div>
      <div class='thread-page' data-testid='thread-page'>
        <span {{this.threadScrollPosition}}></span>
      </div>
    `);
    // The modifier looks for the post in an animation frame. Insert the post only after
    // that frame so the test always takes the wait-for-post path.
    await nextAnimationFrame();

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

  test('stops correcting after the user scrolls', async function (this: Context, assert) {
    this.threadScrollPosition = threadScrollPosition;
    window.history.replaceState(null, '', '/thread?TID=1&PID=123');
    let focused = false;
    window.scrollTo = () => {
      focused = true;
    };
    window.scrollBy = () => assert.step('corrected position');

    await render<Context>(hbs`
      <div class='thread-page' data-test-thread-page>
        <span {{this.threadScrollPosition}}></span>
      </div>
    `);
    await nextAnimationFrame();

    const page = document.querySelector('[data-test-thread-page]');
    if (!page) throw new Error('Thread page fixture missing');
    const post = document.createElement('article');
    post.id = 'post-123';
    let top = document.getElementById('top-nav')?.clientHeight ?? 0;
    post.getBoundingClientRect = () => new DOMRect(0, top);
    page.append(post);
    await waitUntil(() => focused);
    await nextAnimationFrame();
    assert.verifySteps([]);

    top += 150;
    const video = document.createElement('video');
    post.append(video);
    video.dispatchEvent(new Event('loadedmetadata'));
    window.dispatchEvent(new Event('wheel'));
    video.dispatchEvent(new Event('loadeddata'));
    await nextAnimationFrame();

    assert.verifySteps([]);
  });

  test('cancels pending scroll correction when the thread view is removed', async function (this: Context, assert) {
    window.history.replaceState(null, '', '/thread?TID=1&PID=123');
    let focused = false;
    window.scrollTo = () => {
      focused = true;
    };
    window.scrollBy = () => assert.step('corrected position');

    await render<Context>(hbs`
      <div class='thread-page' data-test-thread-page>
        <span {{this.threadScrollPosition}}></span>
      </div>
    `);
    await nextAnimationFrame();
    const page = document.querySelector('[data-test-thread-page]');
    if (!page) throw new Error('Thread page fixture missing');
    const post = document.createElement('article');
    post.id = 'post-123';
    let top = document.getElementById('top-nav')?.clientHeight ?? 0;
    post.getBoundingClientRect = () => new DOMRect(0, top);
    page.append(post);
    await waitUntil(() => focused);
    await nextAnimationFrame();

    await clearRender();
    top += 150;
    const image = document.createElement('img');
    post.append(image);
    image.dispatchEvent(new Event('load'));
    await nextAnimationFrame();

    assert.verifySteps([]);
  });

  test('scrolls to a post that is already rendered', async function (this: Context, assert) {
    const scrollToCalls: ScrollToOptions[] = [];
    window.scrollTo = (options?: ScrollToOptions | number, y?: number) => {
      scrollToCalls.push(
        typeof options === 'number'
          ? { left: options, top: y }
          : (options ?? {}),
      );
    };
    window.history.replaceState(null, '', '/thread?TID=1&PID=123');

    await render<Context>(hbs`
      <div class='thread-page'>
        <article id='post-123'></article>
        <span {{this.threadScrollPosition}}></span>
      </div>
    `);

    await waitUntil(() => scrollToCalls.length > 0);

    assert.strictEqual(scrollToCalls[0]?.behavior, 'auto');
  });
  test('resets to the top when the URL does not request a scroll target', async function (this: Context, assert) {
    const scrollCalls: ScrollToOptions[] = [];
    window.scrollTo = (options?: ScrollToOptions | number) => {
      if (typeof options === 'object') scrollCalls.push(options);
    };
    window.history.replaceState(null, '', '/thread?TID=1');

    await render<Context>(hbs`<span {{this.threadScrollPosition}}></span>`);
    await nextAnimationFrame();

    assert.deepEqual(scrollCalls, [{ top: 0, behavior: 'auto' }]);
  });

  module('With scroll to bottom enabled', function (hooks) {
    hooks.beforeEach(function () {
      this.owner.register(
        'service:settings',
        class extends Service {
          getSetting() {
            return true;
          }
        },
      );
      window.history.replaceState(null, '', '/thread?TID=1&scrollToBottom');
    });

    test('targets the last post inside the thread page', async function (this: Context, assert) {
      this.owner.register(
        'service:renderer',
        class extends Service {
          scrollToElement(element: HTMLElement, options: ScrollToOptions) {
            assert.step(element.id);
            assert.deepEqual(options, { behavior: 'auto' });
            return false;
          }
        },
      );

      await render<Context>(hbs`
        <div class='thread-page'>
          <article class='post' id='first-post'></article>
          <article class='post' id='last-thread-post'></article>
          <span {{this.threadScrollPosition}}></span>
        </div>
        <article class='post' id='unrelated-post'></article>
      `);
      await nextAnimationFrame();

      assert.verifySteps(['last-thread-post']);
    });

    test('leaves the scroll position alone when the thread has no posts', async function (this: Context, assert) {
      window.scrollTo = () => assert.step('scrollTo');
      window.scrollBy = () => assert.step('scrollBy');

      await render<Context>(hbs`
        <div class='thread-page'>
          <span {{this.threadScrollPosition}}></span>
        </div>
      `);
      await nextAnimationFrame();

      assert.verifySteps([]);
    });
  });
});

function nextAnimationFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}
