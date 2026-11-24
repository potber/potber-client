import { normalizeSettings } from 'potber-client/services/settings/normalize';
import { Theme } from 'potber-client/services/settings/types';
import {
  preferencesFromSyncValues,
  preferencesToSyncValues,
} from 'potber-client/utils/settings-sync-preferences';
import { module, test } from 'qunit';

module('Unit | Utility | Settings sync preferences', function () {
  const defaults = normalizeSettings({});
  const preferences = { ...defaults, theme: Theme['tokyo-night'], debug: true };

  test('round-trips preferences with their v1 field names', function (assert) {
    const values = preferencesToSyncValues(preferences);

    assert.strictEqual(values['settings.theme'], Theme['tokyo-night']);
    assert.true(values['settings.debug']);
    assert.deepEqual(preferencesFromSyncValues(values, defaults), preferences);
  });

  test('defaults malformed values while preserving valid values', function (assert) {
    const values = {
      ...preferencesToSyncValues(preferences),
      'settings.theme': 'tokyo-night',
    };

    assert.deepEqual(preferencesFromSyncValues(values, defaults), {
      ...preferences,
      theme: Theme.default,
    });
  });

  test('rejects payloads missing an expected preference field', function (assert) {
    const values = preferencesToSyncValues(preferences);
    delete values['settings.theme'];

    assert.throws(
      () => preferencesFromSyncValues(values, defaults),
      /Missing encrypted configuration field: settings\.theme/,
    );
  });
});
