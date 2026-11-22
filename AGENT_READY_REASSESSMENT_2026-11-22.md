# Agent-Ready Reassessment: potber-client

**63.20/100 — Agent-Supervised**, up **9.85 points** from the [original 53.35/100 assessment](AGENT_READY_ASSESSMENT.md).

Assessed on 22 November 2026 against merged `main` at [`dc6b5ef`](https://github.com/potber/potber-client/commit/dc6b5ef), after [#179](https://github.com/potber/potber-client/pull/179), [#180](https://github.com/potber/potber-client/pull/180), and [#182](https://github.com/potber/potber-client/pull/182) passed CI and merged. The scores describe that commit, including the documentation conflict corrected alongside this report.

The project can verify changes more reliably now that it measures browser coverage and catches new structural debt. Human review remains important for behaviors with limited coverage and for external data that the client does not consistently validate at runtime.

## Score breakdown

| Dimension                 |   Weight |    Before |       Now |  Weighted |
| ------------------------- | -------: | --------: | --------: | --------: |
| Type Safety               |      20% |        60 |        60 |     12.00 |
| Test Foundation           |      15% |        43 |        55 |      8.25 |
| Documentation & Context   |      15% |        32 |        57 |      8.55 |
| Code Clarity              |      15% |        73 |        85 |     12.75 |
| Architecture Clarity      |      15% |        45 |        50 |      7.50 |
| Feedback Loops            |      10% |        62 |        77 |      7.70 |
| Consistency & Conventions |       5% |        72 |        72 |      3.60 |
| Change Safety             |       5% |        52 |        57 |      2.85 |
| **Total**                 | **100%** | **53.35** | **63.20** | **63.20** |

## Codebase Snapshot: potber-client

- **Primary language/framework**: TypeScript, Ember 7.3, Glint and Vite 8
- **Language tier**: statically-typed (inherited strict:true; noImplicitThis:false override)
- **Commit count**: 1,351
- **Contributors**: 12
- **Source files**: 266 application code files (136 .ts, 125 .gts, 5 .js)
- **Test files**: 40 browser test files (15.0% test/source ratio), plus 2 tooling test files
- **CI/CD**: GitHub Actions; six tracked workflows plus GitHub CodeQL
- **Agent instructions**: root AGENTS.md, 70 lines, regular file; no CLAUDE.md
- **Domain context**: no canonical domain guide or glossary; no ADRs
- **Linting config**: ESLint and Prettier
- **Quality gates**: L3 -- PR CI blocks new or worsened complexity, exact duplication, and unused-code findings against a Git merge-base snapshot
- **README**: present, 205 lines

## Quality Gate Maturity

- **Quality gates**: L3 -- PR CI blocks new or worsened complexity, exact duplication, and unused-code findings against a Git merge-base snapshot

Reconnaissance suggested L1 because it did not recognize the analyzer adapter and CI command. The [gate implementation](scripts/structural-check.mjs) compares two snapshots using the same configuration and fails on new or worsened findings. The [GitHub workflow](.github/workflows/structural-checks.yml) runs that command without soft failure. The comparison uses the merge base as its reference. No reviewed and protected baseline or equivalent L4 governance was established. GitHub did not list the gate as a required merge check at assessment time.

## Verification

| Check                                  | Result on merged main                                              |
| -------------------------------------- | ------------------------------------------------------------------ |
| ESLint and Glint                       | Passed                                                             |
| Browser suite                          | 104 passed, zero failed or skipped                                 |
| Coverage and structural tooling suites | Eight tests passed                                                 |
| Structural check                       | 79 reference findings, 79 current findings, zero regressions       |
| Coverage                               | 45.19% lines, 44.52% statements, 32.68% functions, 38.84% branches |
| Whole-tree Prettier                    | Six files flagged, including two vendored skill files              |
| Local Markdown links                   | Checked links resolve                                              |

Before merge, GitHub Actions also passed lint, browser tests, CodeQL, and preview CI on all three PRs. The structural job passed on #182. The workflow uploads the coverage landing page, but the drill-down pages and styling assets are missing from that artifact.

## Dimension findings

- **Type Safety.** Strict TypeScript and Glint check application code and templates. The API transport still returns `Promise<any>`, and endpoint types do not validate returned JSON. The scan found 19 explicit `any` patterns across 16 application files.
- **Test Foundation.** The repaired coverage pipeline measures 262 application files and enforces floors for all four metrics. Forty browser test files span unit, integration, and acceptance coverage. One named file is a commented skeleton. Property and mutation testing were not found.
- **Documentation & Context.** The root agent instructions, architecture map, and guide materially improve navigation. The score includes a 10-point coherence deduction because the assessed `AGENTS.md` said that no structural gate existed. The same PR as this report corrects the statement. A canonical domain guide, ADRs, and CI documentation checks are still absent.
- **Code Clarity.** The median application file is 46 lines. The L3 gate covers cyclomatic complexity, exact duplication, and unused code. The 1,074-line settings synchronization service is the main outlier and combines transport, encryption, persistence, and merge behavior.
- **Architecture Clarity.** The codemap covers runtime configuration, authentication, rendering, persistence, and deployment. Features still span Ember framework layers, and domain boundaries are not mechanically enforced.
- **Feedback Loops.** PR lint, tests, CodeQL, and the structural gate run independently. On #182 the gate passed in 39–45 seconds. It has reproducible local commands, inline CI annotations, and its own tests. Preview hosts are separate but share staging services. Coverage deltas are not surfaced on PRs.
- **Consistency & Conventions.** Source lint and formatting pass in CI. Whole-tree Prettier flags `.devcontainer/devcontainer.json`, `app/assets/styles/modal/list.css`, `tests/index.html`, `tsconfig.json`, and two vendored skill documents.
- **Change Safety.** The structural check rejects new or worsened findings against the merge base and needs no manually maintained findings file. Rollback remains manual, rollout controls are limited, and the gate is not a required merge check.

## Improvement roadmap

1. Add browser behavior coverage for authentication, posting, private messages, and settings synchronization. Raise the coverage floors as those tests land.
2. Publish the entire coverage report and show coverage changes on pull requests.
3. Require the structural check for merges to `main`. Resolve the project-owned formatting gaps and account for verbatim vendored skills before enforcing full-tree formatting.
4. Validate API payloads at runtime before assigning domain types. Split settings synchronization into independently testable responsibilities while preserving compatibility.
5. Document and rehearse rollback. Record domain vocabulary and consequential architectural decisions as the work clarifies them.
