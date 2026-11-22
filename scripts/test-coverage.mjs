import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

// A previous successful report must never mask a broken instrumentation run.
rmSync('coverage', { recursive: true, force: true });
for (const args of [
  ['node_modules/vite/bin/vite.js', 'build', '--mode', 'development'],
  ['node_modules/ember-cli/bin/ember', 'test', '--path', 'dist'],
  ['scripts/check-coverage.mjs'],
]) {
  const result = spawnSync(process.execPath, args, {
    env: { ...process.env, COVERAGE: 'true' },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    break;
  }
}
