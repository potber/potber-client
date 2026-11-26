import { click, render, settled, type TestContext } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import maskBlockedQuotes from 'potber-client/modifiers/mask-blocked-quotes';
import type SocialsService from 'potber-client/services/socials';
import { setupRenderingTest } from 'potber-client/tests/helpers';

interface Context extends TestContext {
  maskBlockedQuotes: typeof maskBlockedQuotes;
}

module('Integration | Modifier | mask-blocked-quotes', function (hooks) {
  setupRenderingTest(hooks);

  const mask = '[data-blocked-quote-mask="true"]';

  hooks.beforeEach(function (this: Context) {
    this.maskBlockedQuotes = maskBlockedQuotes;
  });

  test('masks blocked authors by name or ID and lets the user reveal one quote', async function (this: Context, assert) {
    const socials = this.owner.lookup('service:socials') as SocialsService;
    socials.blockedUsers = [{ id: '42', name: 'Alice' }];

    await render<Context>(hbs`
      <div {{this.maskBlockedQuotes className='quote-mask'}}>
        <span class='quote' data-author-name='Alice'>
          <blockquote>Quote by name</blockquote>
        </span>
        <span class='quote' data-author-name='42'>
          <blockquote>Quote by ID</blockquote>
        </span>
        <span class='quote' data-author-name='Bob'>
          <blockquote>Unblocked quote</blockquote>
        </span>
        <span class='quote'>
          <blockquote>Quote with unknown author</blockquote>
        </span>
        <span class='quote' data-author-name='Alice'>Missing quote body</span>
      </div>
    `);

    const byName = `[data-author-name="Alice"] blockquote > button${mask}`;
    const byId = `[data-author-name="42"] blockquote > button${mask}`;
    assert.dom(mask).exists({ count: 2 });
    assert.dom(byName).hasClass('quote-mask');
    assert.dom(byId).hasClass('quote-mask');

    await click(byName);

    assert.dom(byName).doesNotExist();
    assert.dom(byId).exists();
    assert.true(socials.isUserBlocked('42'));
  });

  test('updates existing masks when the blocklist changes', async function (this: Context, assert) {
    const socials = this.owner.lookup('service:socials') as SocialsService;
    socials.blockedUsers = [{ id: '42', name: 'Alice' }];

    await render<Context>(hbs`
      <div {{this.maskBlockedQuotes className='quote-mask'}}>
        <span class='quote' data-author-name='Alice'>
          <blockquote>First quote</blockquote>
        </span>
        <span class='quote' data-author-name='Bob'>
          <blockquote>Second quote</blockquote>
        </span>
      </div>
    `);

    assert.dom(`[data-author-name="Alice"] ${mask}`).exists();

    socials.blockedUsers = [{ id: '43', name: 'Bob' }];
    await settled();
    assert.dom(`[data-author-name="Alice"] ${mask}`).doesNotExist();
    assert.dom(`[data-author-name="Bob"] ${mask}`).exists({ count: 1 });

    socials.blockedUsers = [];
    await settled();
    assert.dom(mask).doesNotExist();
  });
});
