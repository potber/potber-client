import { module, test } from 'qunit';
import {
  getAnchorId,
  getLegacyReplyAnchorId,
  getPostIdFromHash,
  getThreadScrollTarget,
} from 'potber-client/utils/misc';

module('Unit | Utils | misc', function () {
  test('returns the canonical potber anchor id for a post', function (assert) {
    assert.strictEqual(getAnchorId('123'), 'post-123');
  });

  test('returns the legacy forum reply anchor id for a post', function (assert) {
    assert.strictEqual(getLegacyReplyAnchorId('123'), 'reply_123');
  });

  test('extracts a post id from a potber thread hash', function (assert) {
    assert.strictEqual(getPostIdFromHash('#post-123'), '123');
  });

  test('extracts a post id from a legacy forum reply hash', function (assert) {
    assert.strictEqual(getPostIdFromHash('#reply_123'), '123');
  });

  test('returns null for unrelated hashes', function (assert) {
    assert.strictEqual(getPostIdFromHash('#something-else'), null);
  });

  test('prefers scrolling to a targeted thread post', function (assert) {
    assert.deepEqual(
      getThreadScrollTarget({
        search: '?PID=123',
        hash: '',
        currentRouteName: 'authenticated.thread',
        goToBottomOfThreadPage: true,
      }),
      {
        type: 'post',
        postId: '123',
      },
    );
  });

  test('accepts legacy forum reply hashes as focused post targets', function (assert) {
    assert.deepEqual(
      getThreadScrollTarget({
        search: '',
        hash: '#reply_123',
        currentRouteName: 'authenticated.thread',
        goToBottomOfThreadPage: true,
      }),
      {
        type: 'post',
        postId: '123',
      },
    );
  });

  test('uses bottom scroll mode when enabled and requested', function (assert) {
    assert.deepEqual(
      getThreadScrollTarget({
        search: '?scrollToBottom=true',
        hash: '',
        currentRouteName: 'authenticated.thread',
        goToBottomOfThreadPage: true,
      }),
      {
        type: 'bottom',
      },
    );
  });

  test('falls back to top scroll mode when no focus target exists', function (assert) {
    assert.deepEqual(
      getThreadScrollTarget({
        search: '',
        hash: '',
        currentRouteName: 'authenticated.thread',
        goToBottomOfThreadPage: false,
      }),
      {
        type: 'top',
      },
    );
  });
});
