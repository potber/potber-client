import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectFindings } from './structural-findings.mjs';

function group(findings) {
  const groups = new Map();
  for (const finding of findings) {
    const key = JSON.stringify([finding.rule, finding.file, finding.subject]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(finding);
  }
  for (const items of groups.values()) items.sort((a, b) => b.value - a.value);
  return groups;
}

// Pair highest with highest so neither added occurrences nor larger findings
// can hide behind the same maximum. Line numbers serve only as locations.
export function regressions(baseline, current) {
  const prior = group(baseline);
  return Array.from(group(current), ([key, items]) =>
    items.flatMap((finding, index) => {
      const old = prior.get(key)?.[index];
      return !old || finding.value > old.value ? [{ finding, old }] : [];
    }),
  ).flat();
}

async function baselineFindings(base, root) {
  const commit = execFileSync('git', ['merge-base', base, 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  const snapshot = mkdtempSync(join(tmpdir(), 'potber-structural-base-'));
  try {
    const archive = execFileSync('git', ['archive', commit], {
      cwd: root,
      maxBuffer: 64 * 1024 * 1024,
    });
    execFileSync('tar', ['-xf', '-'], { cwd: snapshot, input: archive });
    symlinkSync(
      join(root, 'node_modules'),
      join(snapshot, 'node_modules'),
      'dir',
    );
    return await collectFindings(snapshot);
  } finally {
    rmSync(snapshot, { recursive: true, force: true });
  }
}

function githubEscape(value, property = false) {
  const escaped = value
    .replaceAll('%', '%25')
    .replaceAll('\r', '%0D')
    .replaceAll('\n', '%0A');
  return property
    ? escaped.replaceAll(':', '%3A').replaceAll(',', '%2C')
    : escaped;
}

async function main() {
  const [mode = 'check', base = 'origin/main'] = process.argv.slice(2);
  if (!['check', 'report'].includes(mode) || base.startsWith('-')) {
    throw new Error(
      'Usage: node scripts/structural-check.mjs [check|report] [base-ref]',
    );
  }
  const root = resolve('.');
  const baseline = await baselineFindings(base, root);
  const current = await collectFindings(root);
  const problems = regressions(baseline, current);
  for (const { finding, old } of problems) {
    const { rule, file, line, subject, value } = finding;
    const message = `${rule}: ${subject} (${old ? `${old.value} → ` : 'new, '}${value})`;
    console.log(`${file}:${line ?? 1}: ${message}`);
    if (process.env.GITHUB_ACTIONS === 'true' && mode === 'check') {
      console.log(
        `::error file=${githubEscape(file, true)},line=${line ?? 1}::${githubEscape(message)}`,
      );
    }
  }
  console.log(
    `Structural findings: ${baseline.length} at merge base, ${current.length} current, ${problems.length} new or worsened.`,
  );
  if (mode === 'check' && problems.length) process.exitCode = 1;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
