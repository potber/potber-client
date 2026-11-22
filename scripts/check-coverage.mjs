import { readFileSync } from 'node:fs';
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

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const summary = JSON.parse(readFileSync('coverage/coverage-summary.json'));
  const thresholds = JSON.parse(
    readFileSync('config/coverage-thresholds.json'),
  );
  checkCoverage(summary, thresholds);
  console.log(
    metrics
      .map((metric) => `${metric}: ${summary.total[metric].pct}%`)
      .join(' | '),
  );
}
