import Service from '@ember/service';
import {
  clearRender,
  find,
  render,
  type TestContext,
} from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import sidebarCloseGesture from 'potber-client/modifiers/sidebar-close-gesture';
import sidebarEdgeOpenGesture from 'potber-client/modifiers/sidebar-edge-open-gesture';
import { Gestures } from 'potber-client/services/settings';
import { dispatchDrag } from 'potber-client/tests/helpers/dispatch-drag';
import { setupRenderingTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

class SettingsStub extends Service {
  gestures = Gestures.all;
  right = false;

  getSetting() {
    return this.gestures;
  }

  isRightSidebar() {
    return this.right;
  }
}

class RendererStub extends Service {
  isDesktop = false;
  sidebarExpanded = false;
  actions: string[] = [];
  widths: number[] = [];

  getStyleVariable() {
    return '0px';
  }

  openSidebar() {
    this.actions.push('open');
  }

  closeSidebar() {
    this.actions.push('close');
  }

  dragSidebar(width: number) {
    this.widths.push(width);
  }
}

interface Context extends TestContext {
  edgeOpen: typeof sidebarEdgeOpenGesture;
  close: typeof sidebarCloseGesture;
  renderer: RendererStub;
  settings: SettingsStub;
}

function gestureTarget(): HTMLElement {
  const element = find('[data-test-gesture]');
  if (!(element instanceof HTMLElement))
    throw new Error('Missing gesture target');
  return element;
}

module('Integration | Modifier | sidebar gestures', function (hooks) {
  setupRenderingTest(hooks);
  const rootStyle = document.documentElement.style;
  const widthVariable = '--sidebar-expanded-width';
  let previousWidth: string;

  hooks.beforeEach(function (this: Context) {
    previousWidth = rootStyle.getPropertyValue(widthVariable);
    rootStyle.setProperty(widthVariable, '200px');
    this.owner.register('service:settings', SettingsStub);
    this.owner.register('service:renderer', RendererStub);
    this.settings = this.owner.lookup('service:settings') as SettingsStub;
    this.renderer = this.owner.lookup('service:renderer') as RendererStub;
    this.edgeOpen = sidebarEdgeOpenGesture;
    this.close = sidebarCloseGesture;
  });

  hooks.afterEach(function () {
    if (previousWidth) rootStyle.setProperty(widthVariable, previousWidth);
    else rootStyle.removeProperty(widthVariable);
  });

  test('ignores a vertical drag and a drag outside the opening edge', async function (this: Context, assert) {
    await render<Context>(hbs`<div data-test-gesture {{this.edgeOpen}}></div>`);
    const target = gestureTarget();

    dispatchDrag(target, [40, 20], [48, 100]);
    dispatchDrag(target, [200, 20], [350, 20]);

    assert.deepEqual(this.renderer.actions, []);
    assert.deepEqual(this.renderer.widths, []);
  });

  test('opens from either edge after passing the distance threshold', async function (this: Context, assert) {
    await render<Context>(hbs`<div data-test-gesture {{this.edgeOpen}}></div>`);
    const target = gestureTarget();

    dispatchDrag(target, [40, 20], [95, 20]);
    dispatchDrag(target, [40, 20], [180, 20]);

    this.settings.right = true;
    dispatchDrag(
      target,
      [window.innerWidth - 40, 20],
      [window.innerWidth - 180, 20],
    );

    assert.deepEqual(this.renderer.actions, ['close', 'open', 'open']);
    assert.true(this.renderer.widths.some((width) => width > 100));
  });

  test('removes the page-wide opening listener on teardown', async function (this: Context, assert) {
    await render<Context>(hbs`<div data-test-gesture {{this.edgeOpen}}></div>`);
    await clearRender();
    await render(hbs`<div data-test-gesture></div>`);

    dispatchDrag(gestureTarget(), [40, 20], [180, 20]);

    assert.deepEqual(this.renderer.actions, []);
    assert.deepEqual(this.renderer.widths, []);
  });

  test('snaps back after short or wrong-way drags and closes after a long drag', async function (this: Context, assert) {
    await render<Context>(hbs`<div data-test-gesture {{this.close}}></div>`);
    const target = gestureTarget();
    // Synthetic pointer events do not have a browser-managed capture target.
    target.setPointerCapture = () => undefined;

    dispatchDrag(target, [180, 20], [140, 20]);
    dispatchDrag(target, [100, 20], [150, 20]);
    dispatchDrag(target, [180, 20], [40, 20]);

    assert.deepEqual(this.renderer.actions, ['open', 'open', 'close']);
    assert.true(this.renderer.widths.includes(160));
  });

  test('does not attach the close gesture in desktop mode', async function (this: Context, assert) {
    this.renderer.isDesktop = true;
    await render<Context>(hbs`<div data-test-gesture {{this.close}}></div>`);
    dispatchDrag(gestureTarget(), [180, 20], [40, 20]);

    assert.deepEqual(this.renderer.actions, []);
    assert.deepEqual(this.renderer.widths, []);
  });
});
