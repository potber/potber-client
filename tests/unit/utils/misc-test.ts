import { module, test } from 'qunit';
import {
  getAnchorId,
  getLegacyReplyAnchorId,
  getPostIdFromHash,
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
});
