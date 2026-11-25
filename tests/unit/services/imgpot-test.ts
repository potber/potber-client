import Service from '@ember/service';
import { module, test } from 'qunit';
import {
  getImgpotInsertValues,
  type ImgpotImageVariation,
} from 'potber-client/services/imgpot';
import type ImgpotService from 'potber-client/services/imgpot';
import { setupTest } from 'potber-client/tests/helpers';

const image = {
  id: 1,
  originalFilename: 'sample.png',
  variations: [
    { variationType: 'small', cdnUrl: 'https://images.example/sample.png' },
  ],
};

module('Unit | Service | Imgpot | Responses', function (hooks) {
  setupTest(hooks);

  let originalFetch: typeof fetch;
  let accessToken: string | undefined;

  hooks.beforeEach(function () {
    originalFetch = globalThis.fetch;
    accessToken = 'test-token';
    this.owner.register(
      'service:session',
      class extends Service {
        get accessToken() {
          return accessToken;
        }
      },
    );
  });

  hooks.afterEach(function () {
    globalThis.fetch = originalFetch;
  });

  test('validates image lists and their nested variations', async function (assert) {
    const service = this.owner.lookup('service:imgpot') as ImgpotService;
    const list = { images: [image], page: 1, limit: 20, total: 1 };
    globalThis.fetch = async () => Response.json(list);
    assert.deepEqual(await service.listImages(), list);

    globalThis.fetch = async () =>
      Response.json({ ...list, images: [{ ...image, variations: [{}] }] });
    await assert.rejects(service.listImages(), /ungültige Antwort/);
  });

  test('validates uploads and rejects empty success bodies', async function (assert) {
    const service = this.owner.lookup('service:imgpot') as ImgpotService;
    const file = new File(['sample'], 'sample.png');
    globalThis.fetch = async () => Response.json(image, { status: 201 });
    assert.deepEqual(await service.uploadImage(file), image);

    globalThis.fetch = async () => new Response(null, { status: 201 });
    await assert.rejects(service.uploadImage(file), /ungültige Antwort/);
  });

  test('uses a fallback for malformed errors and preserves a valid message', async function (assert) {
    const service = this.owner.lookup('service:imgpot') as ImgpotService;
    globalThis.fetch = async () =>
      Response.json({ message: 502 }, { status: 502 });
    await assert.rejects(service.listImages(), /Imgpot-Anfrage fehlgeschlagen/);

    globalThis.fetch = async () =>
      Response.json({ message: 'Unauthorized' }, { status: 401 });
    await assert.rejects(service.listImages(), /Unauthorized/);
  });

  test('rejects a signed-out request before calling fetch', async function (assert) {
    const service = this.owner.lookup('service:imgpot') as ImgpotService;
    accessToken = undefined;
    globalThis.fetch = async () => {
      assert.step('fetch');
      return Response.json({});
    };

    await assert.rejects(service.listImages(), /Nicht authentifiziert/);
    assert.verifySteps([]);
  });
});

module('Unit | Service | Imgpot | Insert values', function () {
  const large: ImgpotImageVariation = {
    variationType: 'large',
    cdnUrl: 'https://images.example/large.png',
  };
  const medium: ImgpotImageVariation = {
    variationType: 'medium',
    cdnUrl: 'https://images.example/medium.png',
  };
  const small: ImgpotImageVariation = {
    variationType: 'small',
    cdnUrl: 'https://images.example/small.png',
  };

  test('uses the large image as the link and the medium image as the thumbnail', function (assert) {
    assert.deepEqual(
      getImgpotInsertValues({ variations: [small, medium, large] }),
      {
        src: large.cdnUrl,
        thumbnail: medium.cdnUrl,
      },
    );
  });

  test('uses one image when the full and inline URLs are the same', function (assert) {
    assert.deepEqual(
      getImgpotInsertValues({
        variations: [large, { ...medium, cdnUrl: large.cdnUrl }],
      }),
      { src: large.cdnUrl, thumbnail: '' },
    );
  });

  test('falls back to an available variant or rejects an empty list', function (assert) {
    for (const variation of [medium, large, small]) {
      assert.deepEqual(
        getImgpotInsertValues({ variations: [variation] }),
        {
          src: variation.cdnUrl,
          thumbnail: '',
        },
        variation.variationType,
      );
    }

    assert.throws(
      () => getImgpotInsertValues({ variations: [] }),
      /keine verwendbaren Varianten/,
    );
  });
});
