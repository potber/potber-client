# Agent-ready reassessment of potber-client

**72.80/100, Agent-Assisted.** The score rose **4.20 points** from the [last saved reassessment](AGENT_READY_REASSESSMENT_2026-11-22_54b7937.md) and crossed the 70-point Agent-Assisted threshold.

Assessed on 23 November 2026 against merged `main` at [`70ae158`](https://github.com/potber/potber-client/commit/70ae158), after [#214](https://github.com/potber/potber-client/pull/214) passed CI and merged.

## Score breakdown

| Dimension                 |   Weight | Last saved |       Now |  Weighted |
| ------------------------- | -------: | ---------: | --------: | --------: |
| Type Safety               |      20% |         70 |        73 |     14.60 |
| Test Foundation           |      15% |         69 |        72 |     10.80 |
| Documentation & Context   |      15% |         58 |        68 |     10.20 |
| Code Clarity              |      15% |         85 |        87 |     13.05 |
| Architecture Clarity      |      15% |         52 |        60 |      9.00 |
| Feedback Loops            |      10% |         80 |        80 |      8.00 |
| Consistency & Conventions |       5% |         78 |        78 |      3.90 |
| Change Safety             |       5% |         62 |        65 |      3.25 |
| **Total**                 | **100%** |  **68.60** | **72.80** | **72.80** |

## Codebase snapshot

- **Language and framework** Strict TypeScript, Ember, Glint, and Vite.
- **Repository** 1,383 commits and 16 distinct author email addresses.
- **Source and tests** 279 application source files and 47 browser test files (16.85%), plus tooling tests.
- **CI/CD** Seven GitHub Actions workflows, plus GitHub CodeQL.
- **Agent guidance** A single root [AGENTS.md](AGENTS.md), 71 lines.
- **Documentation** [README.md](README.md), 191 lines, [ARCHITECTURE.md](ARCHITECTURE.md), and a [structural checks guide](docs/guides/quality-gates.md). No canonical domain glossary or ADR directory was found.
- **Linting** ESLint and Prettier.
- **Quality gates** L3 — required PR CI check blocks new or worsened complexity, exact duplication, and unused code findings against the Git merge base.

## Quality gate maturity

- **Quality gates** L3 — required PR CI check blocks new or worsened complexity, exact duplication, and unused code findings against the Git merge base.

Reconnaissance suggested L1 because it did not recognize the CI adapter. The [structural workflow](.github/workflows/structural-checks.yml) and GitHub's branch rules confirmed the L3 behavior. The merge base supplies the baseline. A separately governed baseline was not established.

## Verification on merged main

| Check                                 | Result                                                    |
| ------------------------------------- | --------------------------------------------------------- |
| Lint, Glint, and Prettier             | Passed                                                    |
| Chrome suite                          | 159 passed, up from 149                                   |
| Coverage and structural tooling tests | Nine passed                                               |
| Line coverage                         | 72.48%, up from 71.95%                                    |
| Branch coverage                       | 59.51%, up from 59.06%                                    |
| Statement and function coverage       | 71.67% and 69.05%                                         |
| Coverage outputs                      | Verified JSON summary and HTML landing page               |
| Structural gate                       | 75 existing findings, down from 79, with zero regressions |
| Documentation targets                 | 24 local links and Markdown anchors resolved              |

## Dimension findings

- **Type Safety.** Schema-backed API calls now infer validated output types and reject absent required bodies. Nine endpoint paths use schemas. Calls without schemas still use the `Promise<any>` fallback.
- **Test Foundation.** Ten new tests cover API response edge cases, v1 settings payloads, recovery, remembered keys, account separation, persisted device metadata, and HTTP 409 retries. Coverage floors remain in force.
- **Documentation & Context.** Agent guidance and the architecture guide now reflect current API validation and CI. A canonical domain glossary, documented rollback procedure, and automated documentation verification are still missing.
- **Code Clarity.** The settings sync service shrank from 1,074 to 645 lines. Application files have a median of 45 lines, and no application file exceeds 1,000 lines.
- **Architecture Clarity.** Seven focused modules now handle crypto, device keys, HTTP, local metadata, v1 payloads, field-clock merges, and recovery merges. The service coordinates those modules and continues to hold sync state.
- **Feedback Loops.** GitHub publishes exact-base coverage comparisons and the full report. The base and candidate suites run sequentially. The browser job for #214 took 6 minutes and 5 seconds.
- **Consistency & Conventions.** ESLint, Glint, and the configured Prettier checks continue to run in PR lint.
- **Change Safety.** The structural gate remains required for `main`. The settings changes preserve v1 recovery, remembered keys, and conflict retries. Rollback still lacks a documented rehearsal.

## Improvement roadmap

1. Validate remaining high-value API responses, including session and private-message reads.
2. Document and rehearse the release rollback procedure.
3. Shorten the PR coverage job while preserving exact-base comparisons.
