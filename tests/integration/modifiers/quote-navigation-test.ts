import Service from '@ember/service';
import { render, type TestContext } from '@ember/test-helpers';
import type { ScrollToElementOptions } from 'potber-client/services/renderer';
import { hbs } from 'ember-cli-htmlbars';
import quoteNavigation from 'potber-client/modifiers/quote-navigation';
import { setupRenderingTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

interface ScrollCall {
  element: HTMLElement;
  options?: ScrollToElementOptions;
}

class RendererStub extends Service {
  scrollCalls: ScrollCall[] = [];

  scrollToElement(element: HTMLElement, options?: ScrollToElementOptions) {
    this.scrollCalls.push({ element, options });
    return true;
  }
}

interface Context extends TestContext {
  quoteNavigation: typeof quoteNavigation;
}

function dispatchClick(link: HTMLAnchorElement, options?: MouseEventInit) {
  let wasAlreadyPrevented = false;
  const preventNavigation = (event: MouseEvent) => {
    wasAlreadyPrevented = event.defaultPrevented;
    event.preventDefault();
  };

  document.addEventListener('click', preventNavigation, { once: true });
  link.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      button: 0,
      cancelable: true,
      ...options,
    }),
  );

  return wasAlreadyPrevented;
}

module('Integration | Modifier | quote-navigation', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function (this: Context) {
    this.owner.register('service:renderer', RendererStub);
    this.quoteNavigation = quoteNavigation;
  });

  test('it scrolls to a quoted post on the current page', async function (this: Context, assert) {
    await render<Context>(hbs`
      <article id='post-123'>Original post</article>
      <div {{this.quoteNavigation}}>
        <a class='quote-header' href='/thread?TID=1&PID=123'>Alice</a>
      </div>
    `);

    const link = document.querySelector<HTMLAnchorElement>('.quote-header');
    const post = document.getElementById('post-123')!;
    const renderer = this.owner.lookup('service:renderer') as RendererStub;

    assert.true(dispatchClick(link!));
    assert.deepEqual(renderer.scrollCalls, [
      {
        element: post,
        options: { highlight: true },
      },
    ]);
  });

  test('it keeps normal navigation when the quoted post is not on the current page', async function (this: Context, assert) {
    await render<Context>(hbs`
      <div {{this.quoteNavigation}}>
        <a class='quote-header' href='/thread?TID=1&PID=456'>Bob</a>
      </div>
    `);

    const link = document.querySelector<HTMLAnchorElement>('.quote-header');
    const renderer = this.owner.lookup('service:renderer') as RendererStub;

    assert.false(dispatchClick(link!));
    assert.deepEqual(renderer.scrollCalls, []);
  });

  test('it keeps modified clicks available for opening a new tab', async function (this: Context, assert) {
    await render<Context>(hbs`
      <article id='post-123'>Original post</article>
      <div {{this.quoteNavigation}}>
        <a class='quote-header' href='/thread?TID=1&PID=123'>Alice</a>
      </div>
    `);

    const link = document.querySelector<HTMLAnchorElement>('.quote-header');
    const renderer = this.owner.lookup('service:renderer') as RendererStub;

    assert.false(dispatchClick(link!, { ctrlKey: true }));
    assert.deepEqual(renderer.scrollCalls, []);
  });
});
