# Agent-ready reassessment of potber-client

**83.40/100, Agent-Assisted.** The score rose **2.20 points** from the [81.20 reassessment](AGENT_READY_REASSESSMENT_2026-11-25_2fee1be.md) and is 1.60 points below the Agent-Ready threshold of 85.

Assessed on 25 November 2026 against merged main at [`b3834d5`](https://github.com/potber/potber-client/commit/b3834d5).

| Dimension                 |   Weight |  Previous |   Current |  Weighted |
| ------------------------- | -------: | --------: | --------: | --------: |
| Type Safety               |      20% |        89 |        89 |     17.80 |
| Test Foundation           |      15% |        76 |        78 |     11.70 |
| Documentation & Context   |      15% |        77 |        79 |     11.85 |
| Code Clarity              |      15% |        89 |        90 |     13.50 |
| Architecture Clarity      |      15% |        70 |        75 |     11.25 |
| Feedback Loops            |      10% |        89 |        90 |      9.00 |
| Consistency & Conventions |       5% |        79 |        79 |      3.95 |
| Change Safety             |       5% |        75 |        87 |      4.35 |
| **Total**                 | **100%** | **81.20** | **83.40** | **83.40** |

## Snapshot and verification

- Strict TypeScript, Ember, Glint, and Vite. The repository had 1,434 commits, 16 distinct author email addresses, 291 application source files, and 59 browser test files. Median application file length was 41 lines.
- Eight GitHub Actions workflow files plus CodeQL. [AGENTS.md](AGENTS.md) is the canonical agent guide. There is no domain glossary or ADR directory.
- **Quality gates** — L3. Required CI checks block new or worsened complexity, duplication, and unused code against the merge base. The recon script suggested L1 because it missed the npm-script adapter. Code-owner review now protects the gate configuration. The project has no recorded baseline review process for L4.
- All 246 Chromium tests and 13 tooling tests passed. ESLint, Glint, and Prettier passed. Structural findings fell from 54 to 53 with zero new or worsened findings. All 102 checked local Markdown links and anchors resolved.
- The coverage run produced HTML, JSON, and LCOV reports.

| Coverage   | Previous | Current |    Change |
| ---------- | -------: | ------: | --------: |
| Statements |   79.80% |  79.85% | +0.05 pts |
| Branches   |   70.20% |  70.20% |  0.00 pts |
| Functions  |   76.24% |  76.39% | +0.15 pts |
| Lines      |   80.64% |  80.72% | +0.08 pts |

## Findings

- **Type Safety and Conventions.** Required lint still runs Glint and enforces the explicit-`any` rule. The shared transport preserves schema-backed response inference. Forum IDs remain plain strings, and the repository has no committed pre-commit hooks.
- **Architecture and Code Clarity.** [#262](https://github.com/potber/potber-client/pull/262) removed the runtime API/session dependency cycle. Both services use `ForumTransport`, which takes the token explicitly and leaves invalidation to its callers. Settings sync still spans a 584-line orchestrator and nine utility modules.
- **Testing and Feedback.** Four regression tests cover bearer-token handling, 401 invalidation, notifications, and signed-out cache clearing. The [staging smoke workflow](https://github.com/potber/potber-client/actions/runs/45582057229) passed in 36 seconds and verified sign-in and authenticated reload on the deployed client using isolated OAuth and API fixtures. Live backend login remains outside that coverage.
- **Documentation.** The [architecture guide](ARCHITECTURE.md) reflects the service split, and the [rollback guide](docs/guides/client-release-rollback.md) links to the staging smoke instructions. Link verification remains manual.
- **Change Safety.** [#261](https://github.com/potber/potber-client/pull/261) added code ownership for gate configuration and the ownership file itself. Live branch rules require code-owner review alongside lint, tests, and the structural check. The gate team has one member, which limits independent review when that member authors a protected change.

## Next priorities

1. Add independent code-owner review capacity for protected gate changes.
2. Extend staging verification to live login when a dedicated staging-only account is available.
3. Simplify the settings sync orchestrator while preserving recovery and conflict behavior.
