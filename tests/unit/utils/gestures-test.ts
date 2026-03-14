import { module, test } from 'qunit';
import {
  getSidebarSwipeType,
  normalizeOverscrollTolerance,
  shouldTriggerOverscroll,
} from 'potber-client/utils/gestures';

module('Unit | Utils | gestures', function () {
  test('normalizes overscroll tolerance', function (assert) {
    assert.strictEqual(normalizeOverscrollTolerance(), 5);
    assert.strictEqual(normalizeOverscrollTolerance(-1), 5);
    assert.strictEqual(normalizeOverscrollTolerance(0), 0);
    assert.strictEqual(normalizeOverscrollTolerance(12), 12);
  });

  test('triggers top overscroll only near the top edge', function (assert) {
    assert.true(
      shouldTriggerOverscroll({
        direction: 'down',
        scrollTop: 3,
        clientHeight: 800,
        scrollHeight: 2400,
        tolerance: 5,
      }),
    );

    assert.false(
      shouldTriggerOverscroll({
        direction: 'down',
        scrollTop: 120,
        clientHeight: 800,
        scrollHeight: 2400,
        tolerance: 5,
      }),
    );
  });

  test('triggers bottom overscroll only near the bottom edge', function (assert) {
    assert.true(
      shouldTriggerOverscroll({
        direction: 'up',
        scrollTop: 1598,
        clientHeight: 800,
        scrollHeight: 2400,
        tolerance: 5,
      }),
    );

    assert.false(
      shouldTriggerOverscroll({
        direction: 'up',
        scrollTop: 1200,
        clientHeight: 800,
        scrollHeight: 2400,
        tolerance: 5,
      }),
    );
  });

  test('returns side-aware swipe directions for the sidebar', function (assert) {
    assert.strictEqual(
      getSidebarSwipeType({ isRightSidebar: false, action: 'open' }),
      'swiperight',
    );
    assert.strictEqual(
      getSidebarSwipeType({ isRightSidebar: false, action: 'close' }),
      'swipeleft',
    );
    assert.strictEqual(
      getSidebarSwipeType({ isRightSidebar: true, action: 'open' }),
      'swipeleft',
    );
    assert.strictEqual(
      getSidebarSwipeType({ isRightSidebar: true, action: 'close' }),
      'swiperight',
    );
  });
});
