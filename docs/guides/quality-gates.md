# Structural checks

Run `npm ci` once, then run `npm run quality:check` before submitting application changes. The PR workflow runs the same command against the PR's target branch. Fetch the target branch when your local remote-tracking ref is stale.

- `npm run quality:check` fails for new or worsened findings.
- `npm run quality:report` lists the regressions and total findings without failing on regressions.
- `npm run quality:test` verifies matching behavior and runs all three analyzers against a temporary Ember fixture.
- Pass a different target ref with `npm run quality:check -- origin/my-branch`.

ESLint checks JavaScript, TypeScript, and Ember template-tag application files for cyclomatic complexity greater than 10. jscpd looks for exact duplicates of at least five lines and 50 tokens in application code, excluding changelog data. Knip checks for unused files and exports, with explicit entry points for modules loaded by Ember conventions.

The gate analyzes the working tree and a temporary snapshot of the Git merge base using the same tools and configuration. An existing finding can move to a different line or improve without blocking the PR. Added occurrences or larger findings fail. Findings are grouped by rule, file, and the reported subject, such as a function name or the other file in a duplicate pair. Renames can appear as new findings.

The merge base supplies the baseline for each run. After a fix merges, later branches inherit the lower baseline when they update from the target branch. Analyzer configuration changes affect both snapshots and deserve review. Existing GitHub rules determine whether the new check is required for merging.
