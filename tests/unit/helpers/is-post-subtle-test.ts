import { module, test } from 'qunit';
import { isPostSubtle } from 'potber-client/helpers/is-post-subtle';
import type Post from 'potber-client/models/post';

module('Unit | Helper | is-post-subtle', function () {
  const post: Post = {
    id: '100',
    date: '2026-11-26T12:00:00Z',
    threadId: '42',
    boardId: '14',
    author: { id: '7', name: 'Author' },
  };

  test('dims previously read posts only when the preference is enabled', function (assert) {
    assert.false(
      Boolean(isPostSubtle([post, '', true])),
      'no last-read marker',
    );
    assert.false(
      Boolean(isPostSubtle([post, '200', false])),
      'preference disabled',
    );
    assert.false(Boolean(isPostSubtle([post, '99', true])), 'newer post');
    assert.true(Boolean(isPostSubtle([post, '100', true])), 'last-read post');
    assert.true(Boolean(isPostSubtle([post, '200', true])), 'older post');
  });
});
