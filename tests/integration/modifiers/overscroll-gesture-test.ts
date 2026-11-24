import { module, test } from 'qunit';
import { find, render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import type { TestContext } from '@ember/test-helpers';
import OverscrollContainer from 'potber-client/components/features/gestures/overscroll-container';
import overscrollGesture from 'potber-client/modifiers/overscroll-gesture';
import { dispatchDrag } from 'potber-client/tests/helpers/dispatch-drag';
import { setupRenderingTest } from 'potber-client/tests/helpers';

interface Context extends TestContext {
  OverscrollContainer: typeof OverscrollContainer;
  handleOverscroll: () => void;
  overscrollGesture: typeof overscrollGesture;
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

  test('requires a long pull in the expected direction starting at the scroll edge', async function (this: Context, assert) {
    this.overscrollGesture = overscrollGesture;
    this.handleOverscroll = () => assert.step('overscroll');

    await render<Context>(hbs`
      <div id='test-scroll' style='height:100px; overflow:auto'>
        <div style='height:300px'>
          <div data-test-gesture {{this.overscrollGesture
            direction='down'
            scrollContainer='test-scroll'
            minimumPullDistance=40
            onOverscroll=this.handleOverscroll
          }}></div>
        </div>
      </div>
    `);

    const container = find('#test-scroll');
    const target = find('[data-test-gesture]');
    if (
      !(container instanceof HTMLElement) ||
      !(target instanceof HTMLElement)
    ) {
      throw new Error('Missing gesture fixture');
    }

    container.scrollTop = 50;
    dispatchDrag(target, [30, 30], [30, 100]);
    container.scrollTop = 0;
    dispatchDrag(target, [30, 30], [30, 50]);
    dispatchDrag(target, [30, 100], [30, 30]);
    dispatchDrag(target, [30, 30], [120, 100]);
    dispatchDrag(target, [30, 30], [30, 100]);

    assert.verifySteps(['overscroll']);
  });
});
