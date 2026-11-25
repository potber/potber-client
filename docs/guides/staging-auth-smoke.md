# Authenticated staging smoke test

Run the **staging-auth-smoke** workflow from GitHub Actions after a staging deploy or rollback. It loads the deployed client at `https://test.potber.de` in a fresh Chromium context, starts sign-in from a protected route, checks the authenticated greeting, and reloads to verify session persistence.

The browser intercepts the staging OAuth and forum API requests and serves fixtures in memory. The test verifies the client's OAuth redirect and callback, bearer token, and session handling. Real account login and staging backend availability are outside its scope. It uses no credentials or deployments. Unrecognized requests are blocked, and staging assets are fetched without following redirects.

To run it locally with Node 24:

```sh
smoke_tools="$(mktemp -d)"
npm install --prefix "$smoke_tools" --no-save --no-audit --no-fund playwright@1.65.1
"$smoke_tools/node_modules/.bin/playwright" install chromium
NODE_PATH="$smoke_tools/node_modules" node scripts/staging-auth-smoke.mjs
```

## Live login

Run **Staging live login** from GitHub Actions on `main` to verify the real staging auth and API services. It uses a dedicated forum account from the `STAGING_SMOKE_USERNAME` and `STAGING_SMOKE_PASSWORD` secrets in the GitHub `test` environment.

Each run submits one login, requests a one-hour session, verifies the account greeting, and reloads once. Duplicate session requests share one staging API read per page load, with at most two reads per run. It serves fixtures for bookmarks, private messages, and settings sync, and blocks writes other than the staging login. Staging auth sends the login to the live forum. The workflow has no automatic trigger or retry.
