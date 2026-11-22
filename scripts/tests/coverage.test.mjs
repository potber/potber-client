import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { checkCoverage, formatCoverageSummary } from '../check-coverage.mjs';

const thresholds = { lines: 45, statements: 44, functions: 32, branches: 38 };
function summary() {
  return {
    total: Object.fromEntries(
      Object.keys(thresholds).map((metric) => [
        metric,
        { total: 100, covered: 50, pct: 50 },
      ]),
    ),
    'app/services/api.ts': {},
    'app/components/board/post/index.gts': {},
  };
}

test('coverage gate accepts a nonempty application report above its floor', () => {
  assert.doesNotThrow(() => checkCoverage(summary(), thresholds));
});

test('coverage gate rejects missing, empty, foreign, and incomplete reports', () => {
  assert.throws(() => checkCoverage({ total: {} }, thresholds));
  const empty = summary();
  empty.total.lines = { total: 0, pct: 'Unknown' };
  assert.throws(() => checkCoverage(empty, thresholds), /no measured lines/);
  const foreign = summary();
  foreign['tests/test-helper.ts'] = {};
  assert.throws(() => checkCoverage(foreign, thresholds), /application source/);
  const missingComponents = summary();
  delete missingComponents['app/components/board/post/index.gts'];
  assert.throws(() => checkCoverage(missingComponents, thresholds), /gts/);
});

test('coverage gate rejects a regression in each metric', () => {
  for (const metric of Object.keys(thresholds)) {
    const regressed = summary();
    regressed.total[metric].pct = thresholds[metric] - 0.01;
    assert.throws(() => checkCoverage(regressed, thresholds), /below/);
  }
});

test('coverage summary shows signed percentage-point changes against the base', () => {
  const base = summary();
  base.total.lines.pct = 49.93;
  base.total.statements.pct = 51.25;
  const report = formatCoverageSummary(summary(), thresholds, base);
  assert.match(
    report,
    /\| lines \| 50 \/ 100 \| 50% \| 45% \| 49.93% \| \+0.07 \|/,
  );
  assert.match(report, /\| statements .* \| 51.25% \| -1.25 \|/);
  assert.match(report, /\| branches .* \| 50% \| 0.00 \|/);
  assert.doesNotMatch(
    formatCoverageSummary(summary(), thresholds),
    /Base coverage/,
  );
});

test('active Babel configuration instruments app code only in coverage mode', () => {
  for (const enabled of [false, true]) {
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import { transformFileAsync } from '@babel/core';
         const app = await transformFileAsync('app/utils/sanitize-html.ts');
         const test = await transformFileAsync('tests/unit/services/app-test.ts');
         console.log(JSON.stringify([app.code.includes('__coverage__'), test.code.includes('__coverage__')]));`,
      ],
      { env: { ...process.env, COVERAGE: String(enabled) }, encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout.trim()), [enabled, false]);
  }
});
