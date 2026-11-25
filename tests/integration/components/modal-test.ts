import { click, settled, triggerEvent, waitUntil } from '@ember/test-helpers';
import Service from '@ember/service';
import type { ImgpotImage } from 'potber-client/services/imgpot';
import ModalService from 'potber-client/services/modal';
import { setupRenderingTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

module('Integration | Component | Modal', function (hooks) {
  setupRenderingTest(hooks, { includeModals: true });

  test('settles only after the dialog has opened and closed', async function (assert) {
    const modal = this.owner.lookup('service:modal') as ModalService;
    modal.info({ title: 'Info', text: 'Text' });
    await settled();
    assert.dom('#modal').hasAttribute('open');
    assert.dom('#modal').hasClass('show');

    void modal.close();
    await settled();

    assert.dom('#modal').doesNotHaveAttribute('open');
    assert.strictEqual(modal.activeModal.type, null);
  });

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
    assert.dom('#modal').doesNotHaveAttribute('open');
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
    assert.dom('#modal').doesNotHaveAttribute('open');
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

  module('Imgpot picker', function () {
    const imageData =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    const large = `${imageData}#large`;
    const medium = `${imageData}#medium`;
    const small = `${imageData}#small`;
    const first: ImgpotImage = {
      id: 1,
      originalFilename: 'first.gif',
      variations: [
        { variationType: 'large', cdnUrl: large },
        { variationType: 'medium', cdnUrl: medium },
        { variationType: 'small', cdnUrl: small },
      ],
    };
    const second: ImgpotImage = {
      id: 2,
      originalFilename: 'second.gif',
      variations: [{ variationType: 'large', cdnUrl: large }],
    };
    const images = '.modal-select-imgpot-image';
    const loadMore = '.modal-select-imgpot-load-more';
    const back = '#modal .modal-footer button';

    test('loads more images and selects full and thumbnail URLs', async function (assert) {
      this.owner.register(
        'service:imgpot',
        class extends Service {
          async listImages(page: number, limit: number) {
            assert.step(`${page}/${limit}`);
            return {
              images: page === 1 ? [first] : [second],
              page,
              limit,
              total: 2,
            };
          }
        },
      );
      const modal = this.owner.lookup('service:modal') as ModalService;
      modal.imgpotSelect({
        onSelect(values) {
          assert.deepEqual(values, { src: large, thumbnail: medium });
          assert.step('selected');
        },
      });
      await waitUntil(() => document.querySelector(images));
      assert.dom(`${images} img`).hasAttribute('src', small);

      await click(loadMore);
      assert.dom(images).exists({ count: 2 });
      assert.dom(`${images} img[alt="second.gif"]`).hasAttribute('src', large);
      assert.dom(loadMore).doesNotExist();

      await click(`${images}:first-child`);
      assert.verifySteps(['1/20', '2/20', 'selected']);
    });

    test('shows the empty state and calls the back action', async function (assert) {
      this.owner.register(
        'service:imgpot',
        class extends Service {
          async listImages() {
            return { images: [], page: 1, limit: 20, total: 0 };
          }
        },
      );
      const modal = this.owner.lookup('service:modal') as ModalService;
      modal.imgpotSelect({
        onSelect: () => assert.step('selected'),
        onCancel: () => assert.step('back'),
      });
      await settled();

      assert
        .dom('#modal')
        .includesText('Du hast noch keine Bilder hochgeladen.');
      assert.dom(images).doesNotExist();
      await click(back);
      assert.verifySteps(['back']);
    });

    test('displays a loading error and closes when there is no back action', async function (assert) {
      this.owner.register(
        'service:imgpot',
        class extends Service {
          async listImages() {
            throw new Error('Bildliste nicht verfügbar');
          }
        },
      );
      const modal = this.owner.lookup('service:modal') as ModalService;
      modal.imgpotSelect({ onSelect: () => assert.step('selected') });
      await settled();

      assert.dom('#modal').includesText('Bildliste nicht verfügbar');
      assert.dom(loadMore).doesNotExist();
      await click(back);
      assert.dom('#modal').doesNotHaveAttribute('open');
      assert.verifySteps([]);
    });
  });
});
