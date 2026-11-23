# Agent-ready reassessment of potber-client

**75.30/100, Agent-Assisted.** The score rose **2.50 points** from the [last saved assessment](AGENT_READY_REASSESSMENT_2026-11-23_70ae158.md). The Agent-Ready threshold is 85.

Assessed on 23 November 2026 against merged `main` at [`e29eb23`](https://github.com/potber/potber-client/commit/e29eb23), after [#220](https://github.com/potber/potber-client/pull/220) passed CI and merged.

## Scores

| Dimension                 |   Weight | Last saved |       Now |  Weighted |
| ------------------------- | -------: | ---------: | --------: | --------: |
| Type Safety               |      20% |         73 |        77 |     15.40 |
| Test Foundation           |      15% |         72 |        74 |     11.10 |
| Documentation & Context   |      15% |         68 |        72 |     10.80 |
| Code Clarity              |      15% |         87 |        87 |     13.05 |
| Architecture Clarity      |      15% |         60 |        60 |      9.00 |
| Feedback Loops            |      10% |         80 |        85 |      8.50 |
| Consistency & Conventions |       5% |         78 |        78 |      3.90 |
| Change Safety             |       5% |         65 |        71 |      3.55 |
| **Total**                 | **100%** |  **72.80** | **75.30** | **75.30** |

## Codebase snapshot

- **Stack:** Strict TypeScript, Ember, Glint, and Vite.
- **Repository:** 1,389 commits and 16 distinct author email addresses.
- **Source and tests:** 281 application source files and 47 browser test files (16.73%), plus tooling tests.
- **CI:** Seven GitHub Actions workflows and CodeQL.
- **Documentation:** [AGENTS.md](AGENTS.md), [ARCHITECTURE.md](ARCHITECTURE.md), a 193-line [README](README.md), and guides. There is no canonical domain glossary or ADR directory.
- **Linting and formatting:** ESLint and Prettier.
- **Quality gates:** L3 — required PR CI check blocks new or worsened complexity, exact duplication, and unused code findings against the Git merge base.

## Quality gate maturity

- **Quality gates:** L3 — required PR CI check blocks new or worsened complexity, exact duplication, and unused code findings against the Git merge base.

Reconnaissance suggested L1 because it missed the repository's CI adapter. The [workflow](.github/workflows/structural-checks.yml), local check, and GitHub branch rules confirmed L3. The merge base supplies the baseline.

## Verification

- On merged main, Chromium passed 171 tests, up from 159. Statement, branch, function, and line coverage reached 71.88%, 59.57%, 69.36%, and 72.70%, respectively. Verified the HTML, JSON, and LCOV outputs.
- ESLint, Glint, Prettier, and all nine tooling tests passed. The structural check reported 73 existing findings and zero new or worsened findings.
- All 42 checked local documentation links and anchors resolved.
- Parallel coverage took 4m 13s on #220, down from 5m 29s on #219. GitHub published deltas against the exact base commit and the complete report. [Coverage run](https://github.com/potber/potber-client/actions/runs/45197005444)

## Dimension findings

- **Type Safety and Test Foundation.** Session, private-message, profile, username suggestion, and thread creation responses gained schemas. Twelve new tests cover contract branches. Some response bodies still reach consumers without runtime validation.
- **Documentation & Context and Change Safety.** The [rollback runbook](docs/guides/client-release-rollback.md) has a [staging rollback and restore rehearsal](docs/guides/staging-rollback-rehearsal-2026-11-23.md). The rehearsal verified asset restoration and signed-out navigation. Credential submission and authenticated board rendering were outside the rehearsal.
- **Code Clarity and Architecture Clarity.** Application files still have a median of 45 lines. Schemas follow the existing API module layout. Some features span multiple Ember layers.
- **Feedback Loops and Consistency & Conventions.** Parallel coverage preserves all four floors and the exact-base report. PR lint continues to run ESLint, Glint, and Prettier.

## Next priorities

1. Validate response bodies that consumers still read without a schema.
2. Add branch coverage around those response boundaries.
