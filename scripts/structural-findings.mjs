import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ESLint } from 'eslint';

const root = fileURLToPath(new URL('../', import.meta.url));
const maxComplexity = 10;

function run(tool, args, cwd) {
  const result = spawnSync(
    process.execPath,
    [join(root, 'node_modules', '.bin', tool), ...args],
    { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${tool} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

async function complexity(cwd) {
  const lint = new ESLint({
    cwd,
    overrideConfigFile: join(root, 'eslint.config.js'),
    allowInlineConfig: false,
    ruleFilter: ({ ruleId }) => ruleId === 'complexity',
    overrideConfig: {
      rules: { complexity: ['error', maxComplexity] },
    },
  });
  const findings = [];
  for (const result of await lint.lintFiles('app/**/*.{ts,gts,js}')) {
    const file = relative(cwd, result.filePath);
    for (const issue of result.messages) {
      if (issue.fatal)
        throw new Error(`${file}:${issue.line}: ${issue.message}`);
      if (issue.ruleId !== 'complexity') continue;
      const match = issue.message.match(/^(.*?) has a complexity of (\d+)/);
      if (!match) throw new Error(`Unexpected ESLint result: ${issue.message}`);
      findings.push({
        rule: 'complexity',
        file,
        line: issue.line,
        subject: match[1],
        value: Number(match[2]),
      });
    }
  }
  return findings;
}

function duplication(cwd) {
  const output = mkdtempSync(join(tmpdir(), 'potber-duplicates-'));
  try {
    run(
      'jscpd',
      [
        'app',
        '--config',
        join(root, '.jscpd.json'),
        '--reporters',
        'json',
        '--output',
        output,
        '--absolute',
        '--silent',
        '--fail-on-empty',
      ],
      cwd,
    );
    const report = JSON.parse(
      readFileSync(join(output, 'jscpd-report.json'), 'utf8'),
    );
    return report.duplicates.map(({ firstFile, secondFile, lines }) => {
      const sides = [firstFile, secondFile].map(({ name, start }) => ({
        file: relative(cwd, resolve(cwd, name)),
        line: start,
      }));
      sides.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
      return {
        rule: 'duplication',
        ...sides[0],
        subject: sides[1].file,
        value: lines,
      };
    });
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
}

function unused(cwd) {
  const report = JSON.parse(
    run(
      'knip',
      [
        '--config',
        join(root, 'knip.json'),
        '--reporter',
        'json',
        '--no-progress',
        '--no-exit-code',
      ],
      cwd,
    ),
  );
  if (!Array.isArray(report.issues)) throw new Error('Unexpected Knip report');
  return report.issues.flatMap(({ file, files = [], exports = [] }) => [
    ...files.map(({ name }) => ({
      rule: 'unused-file',
      file,
      subject: name,
      value: 1,
    })),
    ...exports.map(({ name, line }) => ({
      rule: 'unused-export',
      file,
      line,
      subject: name,
      value: 1,
    })),
  ]);
}

export async function collectFindings(cwd) {
  return [...(await complexity(cwd)), ...duplication(cwd), ...unused(cwd)];
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  for (const finding of await collectFindings(
    resolve(process.argv[2] ?? '.'),
  )) {
    console.log(JSON.stringify(finding));
  }
}
