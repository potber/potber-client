import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { ModalType } from 'potber-client/services/modal';
import type ModalService from 'potber-client/services/modal';
import { setupRenderingTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

module('Integration | Service | Modal', function (hooks) {
  setupRenderingTest(hooks);

  test('opens dialogs modally', async function (assert) {
    await render(hbs`<Modal />`);

    const modal = this.owner.lookup('service:modal') as ModalService;
    await modal.show(ModalType.info, {
      title: 'Information',
      text: 'Modal content',
    });

    const dialog = document.querySelector<HTMLDialogElement>('#modal');
    assert.dom(dialog).exists();
    assert.true(dialog!.matches(':modal'));
  });
});
