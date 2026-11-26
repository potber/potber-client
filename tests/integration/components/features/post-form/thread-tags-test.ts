import { fillIn, render, type TestContext } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import ThreadTags from 'potber-client/components/features/post-form/components/thread-tags';
import type { Threads } from 'potber-client/services/api/types';
import { setupRenderingTest } from 'potber-client/tests/helpers';

interface Context extends TestContext {
  ThreadTags: typeof ThreadTags;
  thread: Threads.Create;
}

module('Integration | Component | Thread tags', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function (this: Context) {
    this.ThreadTags = ThreadTags;
    this.thread = {
      boardId: '14',
      title: 'Draft',
      openingPost: { message: 'Draft' },
    };
  });

  test('starts with a blank field and writes space-separated tags into the draft', async function (this: Context, assert) {
    await render<Context>(hbs`<this.ThreadTags @thread={{this.thread}} />`);

    assert.dom('input').hasValue('');
    await fillIn('input', 'ember testing');
    assert.deepEqual(this.thread.tags, ['ember', 'testing']);
  });

  test('shows existing tags and clears them on whitespace input', async function (this: Context, assert) {
    this.thread.tags = ['ember', 'testing'];
    await render<Context>(hbs`<this.ThreadTags @thread={{this.thread}} />`);

    assert.dom('input').hasValue('ember testing');
    await fillIn('input', '   ');
    assert.deepEqual(this.thread.tags, []);
  });
});
