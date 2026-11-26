import { module, test } from 'qunit';
import {
  getEmojiFilename,
  getPostIconFilename,
} from 'potber-client/utils/icons';

module('Unit | Utility | Icons', function (hooks) {
  const OriginalDate = globalThis.Date;

  hooks.afterEach(function () {
    globalThis.Date = OriginalDate;
  });

  function setDate(isoDate: string) {
    globalThis.Date = new Proxy(OriginalDate, {
      construct(target, args, newTarget) {
        return Reflect.construct(
          target,
          args.length ? args : [isoDate],
          newTarget,
        );
      },
    });
  }

  test('uses standard artwork outside the Christmas season', function (assert) {
    setDate('2026-07-12T12:00:00Z');

    assert.strictEqual(getPostIconFilename('32'), '32.gif');
    assert.strictEqual(getEmojiFilename(':zyklop:'), 'icon1.gif');
  });

  test('uses seasonal artwork when available and keeps the standard fallback', function (assert) {
    setDate('2026-12-15T12:00:00Z');

    assert.strictEqual(getPostIconFilename('32'), '32_christmas.gif');
    assert.strictEqual(getPostIconFilename('2'), '2.gif');
    assert.strictEqual(getPostIconFilename('0'), null);
    assert.strictEqual(getEmojiFilename(':zyklop:'), 'icon1_christmas.gif');
    assert.strictEqual(getEmojiFilename(':zzz:'), 'sleepy.gif');
  });

  test('rejects unknown post icons and emoji', function (assert) {
    assert.throws(() => getPostIconFilename('unknown'), /Cannot find postIcon/);
    assert.throws(() => getEmojiFilename(':unknown:'), /Cannot find emoji/);
  });
});
