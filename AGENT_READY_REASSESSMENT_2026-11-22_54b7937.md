# Agent-ready reassessment of potber-client

**68.60/100, Agent-Supervised**, up **5.40 points** from the [previous reassessment](AGENT_READY_REASSESSMENT_2026-11-22.md) and **15.25 points** from the [original assessment](AGENT_READY_ASSESSMENT.md). The Agent-Assisted band begins at 70.

Assessed on 22 November 2026 against merged `main` at [`54b7937`](https://github.com/potber/potber-client/commit/54b7937), including [#204](https://github.com/potber/potber-client/pull/204). Scores reflect that commit, including the documentation gaps addressed alongside this report.

## Score breakdown

| Dimension                 |   Weight |  Previous |       Now |  Weighted |
| ------------------------- | -------: | --------: | --------: | --------: |
| Type Safety               |      20% |        60 |        70 |     14.00 |
| Test Foundation           |      15% |        55 |        69 |     10.35 |
| Documentation & Context   |      15% |        57 |        58 |      8.70 |
| Code Clarity              |      15% |        85 |        85 |     12.75 |
| Architecture Clarity      |      15% |        50 |        52 |      7.80 |
| Feedback Loops            |      10% |        77 |        80 |      8.00 |
| Consistency & Conventions |       5% |        72 |        78 |      3.90 |
| Change Safety             |       5% |        57 |        62 |      3.10 |
| **Total**                 | **100%** | **63.20** | **68.60** | **68.60** |

## Codebase snapshot

- **Language and framework** TypeScript with inherited strict mode, Ember, Glint, and Vite.
- **Repository** 1,373 commits and 16 distinct author email addresses.
- **Source and tests** 272 application source files and 46 browser test files (16.9%), plus tooling tests.
- **CI/CD** Seven GitHub Actions workflows, plus GitHub CodeQL.
- **Agent guidance** A single root [AGENTS.md](AGENTS.md), 71 lines at the assessed commit.
- **Documentation** [README.md](README.md), 191 lines, [ARCHITECTURE.md](ARCHITECTURE.md), and a structural checks guide. No canonical domain glossary or ADR directory was found.
- **Linting** ESLint and Prettier.
- **Quality gates** L3 -- required PR CI check blocks new or worsened complexity, exact duplication, and unused code findings against the Git merge base.

## Quality gate maturity

- **Quality gates** L3 -- required PR CI check blocks new or worsened complexity, exact duplication, and unused code findings against the Git merge base.

Reconnaissance suggested L1 because it did not recognize the repository's analyzer adapter. The [implementation](scripts/structural-check.mjs) and [workflow](.github/workflows/structural-checks.yml) verify the L3 behavior. GitHub's branch rules require the check on `main`. The merge base supplies the baseline for each run, and the repository has no separately reviewed baseline for L4.

## Verification

| Check                                 | Result on merged main                                              |
| ------------------------------------- | ------------------------------------------------------------------ |
| Lint, Glint, and Prettier             | Passed                                                             |
| Chrome suite                          | 149 passed, zero failed or skipped                                 |
| Coverage                              | 71.95% lines, 70.92% statements, 67.65% functions, 59.06% branches |
| Coverage outputs                      | Verified JSON summary and HTML landing page                        |
| Coverage and structural tooling tests | Nine passed                                                        |
| Structural gate                       | 79 merge-base findings, 79 current findings, zero regressions      |
| Documentation                         | All 20 checked local file targets resolved                         |

## Dimension findings

- **Type Safety.** Strict TypeScript and Glint run in CI. Nine API response paths use Valibot. The shared transport still returns `Promise<any>` and bypasses schemas on empty successful responses.
- **Test Foundation.** The browser suite grew from 104 to 149 tests. It now covers sign-in, forum reading and writing, bookmarks, private messages, and settings sync. Tests use HTTP fixtures. Property and mutation testing were not found.
- **Documentation & Context.** The canonical instructions and codemap are concise. The assessed revision still had stale API and CI descriptions, and a domain glossary and document verification in CI are absent.
- **Code Clarity.** The median application file is 44 lines. The structural gate enforces complexity, exact duplication, and unused-code checks. The 1,074-line settings-sync service remains the largest business-logic file.
- **Architecture Clarity.** The API's endpoint, schema, and model directories make response validation easy to locate. Settings sync spans transport, encryption, storage, and conflict resolution in a single service.
- **Feedback Loops.** PRs publish complete coverage artifacts and compare the proposed merge with the exact base commit. The browser gate takes roughly six minutes and runs both suites sequentially. Preview environments share staging services.
- **Consistency & Conventions.** ESLint, Glint, and the configured Prettier check run in PR lint. The formatter preserves the verbatim upstream skill copies through explicit exclusions.
- **Change Safety.** The required structural check stops new debt from reaching `main`. Rollback remains manual and unrehearsed in the available documentation.

## Improvement roadmap

1. Refresh API and CI guidance as the implementation changes. Add a documentation link check to keep the guidance navigable.
2. Make schema-backed API calls infer their result types and reject empty success bodies when the schema requires JSON. Continue validating the remaining response paths.
3. Extract transport, cryptography, persistence, and conflict handling from settings sync with compatibility tests for existing data and recovery flows.
4. Reduce the PR coverage job's runtime while retaining exact-base comparisons. Document and rehearse rollback.
