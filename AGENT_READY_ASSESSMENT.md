# Agent-Ready Assessment: potber-client

**Overall score: 53.4/100 — Agent-Supervised**

The repository supports focused agent changes, but still needs substantial human review before merging. Strict types, passing tests, and enforced linting provide useful safeguards; limited test breadth, missing coverage output, and undocumented architecture make behavioral correctness expensive to verify.

Assessed on **20 November 2026**, commit `782bcb8`. Saved on 22 November 2026 without rerunning the assessment. No repository files were changed during the assessment.

## Score breakdown

Weights follow the skill’s statically typed language rubric.

| Dimension                 |   Weight | Score |  Weighted |
| ------------------------- | -------: | ----: | --------: |
| Type Safety               |      20% |    60 |     12.00 |
| Test Foundation           |      15% |    43 |      6.45 |
| Documentation & Context   |      15% |    32 |      4.80 |
| Code Clarity              |      15% |    73 |     10.95 |
| Architecture Clarity      |      15% |    45 |      6.75 |
| Feedback Loops            |      10% |    62 |      6.20 |
| Consistency & Conventions |       5% |    72 |      3.60 |
| Change Safety             |       5% |    52 |      2.60 |
| **Total**                 | **100%** |       | **53.35** |

These scores are rubric-based judgments, not measured probabilities of successful autonomous changes.

## Codebase Snapshot: potber-client

- **Primary language/framework**: TypeScript, Ember 7.3, Glint and Vite 8
- **Language tier**: statically-typed (inherited strict:true; noImplicitThis:false override)
- **Commit count**: 1,341
- **Contributors**: 12
- **Source files**: 266 application code files (136 .ts, 125 .gts, 5 .js)
- **Test files**: 40 (test/source ratio: 15.0%)
- **CI/CD**: GitHub Actions; five workflows, including external reusable workflows
- **Agent instructions**: absent in repository; session-supplied ZEISS instructions are not repository documentation
- **Domain context**: absent; ADR location absent, count 0
- **Linting config**: ESLint and Prettier
- **Quality gates**: L2 -- CI enforces unused-variable errors through reusable lint workflow; no complexity/duplication checks or regression baseline
- **README**: present, 203 lines

The reconnaissance script missed Ember’s `.gts` files and `*-test.ts` naming. Those counts were corrected before assessment.

## Quality Gate Maturity

- **Quality gates**: L2 -- CI enforces unused-variable errors through reusable lint workflow; no complexity/duplication checks or regression baseline

