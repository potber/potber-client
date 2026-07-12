import { click, render, settled, type TestContext } from '@ember/test-helpers';
import { set } from '@ember/object';
import { htmlSafe } from '@ember/template';
import { hbs } from 'ember-cli-htmlbars';
import collapseQuotes from 'potber-client/modifiers/collapse-quotes';
import { setupRenderingTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

interface Context extends TestContext {
  collapseQuotes: typeof collapseQuotes;
  content: ReturnType<typeof htmlSafe>;
  enabled: boolean;
  source?: object;
}

module('Integration | Modifier | collapse-quotes', function (hooks) {
  setupRenderingTest(hooks);

  test('it leaves quotes expanded while disabled', async function (this: Context, assert) {
    this.collapseQuotes = collapseQuotes;
    this.enabled = false;
    this.content = htmlSafe(
      '<span class="quote"><blockquote>Ein langes Zitat</blockquote></span>',
    );

    await render<Context>(hbs`
      <div {{this.collapseQuotes enabled=this.enabled}}>{{this.content}}</div>
    `);

    assert.dom('.quote').doesNotHaveClass('quote-collapsed');
    assert.dom('.quote-collapse-toggle').doesNotExist();
  });

  test('it toggles quotes with a header', async function (this: Context, assert) {
    this.collapseQuotes = collapseQuotes;
    this.enabled = true;
    this.content = htmlSafe(
      '<span class="quote" data-author-name="Alice"><a class="quote-header" href="/thread?TID=1&amp;PID=2"><p>Alice</p></a><blockquote>Ein langes Zitat</blockquote></span>',
    );

    await render<Context>(hbs`
      <div {{this.collapseQuotes enabled=this.enabled}}>{{this.content}}</div>
    `);

    assert.dom('.quote').hasClass('quote-collapsed');
    assert.dom('.quote').hasClass('quote-has-header');
    assert.dom('.quote-header').exists();
    assert.dom('.quote-collapse-toggle').hasNoText();
    assert
      .dom('.quote-collapse-toggle')
      .hasAttribute('aria-label', 'Zitat von Alice anzeigen');
    assert.dom('.quote-collapse-toggle').hasAttribute('aria-expanded', 'false');

    await click('.quote-collapse-toggle');

    assert.dom('.quote').doesNotHaveClass('quote-collapsed');
    assert
      .dom('.quote-collapse-toggle')
      .hasAttribute('aria-label', 'Zitat von Alice ausblenden');
    assert.dom('.quote-collapse-toggle').hasAttribute('aria-expanded', 'true');
  });

  test('it leaves quotes without an author unchanged', async function (this: Context, assert) {
    this.collapseQuotes = collapseQuotes;
    this.enabled = true;
    this.content = htmlSafe(
      '<span class="quote"><blockquote>Ein langes Zitat</blockquote></span>',
    );

    await render<Context>(hbs`
      <div {{this.collapseQuotes enabled=this.enabled}}>{{this.content}}</div>
    `);

    assert.dom('.quote').doesNotHaveClass('quote-collapsed');
    assert.dom('.quote').doesNotHaveClass('quote-has-header');
    assert.dom('.quote-collapse-toggle').doesNotExist();
    assert.dom('.quote blockquote').hasText('Ein langes Zitat');
  });

  test('it restores collapsible quotes when the rendered content is replaced', async function (this: Context, assert) {
    this.collapseQuotes = collapseQuotes;
    this.enabled = true;
    this.source = {};
    this.content = htmlSafe(
      '<span class="quote" data-author-name="Alice"><a class="quote-header" href="/thread?TID=1&amp;PID=2"><p>Alice</p></a><blockquote>Altes Zitat</blockquote></span>',
    );

    await render<Context>(hbs`
      <div
        {{this.collapseQuotes enabled=this.enabled source=this.source}}
      >{{this.content}}</div>
    `);

    assert.dom('.quote').hasClass('quote-collapsed');
    assert.dom('.quote-collapse-toggle').exists();

    set(
      this,
      'content',
      htmlSafe(
        '<span class="quote" data-author-name="Bob"><a class="quote-header" href="/thread?TID=1&amp;PID=3"><p>Bob</p></a><blockquote>Aktualisiertes Zitat</blockquote></span>',
      ),
    );
    set(this, 'source', {});
    await settled();

    assert.dom('.quote blockquote').hasText('Aktualisiertes Zitat');
    assert.dom('.quote').hasClass('quote-collapsed');
    assert.dom('.quote-collapse-toggle').exists();
    assert
      .dom('.quote-collapse-toggle')
      .hasAttribute('aria-label', 'Zitat von Bob anzeigen');
  });
});
