# Client release rollback

Use this runbook to restore a known-good potber-client build in Bunny Storage. Coordinate with the release owner and confirm that the target build works with the current API and auth services. The client deployment restores static files. Backend rollbacks and browser-local data recovery have separate procedures.

## Choose the recovery path

1. Check `https://www.potber.de/version.json` and the [production workflow history](https://github.com/potber/potber-client/actions/workflows/production.yml). Record the affected version, deployment run, and symptoms.
2. Identify the last known-good run. Confirm its tag and commit SHA, then find the successful **Deploy to Bunny Storage (production)** job in that run. Review its upload and cache purge logs. Check for any queued production deployment that could overwrite the rollback.
3. If that deployment job is eligible for a rerun, rerun that specific job. GitHub uses the original ref and SHA, and retains the outputs from jobs outside the rerun. The workflow rebuilds the target commit with the current production environment configuration. Review configuration changes since the target deployment before proceeding. Older runs can include separate container publishing jobs, so select the Bunny job explicitly. [GitHub job rerun documentation](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs?tool=cli)
4. If the run has no successful Bunny deployment, its rerun window has expired, or the target build is incompatible with current services or persisted data, use a revert or corrective patch on `main`, verify it in staging, and publish a new production tag through the normal release process. Keep existing tags as historical references.

## Redeploy and verify

For an eligible run, list jobs and take the Bunny deployment job's `databaseId`:

```sh
gh run view "$run_id" -R potber/potber-client --json jobs --jq '.jobs[] | {name, databaseId}'
```

Set `job_id` to that value and rerun the reviewed job. Check the run page for the new attempt before watching it:

```sh
gh run rerun "$run_id" --job "$job_id" -R potber/potber-client
```

Confirm the selected Bunny job completed its build, upload, and Pull Zone purge. The uploader retains existing hashed assets and publishes `injected-config.js`, `index.html`, and `version.json` in that order after the other files.

Check the production version marker using a cache-busting query:

```sh
curl -fsS "https://www.potber.de/version.json?_=$(date +%s)"
```

Compare its `version` with the selected build's package version. Open a normal browser session and an already-open tab if available. Check that the app shell and hashed assets load, then verify sign-in, a direct board or thread URL, and the flow that prompted the rollback. For a same-version rebuild, compare the served entry HTML and asset references with the target build. Ask users with already-open tabs to refresh, since the version marker stays the same. Record the redeployment run and verification results in the incident record.

## Rehearse safely

Use a staging deployment run and the staging host for an end-to-end rehearsal with the release owner. To check upload ordering locally without writing to Bunny, run this from a built checkout after rendering the staging `dist/injected-config.js`:

```sh
DRY_RUN=1 BUNNY_STORAGE_ZONE=rehearsal deploy/upload-to-bunny-storage.sh dist
```

Expect hashed assets before the three entry files. The dry run checks ordering only. The staging rehearsal checks the deployment, cache purge, and browser behavior.

See the [23 November 2026 staging rehearsal](staging-rollback-rehearsal-2026-11-23.md) for a verified rollback and restore.

Run the [authenticated staging smoke test](staging-auth-smoke.md) to verify sign-in and session persistence in the deployed client with isolated fixtures.
