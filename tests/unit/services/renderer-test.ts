import { settled } from '@ember/test-helpers';
import RendererService from 'potber-client/services/renderer';
import { setupTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Service | Renderer', function (hooks) {
  setupTest(hooks);

  const originalScrollTo = window.scrollTo;
  const originalUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  let scrollCalls: ScrollToOptions[];

  hooks.beforeEach(function () {
    scrollCalls = [];
    window.scrollTo = (options?: ScrollToOptions | number, y?: number) => {
      if (typeof options === 'number') {
        scrollCalls.push({ left: options, top: y });
        return;
      }

      scrollCalls.push(options ?? {});
    };
  });

  hooks.afterEach(function () {
    window.scrollTo = originalScrollTo;
    window.history.replaceState(null, '', originalUrl);
  });

  test('skips a requested scroll reset on the same URL', function (assert) {
    const renderer = this.owner.lookup('service:renderer') as RendererService;

    renderer.preventNextScrollReset();
    renderer.trySetScrollPosition();

    assert.deepEqual(scrollCalls, []);
  });

  test('does not carry a skipped reset into another page URL', function (assert) {
    const renderer = this.owner.lookup('service:renderer') as RendererService;

    window.history.replaceState(null, '', '/thread?TID=1&page=1');
    renderer.preventNextScrollReset();

    window.history.replaceState(null, '', '/thread?TID=1&page=2');
    renderer.trySetScrollPosition();

    assert.deepEqual(scrollCalls, [{ top: 0, behavior: 'auto' }]);
  });

  test('scrolls to a post ID below the top navigation and highlights it', async function (assert) {
    const renderer = this.owner.lookup('service:renderer') as RendererService;
    const fixture = document.body;
    const nav = document.createElement('div');
    nav.id = 'top-nav';
    nav.style.height = '40px';
    const post = document.createElement('article');
    post.id = 'renderer-test-post';
    post.setAttribute('data-highlighted', '');
    fixture.append(nav, post);

    try {
      const top = window.scrollY + post.getBoundingClientRect().top;
      assert.true(renderer.scrollToElement(post.id, { highlight: true }));
      assert.deepEqual(scrollCalls, [{ top: top - 40, behavior: 'smooth' }]);
      assert.false(post.hasAttribute('data-highlighted'));

      await settled();
      assert.true(post.hasAttribute('data-highlighted'));
    } finally {
      nav.remove();
      post.remove();
    }
  });

  test('honors the scroll behavior for an element without top navigation', function (assert) {
    const renderer = this.owner.lookup('service:renderer') as RendererService;
    const post = document.createElement('article');
    const top = window.scrollY + post.getBoundingClientRect().top;

    assert.true(renderer.scrollToElement(post, { behavior: 'instant' }));
    assert.deepEqual(scrollCalls, [{ top, behavior: 'instant' }]);
    assert.false(post.hasAttribute('data-highlighted'));
  });

  test('leaves the scroll position alone when a post ID is missing', function (assert) {
    const renderer = this.owner.lookup('service:renderer') as RendererService;

    assert.false(renderer.scrollToElement('missing-renderer-test-post'));
    assert.deepEqual(scrollCalls, []);
  });
});
