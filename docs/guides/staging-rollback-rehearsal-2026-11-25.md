# Authenticated staging rollback rehearsal on 25 November 2026

After #273 merged, staging finished deploying `c3c89e7`. The rehearsal deployed the older `46b0526` client in the GitHub `test` environment, verified live sign-in and authenticated reload, and restored `c3c89e7`. Production Potber was untouched.

| Stage          | Client commit | Staging deployment                                                                       | Served JavaScript entry | Live staging login                                                         |
| -------------- | ------------- | ---------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------- |
| Starting build | `c3c89e7`     | [Attempt 1](https://github.com/potber/potber-client/actions/runs/45601753164/attempts/1) | `main-Dt_m2G-K.js`      | —                                                                          |
| Rollback       | `46b0526`     | [Attempt 2](https://github.com/potber/potber-client/actions/runs/45584229125/attempts/2) | `main-D5r7-pA9.js`      | [Passed](https://github.com/potber/potber-client/actions/runs/45602474696) |
| Restore        | `c3c89e7`     | [Attempt 2](https://github.com/potber/potber-client/actions/runs/45601753164/attempts/2) | `main-Dt_m2G-K.js`      | [Passed](https://github.com/potber/potber-client/actions/runs/45602903467) |

Both staging redeployments completed upload and cache purge. Cache-busted requests verified the served HTML, JavaScript entry, and injected configuration. The rollback served a distinct JavaScript hash. After restoration, all three files matched the starting build byte for byte. The injected auth and API URLs pointed at staging throughout.

Each live smoke used a fresh browser context and verified the account greeting, a reload, and a fresh authenticated session read after reload. Each made one login and two browser session reads with no retries. The smoke covers session persistence across reload within each deployed build. Keeping a session open across the deployment switch remains untested.
