# Structural checks

Run `npm ci` once, then run `npm run quality:check` before submitting application changes. The PR workflow runs the same command against the PR's target branch. Fetch the target branch when your local remote-tracking ref is stale.

- `npm run quality:check` fails for new or worsened findings.
- `npm run quality:report` lists the regressions and total findings without failing on regressions.
- `npm run quality:test` verifies matching behavior and runs all three analyzers against a temporary Ember fixture.
- Pass a different target ref with `npm run quality:check -- origin/my-branch`.

ESLint checks JavaScript, TypeScript, and Ember template-tag application files for cyclomatic complexity greater than 10. jscpd looks for exact duplicates of at least five lines and 50 tokens in application code, excluding changelog data. Knip checks for unused files and exports, with explicit entry points for modules loaded by Ember conventions.

The gate analyzes the working tree and a temporary snapshot of the Git merge base using the same tools and configuration. An existing finding can move to a different line or improve without blocking the PR. Added occurrences or larger findings fail. Findings are grouped by rule, file, and the reported subject, such as a function name or the other file in a duplicate pair. Renames can appear as new findings.

The merge base supplies the baseline for each run. After a fix merges, later branches inherit the lower baseline when they update from the target branch. Analyzer configuration changes affect both snapshots and deserve review. The "Protect main" ruleset requires the `structural-checks` job to pass before a PR can merge into `main`. The job runs on every PR, so it never sits pending on a path filter. Renaming the job also requires updating the ruleset.

## Code-owner review

The "Protect main" ruleset requires code-owner review for files listed in [`.github/CODEOWNERS`](../../.github/CODEOWNERS), including workflows, analyzer configuration, `testem.js`, and `package.json`. `@potber/quality-gate-maintainers` has one member, so a PR from that member cannot receive an independent approval.

The ruleset lets the Repository admin role bypass it for pull requests only. Direct pushes to `main` stay blocked. Merge a code-owned change with `gh pr merge <number> --squash --admin` only after every required check passes, and leave a PR comment that names the bypass. Remove the bypass once a second maintainer can review gate changes.
