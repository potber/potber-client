# Staging rollback rehearsal on 23 November 2026

The rehearsal restored a previous potber-client build in the GitHub `test` environment and returned staging to its starting revision. Only the Bunny deployment job was rerun in each workflow. Production was outside the rehearsal.

## Deployment results

| Stage          | Commit    | Staging workflow attempt                                                                              | Served JavaScript entry |
| -------------- | --------- | ----------------------------------------------------------------------------------------------------- | ----------------------- |
| Starting build | `56ca326` | [45168064841, attempt 1](https://github.com/potber/potber-client/actions/runs/45168064841/attempts/1) | `main-DGAKCcps.js`      |
| Rollback       | `1db6713` | [45146367994, attempt 2](https://github.com/potber/potber-client/actions/runs/45146367994/attempts/2) | `main-DkyHX_gK.js`      |
| Restored build | `56ca326` | [45168064841, attempt 2](https://github.com/potber/potber-client/actions/runs/45168064841/attempts/2) | `main-DGAKCcps.js`      |

Both reruns completed upload and Pull Zone purge successfully. The rollback job took 1 minute 9 seconds and the restore job took 1 minute 23 seconds.

At each stage, cache-busted requests returned the app shell, its referenced JavaScript entry, and the injected configuration pointing at the staging API. A direct request to `/board?BID=14` returned the same HTML as the root. The restored HTML and JavaScript entry matched the starting build byte for byte by SHA-256.

The browser rendered the About page and redirected a signed-out board visit to the staging auth form on the rolled-back and restored builds. The browser session was signed out, so credential submission and authenticated board rendering were outside the checks.

All three stages reported version `1.30.0`. The entry filename and hash identified the build. An already-open tab needs a manual refresh for a same-version rollout because the client's version check reloads only when that version changes.
