import Service from '@ember/service';
import {
  click,
  find,
  findAll,
  render,
  type TestContext,
} from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import PortalTarget from 'ember-stargate/components/portal-target';
import { module, test } from 'qunit';
import ThreadNav from 'potber-client/components/nav/routes/thread';
import type { Threads } from 'potber-client/services/api/types';
import { setupRenderingTest } from 'potber-client/tests/helpers';

interface Context extends TestContext {
  PortalTarget: typeof PortalTarget;
  ThreadNav: typeof ThreadNav;
  thread?: Threads.Read;
  page?: number;
  postId?: string;
}

const thread: Threads.Read = {
  id: '42',
  title: 'Board thread',
  boardId: '14',
  repliesCount: 0,
  hitsCount: 0,
  pagesCount: 3,
  isClosed: false,
  isSticky: false,
  isImportant: false,
  isAnnouncement: false,
  isGlobal: false,
};

function renderThreadNav() {
  return render<Context>(hbs`
  <this.PortalTarget @name='top-nav' data-test-top-nav />
  <this.PortalTarget @name='bottom-nav' data-test-bottom-nav />
  <this.ThreadNav @threadId='42' @thread={{this.thread}} @page={{this.page}}
    @postId={{this.postId}} />
`);
}

module('Integration | Component | Thread navigation', function (hooks) {
  setupRenderingTest(hooks);

  const previous =
    '[data-test-bottom-nav] .nav-element-center > a[href*="page=1"]';
  const next = '[data-test-bottom-nav] .nav-element-center > a[href*="page=3"]';
  const reply = '[data-test-bottom-nav] a.nav-element-right';

  hooks.beforeEach(function (this: Context) {
    this.PortalTarget = PortalTarget;
    this.ThreadNav = ThreadNav;
  });

  test('withholds thread controls until the thread loads', async function (this: Context, assert) {
    await renderThreadNav();

    assert.dom('[data-test-top-nav] .nav-header').exists();
    assert.dom('[data-test-top-nav] .title').doesNotExist();
    assert.dom('[data-test-bottom-nav] a').doesNotExist();
  });

  test('uses the explicit page and disables replies on a closed thread', async function (this: Context, assert) {
    this.thread = {
      ...thread,
      isClosed: true,
      page: { number: 1, postCount: 0, offset: 0, posts: [] },
    };
    this.page = 2;

    await renderThreadNav();

    assert.dom('[data-test-top-nav] .title').hasText('Board thread');
    for (const [control, page] of [
      [previous, '1'],
      [next, '3'],
    ] as const) {
      const link = find(control);
      assert.ok(link);
      const href = link?.getAttribute('href') ?? '';
      const query = new URL(href, window.location.origin).searchParams;
      assert.strictEqual(query.get('TID'), '42');
      assert.strictEqual(query.get('page'), page);
    }
    assert.dom(reply).hasClass('button-link-disabled');
  });

  test('offers to focus a linked post and omits next page at the end', async function (this: Context, assert) {
    this.thread = {
      ...thread,
      page: { number: 3, postCount: 0, offset: 0, posts: [] },
    };
    this.postId = '123';
    this.owner.register(
      'service:renderer',
      class extends Service {
        createClickRipple() {}

        scrollToElement(anchor: string, options: { highlight: boolean }) {
          assert.step(anchor);
          assert.true(options.highlight);
        }
      },
    );

    await renderThreadNav();

    assert
      .dom('[data-test-bottom-nav] .nav-element-center > a')
      .exists({ count: 1 });
    assert
      .dom('[data-test-bottom-nav] .nav-element-center > a[href*="page=2"]')
      .exists();
    assert.dom(reply).doesNotHaveClass('button-link-disabled');
    await click('[data-test-bottom-nav] .menu-button');
    const focus = findAll('menu[data-visible="true"] button.menu-item').find(
      (button) => button.textContent?.trim() === 'Verlinkten Post fokussieren',
    );
    if (!focus) throw new Error('Focus linked post action missing');
    await click(focus);
    assert.verifySteps(['post-123']);
  });
});
