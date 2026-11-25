# Agent-ready reassessment of potber-client

**81.20/100, Agent-Assisted.** The score rose **5.35 points** from the [previous reassessment](AGENT_READY_REASSESSMENT_2026-11-24_90fb2d9.md) and is 3.80 points below the Agent-Ready threshold of 85.

Assessed on 25 November 2026 against merged main at [`2fee1be`](https://github.com/potber/potber-client/commit/2fee1be), after [#259](https://github.com/potber/potber-client/pull/259) passed CI and merged.

| Dimension                 |   Weight |  Previous |   Current |  Weighted |
| ------------------------- | -------: | --------: | --------: | --------: |
| Type Safety               |      20% |        80 |        89 |     17.80 |
| Test Foundation           |      15% |        66 |        76 |     11.40 |
| Documentation & Context   |      15% |        74 |        77 |     11.55 |
| Code Clarity              |      15% |        86 |        89 |     13.35 |
| Architecture Clarity      |      15% |        68 |        70 |     10.50 |
| Feedback Loops            |      10% |        85 |        89 |      8.90 |
| Consistency & Conventions |       5% |        74 |        79 |      3.95 |
| Change Safety             |       5% |        71 |        75 |      3.75 |
| **Total**                 | **100%** | **75.85** | **81.20** | **81.20** |

## Snapshot and verification

- Strict TypeScript, Ember, Glint, and Vite. The repository had 1,428 commits, 16 distinct author email addresses, 290 application source files, and 59 browser test files.
- Seven GitHub Actions workflow files plus CodeQL. [AGENTS.md](AGENTS.md) is the canonical agent guide. The [README](README.md) has 193 lines. There is no domain glossary or ADR directory.
- **Quality gates** — L3. The required structural check blocks new or worsened complexity, duplication, and unused code against the Git merge base. The recon script suggested L1 because it missed the workflow's npm-script adapter.
- All 242 Chromium tests and 13 tooling tests passed. ESLint, Glint, and Prettier passed. The structural check counted 54 findings, down from 71, with zero new or worsened findings on the assessed tree. All 94 checked local documentation links and anchors resolved.
- The coverage run produced HTML, JSON, and LCOV reports.

| Coverage   | Previous | Current |     Change |
| ---------- | -------: | ------: | ---------: |
| Statements |   72.94% |  79.80% |  +6.86 pts |
| Branches   |   60.20% |  70.20% | +10.00 pts |
| Functions  |   70.94% |  76.24% |  +5.30 pts |
| Lines      |   73.61% |  80.64% |  +7.03 pts |

## Findings

- **Type Safety.** Required lint runs Glint and rejects explicit `any` in TypeScript and GTS. `CustomSession` has typed data, and Valibot validates API and persisted data. IDs remain plain strings.
- **Test Foundation.** Coverage increased for API error handling, gesture modifiers, renderer behavior, and browser exception handling. Browser acceptance tests use network fixtures, with live authenticated staging behavior outside the suite.
- **Documentation.** The [readiness index](docs/guides/readiness-history.md) makes saved reports discoverable. Active guidance reflects the auth, coverage, and telemetry changes. CI checks formatting. Link verification was performed manually for this reassessment.
- **Code Clarity.** Application source files have a median of 41 lines. The changelog and settings sync service are the only files above 500 lines. Recent refactors reduced duplication in link rendering, post editor insertion, reply and quote rendering, and post-read notifications.
- **Architecture Clarity.** The [architecture guide](ARCHITECTURE.md) maps service ownership. The runtime dependency cycle between `ApiService` and `CustomSession` remains. Settings sync still spans a 584-line orchestrator and nine flat utility modules.
- **Feedback Loops.** The #259 coverage jobs ran in parallel at 1m39s and 1m51s, followed by a seven-second comparison. Lint and structural checks each took under 50 seconds. Capping toast expiry in acceptance tests removed the recurring five-second waits.
- **Consistency and Conventions.** Required lint enforces formatting, Ember conventions, and TypeScript checks. The repository has no committed pre-commit hooks or project-specific architectural lint rules.
- **Change Safety.** Live branch rules require lint, tests, and the structural check. Test CI rejects regressions across all four coverage metrics against the exact base. Analyzer and gate configuration lack protected review. The staging rollback rehearsal covered signed-out behavior.

## Next priorities

1. Protect changes to analyzer and CI gate configuration with required review.
2. Break the runtime dependency cycle between `ApiService` and `CustomSession`.
3. Add an authenticated staging smoke test with isolated fixtures.
