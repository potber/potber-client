import { render, type TestContext } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import type { ChangelogItem } from 'potber-client/assets/changelog';
import ChangelogItemComponent from 'potber-client/components/routes/changelog/changelog-item';
import { setupRenderingTest } from 'potber-client/tests/helpers';

interface Context extends TestContext {
  ChangelogItem: typeof ChangelogItemComponent;
  item: ChangelogItem;
}

module('Integration | Component | Changelog item', function (hooks) {
  setupRenderingTest(hooks);

  for (const [type, heading, prefix, icon] of [
    ['major', 'h2', 'fas', 'star'],
    ['minor', 'h3', 'far', 'star-half-stroke'],
    ['patch', 'h4', 'far', 'star'],
  ] as const) {
    test(`shows the ${type} release heading and icon`, async function (this: Context, assert) {
      this.ChangelogItem = ChangelogItemComponent;
      this.item = {
        type,
        version: 'v1.2.3',
        fixed: ['Restored thread navigation'],
      };

      await render<Context>(hbs`<this.ChangelogItem @item={{this.item}} />`);

      assert.dom(`.changelog-item-header ${heading}`).hasText('1.2.3');
      assert
        .dom(
          `.changelog-item-header [data-prefix="${prefix}"][data-icon="${icon}"]`,
        )
        .exists();
      assert.dom('.changelog-item .title').hasText('Fixed:');
      assert.dom('.changelog-item li').hasText('Restored thread navigation');
    });
  }
});
