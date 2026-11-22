import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const metrics = ['lines', 'statements', 'functions', 'branches'];

export function checkCoverage(summary, thresholds) {
  const files = Object.keys(summary).filter((file) => file !== 'total');
  if (!files.length || files.some((file) => !file.startsWith('app/'))) {
    throw new Error('Coverage must contain application source files only.');
  }
  if (!files.some((file) => file.endsWith('.gts'))) {
    throw new Error('Coverage is missing Ember .gts components.');
  }
  for (const metric of metrics) {
    const result = summary.total?.[metric];
    if (!result || !Number.isFinite(result.pct) || result.total <= 0) {
      throw new Error(`Coverage has no measured ${metric}.`);
    }
    if (result.pct < thresholds[metric]) {
      throw new Error(
        `${metric} coverage ${result.pct}% is below ${thresholds[metric]}%.`,
      );
    }
  }
}

export function formatCoverageSummary(summary, thresholds, baseline) {
  const header = ['Metric', 'Covered', 'Coverage', 'Minimum'];
  if (baseline) header.push('Base coverage', 'Change (pp)');
  const rows = metrics.map((metric) => {
    const { covered, total, pct } = summary.total[metric];
    const row = [
      metric,
      `${covered} / ${total}`,
      `${pct}%`,
      `${thresholds[metric]}%`,
    ];
    if (baseline) {
      const base = baseline.total?.[metric]?.pct;
      if (!Number.isFinite(base)) {
        throw new Error(`Baseline coverage has no measured ${metric}.`);
      }
      const delta = Math.round((pct - base) * 100) / 100;
      row.push(`${base}%`, `${delta > 0 ? '+' : ''}${delta.toFixed(2)}`);
    }
    return row;
  });
  const table = [
    header,
    ['---', ...header.slice(1).map(() => '---:')],
    ...rows,
  ];
  return [
    '## Browser test coverage',
    '',
    ...table.map((row) => `| ${row.join(' | ')} |`),
    '',
  ].join('\n');
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const summary = JSON.parse(readFileSync('coverage/coverage-summary.json'));
  const thresholds = JSON.parse(
    readFileSync('config/coverage-thresholds.json'),
  );
  checkCoverage(summary, thresholds);

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    const baselinePath = process.env.COVERAGE_BASELINE;
    const baseline = baselinePath
      ? JSON.parse(readFileSync(baselinePath))
      : undefined;
    appendFileSync(
      summaryPath,
      formatCoverageSummary(summary, thresholds, baseline),
    );
  }
  console.log(
    metrics
      .map((metric) => `${metric}: ${summary.total[metric].pct}%`)
      .join(' | '),
  );
}
