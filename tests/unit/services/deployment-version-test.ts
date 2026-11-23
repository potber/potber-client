import { appConfig } from 'potber-client/config/app.config';
import type DeploymentVersionService from 'potber-client/services/deployment-version';
import { setupTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Service | Deployment version', function (hooks) {
  setupTest(hooks);

  let originalFetch: typeof fetch;
  let originalVersion: string;

  hooks.beforeEach(function () {
    originalFetch = globalThis.fetch;
    originalVersion = appConfig.version;
    appConfig.version = '1.29.0';
  });

  hooks.afterEach(function () {
    globalThis.fetch = originalFetch;
    appConfig.version = originalVersion;
  });

  test('does not navigate when the deployed version is already running', async function (assert) {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ version: '1.29.0' }), {
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;
    const deployment = this.owner.lookup(
      'service:deployment-version',
    ) as DeploymentVersionService;

    const navigations: string[] = [];
    deployment.navigateToDeployedVersion = (target) => {
      navigations.push(target);
    };

    await deployment.checkForDeployedVersion({ force: true });

    assert.deepEqual(navigations, []);
  });

  test('builds a unique reload URL without discarding the current location', function (assert) {
    const deployment = this.owner.lookup(
      'service:deployment-version',
    ) as DeploymentVersionService;

    const reloadUrl = deployment.getDeployedVersionUrl('1.30.0', 12345);

    assert.strictEqual(reloadUrl.origin, window.location.origin);
    assert.strictEqual(reloadUrl.pathname, window.location.pathname);
    assert.strictEqual(reloadUrl.searchParams.get('_potber_version'), '1.30.0');
    assert.strictEqual(reloadUrl.searchParams.get('_potber_reload'), '12345');
  });

  test('manually refreshes the currently running version', function (assert) {
    const deployment = this.owner.lookup(
      'service:deployment-version',
    ) as DeploymentVersionService;
    let navigatedVersion: string | undefined;
    deployment.navigateToDeployedVersion = (version: string) => {
      navigatedVersion = version;
    };

    deployment.refreshApp();

    assert.strictEqual(navigatedVersion, '1.29.0');
  });

  test('immediately navigates to a different deployment', async function (assert) {
    let requestedUrl: URL | undefined;
    let requestedOptions: RequestInit | undefined;
    globalThis.fetch = (async (input, options) => {
      requestedUrl = new URL(String(input));
      requestedOptions = options;
      return new Response(JSON.stringify({ version: '1.30.0' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;
    const deployment = this.owner.lookup(
      'service:deployment-version',
    ) as DeploymentVersionService;
    let navigatedVersion: string | undefined;
    deployment.navigateToDeployedVersion = (version: string) => {
      navigatedVersion = version;
    };

    await deployment.checkForDeployedVersion({ force: true });

    assert.strictEqual(requestedUrl?.pathname, '/version.json');
    assert.true(requestedUrl?.searchParams.has('_'));
    assert.strictEqual(requestedOptions?.cache, 'no-store');
    assert.strictEqual(navigatedVersion, '1.30.0');
  });

  test('ignores malformed markers and retries on the next check', async function (assert) {
    const deployment = this.owner.lookup(
      'service:deployment-version',
    ) as DeploymentVersionService;
    const navigations: string[] = [];
    deployment.navigateToDeployedVersion = (version: string) => {
      navigations.push(version);
    };

    for (const body of [
      JSON.stringify({ version: ['1.30.0'] }),
      JSON.stringify({ version: 'invalid' }),
      '<html>Unavailable</html>',
    ]) {
      globalThis.fetch = async () => new Response(body);
      await deployment.checkForDeployedVersion({ force: true });
    }
    assert.deepEqual(navigations, []);

    globalThis.fetch = async () => Response.json({ version: '1.30.0' });
    await deployment.checkForDeployedVersion({ force: true });
    assert.deepEqual(navigations, ['1.30.0']);
  });
});
