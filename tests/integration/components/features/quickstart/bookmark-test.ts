import { find, render, type TestContext } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import QuickstartBookmark from 'potber-client/components/features/quickstart/newsfeed/bookmark';
import type ApiService from 'potber-client/services/api';
import { Bookmark } from 'potber-client/services/api/models/bookmark';
import { setupRenderingTest } from 'potber-client/tests/helpers';

interface Context extends TestContext {
  QuickstartBookmark: typeof QuickstartBookmark;
  bookmark: Bookmark;
}

module('Integration | Component | Quickstart bookmark', function (hooks) {
  setupRenderingTest(hooks);

  for (const [newPostsCount, isClosed, label, icon] of [
    [1, false, '1 neuer Post', 'bookmark'],
    [3, true, '3 neue Posts', 'lock'],
  ] as const) {
    test(`shows ${label} and the ${icon} icon`, async function (this: Context, assert) {
      this.QuickstartBookmark = QuickstartBookmark;
      const api = this.owner.lookup('service:api') as ApiService;
      this.bookmark = new Bookmark(
        {
          id: '1',
          postId: '123',
          newPostsCount,
          thread: {
            id: '42',
            title: 'Bookmarked thread',
            pagesCount: 3,
            isClosed,
          },
          board: { id: '14', name: 'Forum' },
        },
        api,
      );

      await render<Context>(hbs`
        <this.QuickstartBookmark @bookmark={{this.bookmark}} @inSidebar={{false}} />
      `);

      assert.dom('.quickstart-item .title').hasText('Bookmarked thread');
      assert.dom('.quickstart-item .subtitle').hasText(label);
      assert.dom(`.quickstart-item [data-icon="${icon}"]`).exists();
      const href = find('.quickstart-item a')?.getAttribute('href') ?? '';
      const query = new URL(href, window.location.origin).searchParams;
      assert.strictEqual(query.get('TID'), '42');
      assert.strictEqual(query.get('PID'), '123');
      assert.strictEqual(query.get('lastReadPost'), '123');
    });
  }
});