The script initially suggested L1 because it did not inspect external reusable workflows. The verified [shared lint workflow](https://github.com/potber/.github/blob/v2/.github/workflows/npm_lint.yml) runs `npm run lint` without soft-failing.

This is limited unused-variable enforcement, not comprehensive unused-export or dead-module detection. Branch-protection requirements were not inspected.

## Critical finding

**Documentation & Context is the only dimension below 40.** There is no repository instruction entrypoint, architecture map, domain guide, or decision record. Agents must infer important constraints from implementation, and the README contains stale setup guidance.

The benchmark framing supplied by the skill emphasizes cheap verification of agent-generated changes. Here, the main constraint is whether passing checks cover the behavior being changed.

## Verification cost profile

| Signal                             | Observed status                    | Implication                                              |
| ---------------------------------- | ---------------------------------- | -------------------------------------------------------- |
| Tests complete within 10 minutes   | Yes, locally                       | Fast iteration is feasible                               |
| Browser tests pass                 | 104 passed; none failed or skipped | Existing tested behavior has a useful oracle             |
| Type checking passes               | Yes, Glint                         | Includes template-aware checks                           |
| ESLint passes                      | Yes                                | Source conventions are enforced                          |
| Whole-repository formatting passes | No, four files fail                | CI formatting scope is incomplete                        |
| Coverage generated                 | No report produced locally         | Coverage percentage is unknown                           |
| Coverage reported as a PR delta    | Not configured                     | No visible coverage regression signal                    |
| Automated security scanning        | No explicit job found              | Security verification remains limited                    |
| Property-based tests               | None found                         | No generated adversarial-input coverage                  |
| Reproducible development state     | Partial                            | Devcontainer and fixtures exist; previews share backends |
| Structural regression gate         | Absent                             | Complexity and duplication can grow unnoticed            |

**Verification bottleneck:** the passing suite provides limited evidence for changes outside its existing coverage, and coverage reporting currently cannot establish where those gaps are.

## Dimension details

### Test Foundation — 43/100

**Evidence:** 27 unit, 11 integration, and two acceptance test files; 104 passing browser tests. One named test file contains only a commented skeleton. The 15% test/source ratio measures file counts, **not code coverage**.

Tests exercise meaningful API behavior, parsing, sanitization, settings, and rendering. There were no skipped tests or TODOs, and no evidence sufficient to label the suite flaky.

However, `test:coverage` produced no coverage directory. Build inspection found the coverage marker in test-helper output but not application instrumentation. The [shared test workflow](https://github.com/potber/.github/blob/v2/.github/workflows/npm_test-coverage.yml) requests an HTML artifact, but no threshold or coverage delta is configured.

**Scoring:** 43, with no numeric modifiers.

**Priority:** repair coverage generation, fail CI on missing output, then expand behavioral tests around authentication, reading/posting, private messages, and synchronization.

### Feedback Loops — 62/100

Lint and tests run in independent GitHub Actions jobs with npm caching. Local browser verification completed within ten minutes; hosted CI timing was not measured.

The devcontainer includes Node 24 and Chromium. PR previews have distinct hosts and cleanup, but share staging API/auth services. Weekly Dependabot updates are configured; no explicit security-scanning job or pre-commit hooks were found.

Structural checks have no merge-base comparison, actionable regression summary, or gate tests.

**Scoring:** base 56, plus three for partially isolated preview environments and three for Dependabot.

**Priority:** restore trustworthy coverage feedback, document local browser prerequisites, and measure hosted CI duration before optimizing it.

### Documentation & Context — 32/100

The [README](README.md) provides useful feature, development, testing, deployment, and preview instructions. Its checked relative Markdown links resolve.

Missing artifacts include repository `AGENTS.md`/`CLAUDE.md`, `ARCHITECTURE.md`, domain context, ADRs, and focused testing guidance. No documentation freshness or link-checking CI was found. Instruction density and duplication checks are inapplicable because no repository instruction file exists.

Two concrete coherence problems:

- Prerequisites (README line 97) specify Node 20, while `.nvmrc` and package engines require Node 24.
- Build instructions (README line 133) use Ember CLI commands, while package scripts use Vite.

**Scoring:** 32 within the README-only band; no formal modifiers.

**Priority:** correct commands and runtime requirements, add a concise agent entrypoint, and document feature entry points and invariants. Record ADRs when consequential decisions are actually established.

### Code Clarity — 73/100

Application code files average **71.6 lines**, with a median of **46**. Naming and Ember directory conventions generally make navigation straightforward.

Only two application code files exceed 500 lines:

- [settings-sync.ts](app/services/settings-sync.ts): **1,074 lines**, combining state management, encryption, persistence, transport, validation, and merging.
- [changelog.ts](app/assets/changelog/changelog.ts): **684 lines**, principally data rather than complex behavior.

No complexity or duplication tooling is configured. Unused-variable rules do not detect unused exported modules.

**Scoring:** base 78, minus five under the rubric’s catch-all-directory criterion for `components/common`.

**Priority:** extract independently testable synchronization responsibilities and establish structural checks that understand `.gts`.

### Consistency & Conventions — 72/100

ESLint covers JavaScript, TypeScript, Ember, Node, and QUnit conventions. Source-code Prettier violations are errors, and a fresh ESLint run passed. Only six lint-disable occurrences were found across application/type files.

The broader formatter failed on:

- `.devcontainer/devcontainer.json`
- `app/assets/styles/modal/list.css`
- `tests/index.html`
- `tsconfig.json`

These extensions fall outside the source formatting enforced through ESLint. A template-lint configuration exists without a dedicated package script.

**Scoring:** 72, with no formal modifiers.

**Priority:** fix the four formatting discrepancies and run the existing `prettier:check` script in CI. Clarify whether the standalone template-lint configuration remains intentional.

### Type Safety — 60/100

Glint passed. Inherited settings enable strict mode and unchecked-index protection, although `noImplicitThis` is disabled locally.

Application searches found 19 explicit `any` patterns across 16 files and no `@ts-ignore` or `@ts-expect-error`. These counts do not establish an annotation percentage.

The main gap is the external-data boundary: [api.ts](app/services/api.ts), line 111, returns `Promise<any>`, while endpoint methods promise concrete types without validating JSON. Manual validation exists for some synchronized payloads and saved posts, but is uneven.

**Scoring:** 60, with no modifiers.

**Priority:** receive external data as `unknown` and validate critical API, session, and persisted-data structures before assigning domain types.

### Architecture Clarity — 45/100

Ember’s routes, controllers, components, and services provide predictable navigation. API endpoint modules and content-parser modules offer useful separation.

Feature responsibilities nevertheless span several framework layers, with no documented ownership map or enforced dependency boundaries. The settings synchronization service is the clearest concentration of unrelated implementation concerns.

**Scoring:** base 50, minus five for the business-logic module exceeding 1,000 lines.

**Priority:** document authentication, API, rendering, and synchronization data flow; then separate synchronization validation/merging, encryption, persistence, and transport behind focused interfaces.

### Change Safety — 52/100

Git co-change analysis suggests moderate coupling, predominantly between related feature files. For example, settings controller/service changed together in 13 smaller commits; dependency and changelog churn were excluded from coupling judgments.

Staging and production deployments depend on lint/tests. Static deployment retains hashed assets and uploads entry files last, helping existing clients survive releases.

No structural regression baseline, enforced domain boundaries, or documented product rollout mechanism was found. Rollback is possible through redeployment but lacks a documented, tested procedure. Database migrations are inapplicable to this SPA; persisted settings compatibility still matters.

**Scoring:** 52, with no modifiers.

**Priority:** document and rehearse rollback, test old settings payload compatibility, and introduce a reviewed structural regression baseline.

## Improvement roadmap

### Quick wins — approximately 1–2 days each

1. **Repair coverage generation** and make missing reports fail CI.
2. **Correct the README** and add concise agent instructions with verified commands.
3. **Enforce full formatting** using the existing check script.
4. **Document architecture and rollback**, including authentication/configuration dependencies.
5. Replace the commented post-component test skeleton with meaningful behavior coverage.

### High-value investments — approximately 1–4 weeks each

1. Expand tests for core user journeys and establish an actual coverage baseline.
2. Validate API and storage boundaries from `unknown`.
3. Separate settings synchronization responsibilities while preserving behavior.
4. Add regression-aware complexity, duplication, and unused-code checks with a reviewed baseline.
5. Improve security scanning and isolated development fixtures.

### Ongoing architecture work

Maintain a small architecture map, enforce meaningful dependency boundaries, and preserve persisted-data compatibility through explicit tests. Add rollout controls where the risk of a particular feature justifies them.

The skill’s companion [agent-ready workflow](https://www.damiangalarza.com/agent-ready/) is an optional route for documentation scaffolding and structural gates; no tooling was installed during this assessment.

---

Generated by the codebase-readiness skill.
