import {
  click,
  fillIn,
  findAll,
  settled,
  triggerEvent,
  waitUntil,
} from '@ember/test-helpers';
import Service from '@ember/service';
import type { ImgpotImage } from 'potber-client/services/imgpot';
import { ListType } from 'potber-client/components/modal/types/list';
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

  test('uses the destructive submit variant and can hide cancellation', async function (assert) {
    const modal = this.owner.lookup('service:modal') as ModalService;
    modal.confirm({
      title: 'Remove data',
      text: 'Remove this entry?',
      variant: 'error',
      hideCancel: true,
      onSubmit: () => assert.step('submitted'),
    });
    await settled();

    assert.dom('#modal .modal-footer button').exists({ count: 1 });
    assert.dom('#modal button.modal-submit').hasText('OK');
    assert.dom('#modal button.modal-submit').hasClass('control-variant-error');
    await click('#modal button.modal-submit');
    assert.verifySteps(['submitted']);
  });

  test('closes a confirmation and invokes its cancel callback', async function (assert) {
    const modal = this.owner.lookup('service:modal') as ModalService;
    modal.confirm({
      title: 'Choose data',
      text: 'Continue?',
      onCancel: () => assert.step('cancelled'),
    });
    await settled();

    assert
      .dom('#modal .modal-footer button[type="button"]')
      .hasText('Abbrechen');
    await click('#modal .modal-footer button[type="button"]');

    assert.dom('#modal').doesNotHaveAttribute('open');
    assert.verifySteps(['cancelled']);
  });

  test('allows choosing no post icon', async function (assert) {
    const modal = this.owner.lookup('service:modal') as ModalService;
    modal.iconSelect({
      type: 'post-icon',
      onSelect: (key) => assert.step(key),
    });
    await settled();

    assert.dom('#modal').includesText('Wähle ein Post-Icon');
    assert
      .dom('#modal img[alt="2"]')
      .hasAttribute('src', '/images/post-icons/2.gif');
    await click('.modal-select-icon-option-container button:first-child');
    assert.verifySteps(['0']);
  });

  test('selects an emoji key from the emoji picker', async function (assert) {
    const modal = this.owner.lookup('service:modal') as ModalService;
    modal.iconSelect({
      type: 'post-emoji',
      onSelect: (key) => assert.step(key),
    });
    await settled();

    assert.dom('#modal').includesText('Wähle einen Emoji');
    assert
      .dom('#modal img[alt=":zzz:"]')
      .hasAttribute('src', '/images/post-emojis/sleepy.gif');
    await click(
      '.modal-select-icon-option-container button:has(img[alt=":zzz:"])',
    );
    assert.verifySteps([':zzz:']);

    await click('#modal .modal-footer button');
    assert.dom('#modal').doesNotHaveAttribute('open');
  });

  test('inserts and removes list entries while preserving the chosen list type', async function (assert) {
    const modal = this.owner.lookup('service:modal') as ModalService;
    modal.list({
      onSubmit(type, entries) {
        assert.strictEqual(type, ListType.Alphabetical);
        assert.deepEqual(entries, ['Keep me']);
        assert.step('submitted');
      },
    });
    await settled();

    const last = '#list-modal-form .list-modal-entry:last-child';
    const remove = 'button:has([data-icon="minus"])';
    assert.dom('#list-modal-form .list-modal-entry').exists({ count: 1 });
    await fillIn('#list-modal-form .list-modal-entry input', 'Remove me');
    const firstEntry = findAll('#list-modal-form .list-modal-entry')[0];
    const addButton = firstEntry?.querySelector(
      'button:has([data-icon="plus"])',
    );
    if (!addButton) throw new Error('Add list entry action missing');
    await click(addButton);
    await fillIn(`${last} input`, 'Keep me');
    await click(addButton);

    for (const remaining of [2, 1]) {
      const removeButton = findAll(
        '#list-modal-form .list-modal-entry',
      )[0]?.querySelector(remove);
      if (!removeButton) throw new Error('Remove list entry action missing');
      await click(removeButton);
      assert
        .dom('#list-modal-form .list-modal-entry')
        .exists({ count: remaining });
    }

    assert.dom(`${last} input`).hasValue('Keep me');
    assert.dom(`${last} ${remove}`).doesNotExist();
    await click('#list-modal-form .dropdown-toggle');
    await click('#list-modal-form .dropdown-item:last-child');
    await click('#modal button[type="submit"]');

    assert.verifySteps(['submitted']);
  });

  test('shows a private last login and a fallback title for an unnamed profile', async function (assert) {
    const modal = this.owner.lookup('service:modal') as ModalService;
    modal.userProfile({ user: { id: '42' } });
    await settled();

    assert.dom('#modal .modal-header h3').hasText('Unbekannt');
    assert.dom('#modal .user-profile i').hasText('privat');
    assert.dom('#modal .user-profile .avatar').doesNotExist();
    assert.dom('#modal .user-profile a').hasText('42');
    assert
      .dom('#modal .user-profile a')
      .hasAttribute('rel', 'noopener noreferrer');
    await click('#modal .modal-footer button');
    assert.dom('#modal').doesNotHaveAttribute('open');
  });

  test('renders the avatar and a public last login for a named profile', async function (assert) {
    const modal = this.owner.lookup('service:modal') as ModalService;
    const avatarUrl =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    modal.userProfile({
      user: { id: '42', name: 'Forum member', avatarUrl, lastLogin: 'Heute' },
    });
    await settled();

    assert.dom('#modal .modal-header h3').hasText('Forum member');
    assert
      .dom('#modal .user-profile .avatar img')
      .hasAttribute('src', avatarUrl);
    assert.dom('#modal .user-profile').includesText('Heute');
    assert.dom('#modal .user-profile i').doesNotExist();
  });

  test('keeps the custom link label when the URL changes', async function (assert) {
    const modal = this.owner.lookup('service:modal') as ModalService;
    modal.linkInsert({
      onSubmit(url, label) {
        assert.strictEqual(url, 'https://example.com/updated');
        assert.strictEqual(label, 'Custom label');
        assert.step('submitted');
      },
    });
    await settled();

    const url = '#link-insert-modal-form input[type="url"]';
    const label = '#link-insert-modal-form input[type="text"]';
    await fillIn(url, 'https://example.com/original');
    assert.dom(label).hasValue('https://example.com/original');
    await fillIn(label, 'Custom label');
    await fillIn(url, 'https://example.com/updated');
    assert.dom(label).hasValue('Custom label');

    await click('#modal button[type="submit"]');
    assert.verifySteps(['submitted']);
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

    test('falls back to a medium preview and handles an image with no variants', async function (assert) {
      const mediumOnly: ImgpotImage = {
        id: 1,
        originalFilename: 'medium.gif',
        variations: [{ variationType: 'medium', cdnUrl: medium }],
      };
      const noVariants: ImgpotImage = {
        id: 2,
        originalFilename: 'missing.gif',
        variations: [],
      };
      this.owner.register(
        'service:imgpot',
        class extends Service {
          async listImages() {
            return {
              images: [mediumOnly, noVariants],
              page: 1,
              limit: 20,
              total: 2,
            };
          }
        },
      );
      const modal = this.owner.lookup('service:modal') as ModalService;

      modal.imgpotSelect({ onSelect: () => assert.step('selected') });
      await settled();

      assert.dom(`${images} img[alt="medium.gif"]`).hasAttribute('src', medium);
      assert.dom(`${images} img[alt="missing.gif"]`).hasAttribute('src', '');
      assert.verifySteps([]);
    });

    test('shows the generic message for a failure without error details', async function (assert) {
      this.owner.register(
        'service:imgpot',
        class extends Service {
          listImages() {
            return Promise.reject();
          }
        },
      );
      const modal = this.owner.lookup('service:modal') as ModalService;

      modal.imgpotSelect({ onSelect: () => assert.step('selected') });
      await settled();

      assert.dom('#modal').includesText('Bilder konnten nicht geladen werden.');
      assert.dom(images).doesNotExist();
      assert.verifySteps([]);
    });
  });

  module('Image insertion', function () {
    const form = '#image-insert-modal-form';
    const source = `${form} input[type="url"]:required`;
    const thumbnail = `${form} input[type="url"]:not(:required)`;
    const large = 'https://images.example/full.gif';
    const medium = 'https://images.example/preview.gif';

    test('keeps the entered URLs when returning from the Imgpot picker', async function (assert) {
      this.owner.register(
        'service:imgpot',
        class extends Service {
          async listImages() {
            return { images: [], page: 1, limit: 20, total: 0 };
          }
        },
      );
      const modal = this.owner.lookup('service:modal') as ModalService;
      modal.imageInsert({
        onSubmit(values) {
          assert.deepEqual(values, { src: large, thumbnail: medium });
          assert.step('submitted');
        },
      });
      await settled();
      await fillIn(source, large);
      await fillIn(thumbnail, medium);
      await click(`${form} button:has([data-icon="images"])`);
      assert
        .dom('#modal')
        .includesText('Du hast noch keine Bilder hochgeladen.');

      await click('#modal .modal-footer button');
      assert.dom(source).hasValue(large);
      assert.dom(thumbnail).hasValue(medium);
      await click('#modal button[type="submit"]');
      assert.verifySteps(['submitted']);
    });

    test('shows an upload failure and fills the URLs after retrying the same file', async function (assert) {
      let attempts = 0;
      this.owner.register(
        'service:imgpot',
        class extends Service {
          async uploadImage(file: File): Promise<ImgpotImage> {
            assert.strictEqual(file.name, 'image.gif');
            attempts++;
            if (attempts === 1) throw new Error('Upload fehlgeschlagen');
            return {
              id: 1,
              originalFilename: file.name,
              variations: [
                { variationType: 'large', cdnUrl: large },
                { variationType: 'medium', cdnUrl: medium },
              ],
            };
          }
        },
      );
      const modal = this.owner.lookup('service:modal') as ModalService;
      modal.imageInsert({ onSubmit: () => assert.step('submitted') });
      await settled();
      const input = document.querySelector<HTMLInputElement>(
        `${form} input[type="file"]`,
      );
      if (!input) throw new Error('Image upload input is missing');

      await triggerEvent(input, 'change');
      assert.strictEqual(attempts, 0);
      const file = new File(['image'], 'image.gif', { type: 'image/gif' });
      const selectFile = async () => {
        const selection = new DataTransfer();
        selection.items.add(file);
        input.files = selection.files;
        await triggerEvent(input, 'change');
      };
      await selectFile();

      assert.dom('#modal').includesText('Upload fehlgeschlagen');
      assert.dom(input).hasValue('');
      assert.dom(source).hasValue('');

      await selectFile();

      assert.strictEqual(attempts, 2);
      assert.dom('#modal').doesNotIncludeText('Upload fehlgeschlagen');
      assert.dom(input).hasValue('');
      assert.dom(source).hasValue(large);
      assert.dom(thumbnail).hasValue(medium);
      assert.verifySteps([]);
    });

    test('prevents submitting an invalid URL and shows a generic upload failure', async function (assert) {
      this.owner.register(
        'service:imgpot',
        class extends Service {
          uploadImage() {
            return Promise.reject();
          }
        },
      );
      const modal = this.owner.lookup('service:modal') as ModalService;
      modal.imageInsert({ onSubmit: () => assert.step('submitted') });
      await settled();

      await fillIn(source, 'not a URL');
      await triggerEvent(form, 'submit');
      assert.verifySteps([]);

      const input = document.querySelector<HTMLInputElement>(
        `${form} input[type="file"]`,
      );
      if (!input) throw new Error('Image upload input is missing');
      const selection = new DataTransfer();
      selection.items.add(
        new File(['image'], 'image.gif', { type: 'image/gif' }),
      );
      input.files = selection.files;
      await triggerEvent(input, 'change');

      assert
        .dom('#modal')
        .includesText('Bild konnte nicht hochgeladen werden.');
      assert.dom(source).hasValue('not a URL');
      assert.dom(input).hasValue('');
      assert.verifySteps([]);
    });
  });
});
