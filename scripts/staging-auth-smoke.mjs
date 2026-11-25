import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');

const staging = 'https://test.potber.de';
const auth = 'https://test-auth.potber.de';
const api = 'https://test-api.potber.de';
const token = 'staging-smoke-fixture';
const username = 'Staging Smoke Fixture';
const callback = `${staging}/auth/callback`;
const session = {
  userId: '42',
  username,
  avatarUrl: '',
  cookie: '',
  iat: 0,
  exp: 0,
};
const cors = {
  'access-control-allow-origin': staging,
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, OPTIONS',
};

const browser = await chromium.launch({
  ...(process.env.STAGING_SMOKE_CHROME_CHANNEL && {
    channel: process.env.STAGING_SMOKE_CHROME_CHANNEL,
  }),
});
try {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  // LandingPage.home shows the session greeting on the protected route.
  const preferences = JSON.stringify({
    landingPage: 1,
    autoRefreshSidebar: false,
  });
  await context.addInitScript({
    content: `if (location.origin === ${JSON.stringify(staging)}) {
      localStorage.setItem('potber-settings', ${JSON.stringify(preferences)});
    }`,
  });
  const page = await context.newPage();
  const problems = [];
  let signIns = 0;
  let sessionReads = 0;

  page.on('pageerror', (error) => problems.push(error.message));
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (url.origin === staging && ['GET', 'HEAD'].includes(method)) {
      try {
        const response = await route.fetch({
          maxRedirects: 0,
          timeout: 15_000,
        });
        if (response.status() >= 300 && response.status() < 400) {
          throw new Error(`Unexpected staging redirect at ${url.pathname}`);
        }
        await route.fulfill({ response });
      } catch (error) {
        problems.push(String(error));
        await route.abort();
      }
      return;
    }

    if (
      url.origin === auth &&
      method === 'GET' &&
      url.pathname === '/authorize'
    ) {
      if (
        url.searchParams.get('response_type') !== 'token' ||
        url.searchParams.get('redirect_uri') !== callback ||
        !url.searchParams.get('client_id')
      ) {
        problems.push('Unexpected OAuth authorization parameters.');
        await route.abort();
        return;
      }
      signIns += 1;
      await route.fulfill({
        status: 302,
        headers: {
          location: `${callback}#access_token=${token}&token_type=Bearer`,
        },
      });
      return;
    }

    if (url.origin === api && method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    if (url.origin === api && method === 'GET') {
      if (url.pathname === '/auth/session') {
        if (request.headers().authorization !== `Bearer ${token}`) {
          problems.push(
            'Forum session request omitted the fixture bearer token.',
          );
          await route.fulfill({ status: 401, headers: cors });
          return;
        }
        sessionReads += 1;
        await route.fulfill({ json: session, headers: cors });
        return;
      }
      if (['/bookmarks', '/privateMessages'].includes(url.pathname)) {
        await route.fulfill({ json: [], headers: cors });
        return;
      }
      if (url.pathname === '/user-configuration') {
        await route.fulfill({ status: 404, headers: cors });
        return;
      }
    }

    problems.push(`Unexpected request: ${method} ${url.origin}${url.pathname}`);
    await route.abort();
  });

  async function verifyHome() {
    await page.getByRole('heading', { name: `Hallo, ${username}!` }).waitFor({
      timeout: 20_000,
    });
    assert.equal(page.url(), `${staging}/home`);
  }

  try {
    await page.goto(`${staging}/home`, { waitUntil: 'domcontentloaded' });
    await verifyHome();
    const readsBeforeReload = sessionReads;
    assert.ok(readsBeforeReload > 0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await verifyHome();
    assert.equal(signIns, 1, 'reload reused the authenticated browser session');
    assert.ok(
      sessionReads > readsBeforeReload,
      'reload fetched the session again',
    );
  } catch (error) {
    if (problems.length) {
      throw new Error(problems.join('\n'), { cause: error });
    }
    throw error;
  }
  assert.deepEqual(
    problems,
    [],
    'all browser traffic matched staging or a fixture',
  );

  console.log('Staging client sign-in and authenticated reload passed.');
} finally {
  await browser.close();
}
