import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { collectFindings } from './structural-findings.mjs';
import { regressions } from './structural-check.mjs';

function finding(value, line = 1) {
  return {
    rule: 'complexity',
    file: 'app/example.ts',
    subject: 'example',
    value,
    line,
  };
}

test('moved and improved findings pass', () => {
  assert.deepEqual(
    regressions([finding(15), finding(12)], [finding(14, 50)]),
    [],
  );
});

test('a second occurrence and worsening below the previous maximum are reported', () => {
  const worst = finding(20);
  assert.deepEqual(regressions([worst], [worst, finding(12)]), [
    { finding: finding(12), old: undefined },
  ]);
  assert.deepEqual(regressions([worst, finding(12)], [worst, finding(13)]), [
    { finding: finding(13), old: finding(12) },
  ]);
});

test('different files and rules have independent findings', () => {
  const original = finding(14);
  const anotherFile = { ...original, file: 'app/another.ts' };
  const anotherRule = { ...original, rule: 'duplication' };
  assert.equal(regressions([original], [anotherFile, anotherRule]).length, 2);
});

test('the installed analyzers flag a duplicated, complex, and unused GTS module', async (t) => {
  const fixture = mkdtempSync('app/utils/structural-probe-');
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  const source = `
    export function calculateManyOptions(flags: boolean[]) {
      const selected = flags[0] || flags[1] || flags[2] || flags[3] ||
        flags[4] || flags[5] || flags[6] || flags[7] ||
        flags[8] || flags[9] || flags[10] || flags[11];
      return selected ? 'fixture choice A' : 'fixture choice B';
    }
  `;
  for (const name of ['first.gts', 'second.gts']) {
    writeFileSync(join(fixture, name), source);
  }
  const findings = (await collectFindings('.')).filter(({ file }) =>
    file.startsWith(fixture + '/'),
  );
  assert.deepEqual(
    new Set(findings.map(({ rule }) => rule)),
    new Set(['complexity', 'duplication', 'unused-file']),
  );
});
