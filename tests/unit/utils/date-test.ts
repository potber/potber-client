import { module, test } from 'qunit';
import { formatDateTime } from 'potber-client/utils/date';

module('Unit | Utils | date', function () {
  test('formats dates in short German date-time format', function (assert) {
    const formatted = formatDateTime(new Date(2025, 2, 27, 14, 5));

    assert.true(formatted.includes('27.03.25'));
    assert.true(formatted.includes('14:05'));
  });

  test('returns an empty string for missing values', function (assert) {
    assert.strictEqual(formatDateTime(undefined), '');
    assert.strictEqual(formatDateTime(null), '');
  });
});
