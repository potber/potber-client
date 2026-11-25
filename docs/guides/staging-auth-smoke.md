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
