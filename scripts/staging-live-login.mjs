import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
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
const maxSessionReads = 3;
const marker = process.env.REHEARSAL_MARKER;
assert.ok(marker, 'Expected a local rehearsal marker path.');
const rollbackEntry = '/assets/main-Dt_m2G-K.js';
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
  let sessionRequest;
  let initialAuthorization;
  const problems = [];
  let step;
  function begin(name) {
    step = name;
    console.log(`Staging smoke: ${step}`);
  }

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
    const allowedRead =
      read && (url.origin !== api || (session && method === 'GET'));
    if ((!login && !allowedRead) || loginAttempts > 1) {
      problems.push(
        'Blocked unexpected staging request or exceeded the request budget.',
      );
      await route.abort();
      return;
    }

    try {
      const fetchResponse = () =>
        route.fetch({ maxRedirects: 0, maxRetries: 0, timeout: 15_000 });
      let response;
      if (session) {
        const authorization = request.headers().authorization;
        if (
          !authorization?.startsWith('Bearer ') ||
          (initialAuthorization && authorization !== initialAuthorization)
        ) {
          problems.push(
            'Staging session read used missing or inconsistent credentials.',
          );
          await route.abort();
          return;
        }
        if (!sessionRequest) {
          if (sessionReads >= maxSessionReads) {
            problems.push('Exceeded the staging session read budget.');
            await route.abort();
            return;
          }
          sessionReads += 1;
          initialAuthorization ??= authorization;
          sessionRequest = fetchResponse();
        }
        response = await sessionRequest;
      } else {
        response = await fetchResponse();
      }
      if (response.status() >= 300 && response.status() < 400) {
        throw new Error('Unexpected staging redirect.');
      }
      if (login) {
        console.log(`Staging auth returned HTTP ${response.status()}.`);
      }
      if (session && !response.ok()) {
        problems.push(
          `Staging session endpoint returned HTTP ${response.status()}.`,
        );
      }
      if (session && response.ok()) {
        const { username: actual } = await response.json();
        if (
          typeof actual !== 'string' ||
          actual.toLowerCase() !== username.toLowerCase()
        ) {
          problems.push('Staging returned an unexpected account identity.');
          await route.abort();
          return;
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
    await page.waitForURL(
      (url) => url.origin === client && url.pathname === '/home',
      { timeout: 20_000 },
    );
    // The URL can already be /home while Ember is still loading the session.
    await page.getByRole('heading', { name: /^Hallo,\s*\S.*!$/ }).waitFor({
      timeout: 15_000,
    });
    assert.ok(identity, 'Staging returned the expected account identity.');
    await page
      .getByRole('heading', { name: `Hallo, ${identity}!` })
      .waitFor({ timeout: 15_000 });
  }

  try {
    begin('open the staging client');
    await page.goto(`${client}/home`, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    });
    begin('reach staging authorization');
    await page.waitForURL(
      (url) => url.origin === auth && url.pathname === '/authorize',
      { timeout: 20_000 },
    );
    const authorize = new URL(page.url());
    assert.ok(
      authorize.searchParams.get('redirect_uri') === `${client}/auth/callback`,
      'Expected the staging callback.',
    );
    begin('prepare the login form');
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
    begin('submit the single login');
    await form.locator('button[type="submit"]').click({ timeout: 10_000 });
    begin('verify the authenticated home page');
    await verifyHome();

    assert.equal(sessionReads, 1, 'Sign-in fetched the session once.');
    const startingEntry = await page
      .locator('script[type="module"][src^="/assets/main-"]')
      .getAttribute('src');
    assert.ok(
      startingEntry && startingEntry !== rollbackEntry,
      'Expected a distinct starting build.',
    );
    console.log(`Starting entry ${startingEntry}.`);
    writeFileSync(`${marker}.baseline`, startingEntry);

    for (const [phase, entry] of [
      ['rollback', rollbackEntry],
      ['restore', startingEntry],
    ]) {
      begin(`wait for the ${phase} build`);
      const deadline = Date.now() + 420_000;
      let served = false;
      while (Date.now() < deadline) {
        try {
          const response = await fetch(`${client}/?rehearsal=${Date.now()}`, {
            cache: 'no-store',
            redirect: 'error',
            signal: AbortSignal.timeout(5_000),
          });
          if (
            response.ok &&
            (await response.text()).includes(`src="${entry}"`)
          ) {
            served = true;
            break;
          }
        } catch {
          // Staging may be temporarily unavailable during the file switch.
        }
        await delay(5_000);
      }
      assert.ok(served, 'Expected the planned staging entry.');
      identity = undefined;
      sessionRequest = undefined;
      begin(`verify the existing session after ${phase}`);
      await page.goto(`${client}/home?rehearsal=${Date.now()}`, {
        waitUntil: 'domcontentloaded',
        timeout: 20_000,
      });
      await verifyHome();
      const actualEntry = await page
        .locator('script[type="module"][src^="/assets/main-"]')
        .getAttribute('src');
      assert.equal(
        actualEntry,
        entry,
        'The browser loaded the expected build.',
      );
      assert.equal(loginAttempts, 1);
      assert.equal(sessionReads, phase === 'rollback' ? 2 : 3);
      assert.equal(problems.length, 0, problems.join(' '));
      console.log(`Existing session verified after ${phase} on ${entry}.`);
      writeFileSync(`${marker}.${phase}`, entry);
    }
  } catch {
    // Browser errors can include a callback URL with a bearer token or form values.
    throw new Error(
      `Staging smoke failed at "${step}". ${problems[0] ?? 'Expected browser state was not reached.'} No retry was attempted.`,
    );
  }

  console.log(
    `Live staging login, rollback, and restore passed with one login and ${sessionReads} browser session reads.`,
  );
} finally {
  await browser.close();
}
