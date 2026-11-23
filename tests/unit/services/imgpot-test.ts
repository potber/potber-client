import Service from '@ember/service';
import { module, test } from 'qunit';
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

  hooks.beforeEach(function () {
    originalFetch = globalThis.fetch;
    this.owner.register(
      'service:session',
      class extends Service {
        data = { authenticated: { access_token: 'test-token' } };
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
});
