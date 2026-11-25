import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const username = process.env.STAGING_SMOKE_USERNAME;
const password = process.env.STAGING_SMOKE_PASSWORD;
assert.ok(
  username && password,
  'Set both staging smoke secrets before running.',
);

const client = 'https://test.potber.de';
const auth = 'https://test-auth.potber.de';
const api = 'https://test-api.potber.de';
const origins = new Set([client, auth, api]);
const maxSessionReads = 4;
const cors = { 'access-control-allow-origin': client };
const browser = await chromium.launch();

try {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  // LandingPage.home renders the account greeting. Preferences stay in this browser.
  await context.addInitScript({
    content: `if (location.origin === ${JSON.stringify(client)}) {
      localStorage.setItem('potber-settings', '{"landingPage":1,"autoRefreshSidebar":false}');
    }`,
  });
  const page = await context.newPage();
  let loginAttempts = 0;
  let sessionReads = 0;
  let identity;
  const problems = [];

  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const read = method === 'GET' || method === 'HEAD';
    const login =
      url.origin === auth &&
      url.pathname === '/authorize' &&
      url.search === '?/login' &&
      method === 'POST';
    const session = url.origin === api && url.pathname === '/auth/session';
    if (url.origin === api && method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...cors,
          'access-control-allow-headers': 'authorization, content-type',
          'access-control-allow-methods': 'GET, OPTIONS',
        },
      });
      return;
    }
    if (url.origin === api && method === 'GET') {
      if (['/bookmarks', '/privateMessages'].includes(url.pathname)) {
        await route.fulfill({ json: [], headers: cors });
        return;
      }
      if (url.pathname === '/user-configuration') {
        await route.fulfill({ status: 404, headers: cors });
        return;
      }
    }
    if (!origins.has(url.origin)) {
      await route.abort();
      return;
    }
    if (login) loginAttempts += 1;
    if (session && method === 'GET') sessionReads += 1;
    const allowedRead = read && (url.origin !== api || session);
    if (
      (!login && !allowedRead) ||
      loginAttempts > 1 ||
      sessionReads > maxSessionReads
    ) {
      problems.push(
        'Blocked unexpected staging request or exceeded the request budget.',
      );
      await route.abort();
      return;
    }

    try {
      const response = await route.fetch({
        maxRedirects: 0,
        maxRetries: 0,
        timeout: 15_000,
      });
      if (response.status() >= 300 && response.status() < 400) {
        throw new Error('Unexpected staging redirect.');
      }
      if (session && response.ok()) {
        const { username: actual } = await response.json();
        if (
          typeof actual !== 'string' ||
          actual.toLowerCase() !== username.toLowerCase()
        ) {
          throw new Error('Unexpected account returned from staging.');
        }
        identity = actual;
      }
      await route.fulfill({ response });
    } catch {
      problems.push(
        'A staging request failed or returned an unexpected response.',
      );
      await route.abort();
    }
  });

  async function verifyHome() {
    await page.waitForURL(`${client}/home`, { timeout: 20_000 });
    assert.ok(identity, 'Staging returned the expected account identity.');
    await page
      .getByRole('heading', { name: `Hallo, ${identity}!` })
      .waitFor({ timeout: 15_000 });
  }

  try {
    await page.goto(`${client}/home`, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });
    await page.waitForURL(
      (url) => url.origin === auth && url.pathname === '/authorize',
      { timeout: 20_000 },
    );
    const authorize = new URL(page.url());
    assert.ok(
      authorize.searchParams.get('redirect_uri') === `${client}/auth/callback`,
      'Expected the staging callback.',
    );
    const form = page.locator('form[action="?/login"]');
    await form
      .locator('input[name="username"]')
      .fill(username, { timeout: 10_000 });
    await form
      .locator('input[name="password"]')
      .fill(password, { timeout: 10_000 });
    await form
      .locator('select[name="lifetime"]')
      .selectOption('3600', { timeout: 10_000 });
    await form.locator('button[type="submit"]').click({ timeout: 10_000 });
    await verifyHome();

    const readsBeforeReload = sessionReads;
    identity = undefined;
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 20_000 });
    await verifyHome();
    assert.equal(loginAttempts, 1);
    assert.ok(
      sessionReads > readsBeforeReload,
      'Reload refreshed the session.',
    );
    assert.equal(problems.length, 0, problems.join(' '));
  } catch {
    // Browser errors can include a callback URL with a bearer token or form values.
    throw new Error(
      problems[0] ??
        'Staging login or authenticated reload did not complete. No retry was attempted.',
    );
  }

  console.log(
    `Live staging login and reload passed with one login and ${sessionReads} browser session reads.`,
  );
} finally {
  await browser.close();
}
