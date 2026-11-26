import {
  click,
  find,
  render,
  triggerEvent,
  type TestContext,
} from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import Dropdown from 'potber-client/components/common/control/dropdown';
import type { DropdownOption } from 'potber-client/components/common/control/dropdown/types';
import { setupRenderingTest } from 'potber-client/tests/helpers';

interface Context extends TestContext {
  Dropdown: typeof Dropdown;
  options: DropdownOption<string>[];
  selected?: DropdownOption<string>;
  select?: (option: DropdownOption<string>) => void;
}

module('Integration | Component | Dropdown', function (hooks) {
  setupRenderingTest(hooks);

  const dark = { label: 'Dark', data: 'dark' };
  const light = { label: 'Light', data: 'light' };
  const toggle = '.dropdown-toggle';
  const caption = '.dropdown-toggle-caption';
  const menu = '.dropdown-menu';
  const expanded = 'dropdown-menu-visible';

  hooks.beforeEach(function (this: Context) {
    this.Dropdown = Dropdown;
    this.options = [light, dark];
  });

  test('keeps the menu open when focus moves to an option and closes on selection', async function (this: Context, assert) {
    await render<Context>(hbs`
      <this.Dropdown @label='Theme' @options={{this.options}} />
    `);

    assert.dom(caption).hasText('Light');
    await click(toggle);
    assert.dom(menu).hasClass(expanded);

    const option = find('.dropdown-item:last-child');
    await triggerEvent(toggle, 'blur', { relatedTarget: option });
    assert.dom(menu).hasClass(expanded);

    await click('.dropdown-item:last-child');
    assert.dom(menu).doesNotHaveClass(expanded);
    assert.dom(caption).hasText('Dark');
  });

  test('displays a supplied default and reports a selection to the caller', async function (this: Context, assert) {
    this.selected = dark;
    this.select = ({ data }) => assert.step(data);

    await render<Context>(hbs`
      <this.Dropdown @label='Theme' @options={{this.options}}
        @default={{this.selected}} @onSelect={{this.select}} @size='small' />
    `);

    assert.dom('.dropdown').hasClass('control-size-small');
    assert.dom(caption).hasText('Dark');
    await click(toggle);
    await click('.dropdown-item:first-child');
    assert.verifySteps(['light']);
    assert.dom(caption).hasText('Dark');
  });

  test('renders an empty option list and closes when focus leaves', async function (this: Context, assert) {
    this.options = [];

    await render<Context>(hbs`
      <this.Dropdown @label='Theme' @options={{this.options}} />
    `);

    assert.dom(caption).hasNoText();
    assert.dom('.dropdown-item').doesNotExist();
    await click(toggle);
    assert.dom(menu).hasClass(expanded);
    await click(toggle);
    assert.dom(menu).doesNotHaveClass(expanded);
    await click(toggle);
    await triggerEvent(toggle, 'blur', { relatedTarget: null });
    assert.dom(menu).doesNotHaveClass(expanded);
  });
});
