import { module, test } from 'qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import type { TestContext } from '@ember/test-helpers';
import OverscrollContainer from 'potber-client/components/features/gestures/overscroll-container';
import { setupRenderingTest } from 'potber-client/tests/helpers';

interface Context extends TestContext {
  OverscrollContainer: typeof OverscrollContainer;
  handleOverscroll: () => void;
}

module('Integration | Modifier | overscroll-gesture', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders while disabled', async function (this: Context, assert) {
    this.OverscrollContainer = OverscrollContainer;
    this.handleOverscroll = () => {
      assert.step('overscroll');
    };

    await render<Context>(hbs`
      <this.OverscrollContainer
        @direction='up'
        @onOverscroll={{this.handleOverscroll}}
        @disabled={{true}}
      >
        <span data-overscroll-indicator></span>
      </this.OverscrollContainer>
    `);

    assert.dom('[data-overscroll-indicator]').exists();
    assert.verifySteps([]);
  });
});
