# Agent-ready reassessment of potber-client

**85.50/100, Agent-Ready.** The score rose **0.45 points** from the [85.05 reassessment](AGENT_READY_REASSESSMENT_2026-11-25_60313c1.md).

Assessed on 25 November 2026 against merged main at [`ef9fb94`](https://github.com/potber/potber-client/commit/ef9fb94).

| Dimension                 |   Weight |  Previous |   Current |  Weighted |
| ------------------------- | -------: | --------: | --------: | --------: |
| Type Safety               |      20% |        89 |        89 |     17.80 |
| Test Foundation           |      15% |        80 |        81 |     12.15 |
| Documentation & Context   |      15% |        83 |        84 |     12.60 |
| Code Clarity              |      15% |        90 |        90 |     13.50 |
| Architecture Clarity      |      15% |        77 |        78 |     11.70 |
| Feedback Loops            |      10% |        92 |        92 |      9.20 |
| Consistency & Conventions |       5% |        79 |        79 |      3.95 |
| Change Safety             |       5% |        92 |        92 |      4.60 |
| **Total**                 | **100%** | **85.05** | **85.50** | **85.50** |

## Verification

- All 264 Chromium tests and 13 tooling tests passed at `25cde86`, which differs from `ef9fb94` only in documentation. ESLint, Glint, and Prettier passed, and all 122 checked local Markdown links resolved.
- Coverage reached 80.63% statements, 71.50% branches, 76.82% functions, and 81.44% lines. HTML, JSON, and LCOV reports were generated, and the exact-base comparison passed.
- The structural gate remained L3 with 52 findings and zero new or worsened findings. The PR workflow took about 2.7 minutes, with the structural check and previews running in parallel.

## What improved

**Test Foundation (+1).** `settled()` now waits for API requests and delayed store reloads, which fixed a teardown race that failed one acceptance test in CI and leaked into two other modules. A controlled experiment traced the Chromium startup timeout to a network-service crash. That crash accompanied all 7 failures in 110 cold launches on GitHub runners, and all 8 failures in CI history, and it never occurred in a launch that loaded. Running the service in the browser process produced 0 failures in 60 launches. Recovery keys and invalid remote copies during conflict retries now have tests.

**Documentation & Context (+1).** The [quality gates guide](docs/guides/quality-gates.md) documents how a sole maintainer merges code-owned changes. [ARCHITECTURE.md](ARCHITECTURE.md) records the Chromium startup mitigation. At `ef9fb94`, it still described the metadata module as a reader only. The PR that saves this report corrects that description; the score does not count the correction.

**Architecture Clarity (+1).** `SettingsSyncService` shrank from 550 to 527 lines. The [metadata module](app/utils/settings-sync-metadata-storage.ts) owns the field-clock lifecycle. The service has one path each for sealed writes, disabling after remote deletion, and parsing and applying synced values. An invalid remote copy applies nothing.

## Operating constraint

The project has one code owner. The "Protect main" ruleset lets the Repository admin role bypass it for pull requests only. Direct pushes stay blocked, and required checks still run. Code-owned PRs merge with `--admin` after every required check passes, and a PR comment names the bypass. Gate changes therefore receive no independent review.

## Remaining gaps

1. Settings sync spans a 527-line service and 12 modules in the flat `app/utils` directory. The service is the most frequently changed application file.
2. CI still retries the Chromium startup timeout once. Remove the retry after about 15 to 20 PR runs without the warning.
3. The authenticated staging rollback verified reload on each build. Session continuity across a deployment switch remains untested.
4. The repository has no pre-commit hooks, ADRs, or glossary.
