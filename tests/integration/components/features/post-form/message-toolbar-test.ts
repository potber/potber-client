import Service from '@ember/service';
import { click, render, waitUntil } from '@ember/test-helpers';
import type { RenderingTestContext } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import PostFormMessageToolbar from 'potber-client/components/features/post-form/components/message/toolbar';
import type { Posts } from 'potber-client/services/api/types';
import { setupRenderingTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

interface Context extends RenderingTestContext {
  element: HTMLElement;
  post: Posts.Write;
  textarea: HTMLTextAreaElement;
  Toolbar: typeof PostFormMessageToolbar;
}

function visibleActionCount(element: HTMLElement) {
  return Array.from(
    element.querySelectorAll<HTMLElement>('[data-toolbar-action]'),
  ).filter((action) => getComputedStyle(action).display !== 'none').length;
}

module(
  'Integration | Component | Feature | Post form | Message toolbar',
  function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function (this: Context) {
      class RendererStub extends Service {
        createClickRipple() {}
      }

      this.owner.register('service:renderer', RendererStub);
      this.post = { message: '', threadId: '213203' };
      this.textarea = document.createElement('textarea');
      this.Toolbar = PostFormMessageToolbar;
    });

    test('moves actions dynamically as the available width changes', async function (this: Context, assert) {
      this.element.style.width = '390px';

      await render<Context>(hbs`
        <this.Toolbar
          @post={{this.post}}
          @textarea={{this.textarea}}
        />
      `);
      await waitUntil(
        () =>
          this.element
            .querySelector('[role="toolbar"]')
            ?.getAttribute('data-ready') === 'true',
      );

      const mediumCount = visibleActionCount(this.element);
      const toolbar = this.element.querySelector(
        '[role="toolbar"]',
      ) as HTMLElement;
      assert.deepEqual(
        Array.from(
          this.element.querySelectorAll<HTMLElement>('[data-toolbar-action]'),
          (action) => action.dataset['toolbarAction'],
        ),
        [
          'emojis',
          'memes',
          'bold',
          'italic',
          'underline',
          'strikethrough',
          'mono',
          'tex',
          'trigger',
          'link',
          'list',
          'image',
          'video',
          'code',
          'quote',
          'spoiler',
        ],
        'preserves the original action order',
      );
      assert.true(mediumCount > 0);
      assert.true(mediumCount < 16);
      assert.true(toolbar.scrollWidth <= toolbar.clientWidth);
      assert.dom('button[title="Mehr"]').isVisible();

      this.element.style.width = '900px';
      await waitUntil(() => visibleActionCount(this.element) === 16);

      assert.dom('button[title="Mehr"]').isNotVisible();
      assert.dom('[data-toolbar-action="trigger"]').isVisible();

      this.element.style.width = '300px';
      await waitUntil(() => visibleActionCount(this.element) < mediumCount);

      assert.dom('[data-toolbar-action="link"]').isNotVisible();
      assert.dom('button[title="Mehr"]').isVisible();
      assert.true(toolbar.scrollWidth <= toolbar.clientWidth);

      await click('button[title="Mehr"]');

      assert.dom('menu button[title="Link"]').isVisible();
      assert.dom('menu').hasTextContaining('Text');
      assert.dom('menu button[title="Bild"]').isVisible();
      assert.dom('menu button[title="Video"]').isVisible();
      assert.dom('menu').hasTextContaining('Medien');
    });

    test('runs formatting actions from the dynamic overflow menu', async function (this: Context, assert) {
      this.element.style.width = '390px';

      await render<Context>(hbs`
        <this.Toolbar
          @post={{this.post}}
          @textarea={{this.textarea}}
        />
      `);
      await waitUntil(
        () =>
          this.element
            .querySelector('[role="toolbar"]')
            ?.getAttribute('data-ready') === 'true',
      );

      await click('button[title="Mehr"]');
      await click('menu button[title="Trigger"]');

      assert.strictEqual(this.post.message, '[trigger][/trigger]');
      assert.dom('menu button[title="Trigger"]').isNotVisible();
    });
  },
);
