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
import type { InputModalOptions } from 'potber-client/components/modal/types/input';
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
  test('opens a bounded page prompt and navigates to the chosen page', async function (this: Context, assert) {
    this.thread = thread;
    this.page = 1;
    let submit: ((value: string) => void) | undefined;
    this.owner.register(
      'service:modal',
      class extends Service {
        input(options: InputModalOptions) {
          assert.strictEqual(options.min, 1);
          assert.strictEqual(options.max, 3);
          assert.strictEqual(options.type, 'number');
          submit = options.onSubmit;
          assert.step('prompt');
        }

        close() {
          assert.step('closed');
        }
      },
    );
    this.owner.register(
      'service:router',
      class extends Service {
        transitionTo(route: string, options: { queryParams: object }) {
          assert.strictEqual(route, 'authenticated.thread');
          assert.deepEqual(options.queryParams, { TID: '42', page: '2' });
          assert.step('navigated');
        }
      },
    );

    await renderThreadNav();
    await click('[data-test-bottom-nav] .menu-button');
    const goToPage = findAll('menu[data-visible="true"] button.menu-item').find(
      (button) => button.textContent?.trim() === 'Zur Seite...',
    );
    if (!goToPage) throw new Error('Go to page action missing');
    await click(goToPage);
    if (!submit) throw new Error('Page prompt did not provide a submit action');
    submit('2');

    assert.verifySteps(['prompt', 'navigated', 'closed']);
  });

  test('deletes the bookmark for the current thread and reports success', async function (this: Context, assert) {
    this.thread = thread;
    this.page = 1;
    this.owner.register(
      'service:stores/bookmark',
      class extends Service {
        all = [
          { thread: { id: 'other' } },
          {
            thread,
            delete: async () => assert.step('deleted current bookmark'),
          },
        ];
      },
    );
    this.owner.register(
      'service:messages',
      class extends Service {
        showNotification(message: string, type: string) {
          assert.strictEqual(message, 'Das Lesezeichen wurde entfernt.');
          assert.strictEqual(type, 'success');
          assert.step('notified');
        }
      },
    );

    await renderThreadNav();
    await click('[data-test-bottom-nav] .menu-button');
    const remove = findAll('menu[data-visible="true"] button.menu-item').find(
      (button) => button.textContent?.trim() === 'Bookmark löschen',
    );
    if (!remove) throw new Error('Delete bookmark action missing');
    await click(remove);

    assert.verifySteps(['deleted current bookmark', 'notified']);
  });
});
