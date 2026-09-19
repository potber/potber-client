import { click, settled, triggerEvent, waitUntil } from '@ember/test-helpers';
import ModalService from 'potber-client/services/modal';
import { setupRenderingTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

module('Integration | Component | Modal', function (hooks) {
  setupRenderingTest(hooks, { includeModals: true });

  test('runs input cancellation when Escape dismisses the dialog', async function (assert) {
    const modal = this.owner.lookup('service:modal') as ModalService;
    let cancellations = 0;
    modal.input({
      title: 'Recovery key',
      label: 'Key',
      onCancel: () => cancellations++,
    });
    await settled();

    await triggerEvent('#modal', 'cancel');

    assert.strictEqual(cancellations, 1);
    await waitUntil(
      () => !(document.querySelector('#modal') as HTMLDialogElement).open,
    );
  });

  test('runs input cancellation when the backdrop dismisses the dialog', async function (assert) {
    const modal = this.owner.lookup('service:modal') as ModalService;
    let cancellations = 0;
    modal.input({
      title: 'Recovery key',
      label: 'Key',
      onCancel: () => cancellations++,
    });
    await settled();

    await click('#modal-backdrop');

    assert.strictEqual(cancellations, 1);
    await waitUntil(
      () => !(document.querySelector('#modal') as HTMLDialogElement).open,
    );
  });

  test('offers a distinct alternative action in confirm modals', async function (assert) {
    const modal = this.owner.lookup('service:modal') as ModalService;
    let alternatives = 0;
    let submissions = 0;
    modal.confirm({
      title: 'Choose data',
      text: 'Use remote or local data?',
      submitLabel: 'Use remote',
      alternativeLabel: 'Upload local',
      alternativeVariant: 'error',
      onSubmit: () => submissions++,
      onAlternative: () => alternatives++,
    });
    await settled();

    assert.dom('[data-test-modal-alternative]').hasText('Upload local');
    assert
      .dom('[data-test-modal-alternative]')
      .hasClass('control-variant-error');
    await click('[data-test-modal-alternative]');

    assert.strictEqual(alternatives, 1);
    assert.strictEqual(submissions, 0);
  });
});
