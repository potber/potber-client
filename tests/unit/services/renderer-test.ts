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
});
