import {
  parseSettingsPayload,
  serializeSettingsPayload,
  valuesFromPayload,
} from 'potber-client/services/settings-sync/payload';
import { module, test } from 'qunit';

module('Unit | Utils | Settings sync payload', function () {
  test('reads and writes the existing v1 field and clock format', function (assert) {
    const v1 =
      '{"schemaVersion":1,"fields":{"settings.theme":{"value":"tokyo-night","clock":{"modifiedAt":1,"deviceId":"legacy-device"}}}}';
    const fields = {
      'settings.theme': {
        value: 'tokyo-night',
        clock: { modifiedAt: 1, deviceId: 'legacy-device' },
      },
    };

    const payload = parseSettingsPayload(v1);

    assert.deepEqual(payload.fields, fields);
    assert.deepEqual(valuesFromPayload(payload), {
      'settings.theme': 'tokyo-night',
    });
    assert.strictEqual(serializeSettingsPayload(fields), v1);
  });

  test('rejects unsupported payload versions and malformed field clocks', function (assert) {
    assert.throws(
      () => parseSettingsPayload('{"schemaVersion":2,"fields":{}}'),
      /Invalid encrypted settings payload/,
    );
    assert.throws(
      () =>
        parseSettingsPayload(
          '{"schemaVersion":1,"fields":{"settings.theme":{"value":"tokyo-night","clock":{"modifiedAt":"1","deviceId":"legacy-device"}}}}',
        ),
      /Invalid encrypted settings payload/,
    );
  });
});
