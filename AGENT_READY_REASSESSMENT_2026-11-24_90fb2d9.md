# Agent-ready reassessment of potber-client

**75.85/100, Agent-Assisted**, down **3.80 points** from the [last saved assessment](AGENT_READY_REASSESSMENT_2026-11-24_5703702.md) and 9.15 points below the Agent-Ready threshold.

Assessed on 24 November 2026 against merged main at [`90fb2d9`](https://github.com/potber/potber-client/commit/90fb2d9).

**What the drop means:** the code did not regress. Every measured value held or improved: coverage, the structural finding count, file sizes, and the auth ownership work. This run's passes scored gaps that already existed at `5703702` but that the last report did not weigh:

- Only `structural-checks` is a required check. Lint, Glint, and browser tests do not block merges.
- `@typescript-eslint/no-explicit-any` is off.
- Coverage floors are absolute, with no regression check.
- No CODEOWNERS file protects the gate configuration.

| Dimension                 |   Weight | Last saved |       Now |  Weighted |
| ------------------------- | -------: | ---------: | --------: | --------: |
| Type Safety               |      20% |         86 |        80 |     16.00 |
| Test Foundation           |      15% |         78 |        66 |      9.90 |
| Documentation & Context   |      15% |         74 |        74 |     11.10 |
| Code Clarity              |      15% |         91 |        86 |     12.90 |
| Architecture Clarity      |      15% |         66 |        68 |     10.20 |
| Feedback Loops            |      10% |         85 |        85 |      8.50 |
| Consistency & Conventions |       5% |         78 |        74 |      3.70 |
| Change Safety             |       5% |         74 |        71 |      3.55 |
| **Total**                 | **100%** |  **79.65** | **75.85** | **75.85** |

## Snapshot and verification

- Strict TypeScript, Ember, Glint, and Vite. The repository has 1,412 commits, 16 distinct author email addresses, 290 application source files, and 57 browser test files.
- Seven GitHub Actions workflows plus CodeQL. [AGENTS.md](AGENTS.md) is the canonical agent guide. The [README](README.md) is 193 lines. There is no domain glossary or ADR directory.
- **Quality gates:** L3. The required `structural-checks` job blocks new or worsened complexity, duplication, and unused code against the Git merge base. The recon script again suggested L1 because it missed the workflow's npm-script adapter.
- All 213 Chromium tests passed on Node 24, up from 195.
- Coverage:

  | Metric     |    Now | Change since `5703702` | Floor |
  | ---------- | -----: | ---------------------: | ----: |
  | Statements | 72.94% |              +0.50 pts |   70% |
  | Branches   | 60.20% |              +0.83 pts |   58% |
  | Functions  | 70.94% |              +0.26 pts |   67% |
  | Lines      | 73.61% |              +0.50 pts |   71% |

- These checks passed:
  - ESLint, Glint, and Prettier.
  - Nine tooling tests (`test:tooling`, `quality:test`).
  - The structural gate: 71 existing findings, 0 new or worsened.
- All 55 relative documentation links and anchors resolved.

## Findings

- **Type Safety.** Every forum endpoint, Imgpot response, sync transport, sync clock, and persisted local collection is validated with Valibot. There are no `@ts-*` suppressions. But `no-explicit-any` is off, and 17 `any` plus 3 `declare … any` remain, three of them in `CustomSession`. IDs are bare strings. A type error does not block a merge.
- **Test Foundation.** The suite is deterministic, with no skips and no test-level flakes in the last 100 runs. Network-stubbed acceptance tests cover sign-in, posting, private messages, sync, and session-read failure. The gaps:
  - Branch coverage is weakest in the gesture modifiers (0–6%), the `api.ts` error paths (52%), `renderer.ts` (44%), and `exception-handler.ts` (0%).
  - Floors sit 2–3 points below actual, and a drop above them passes.
- **Architecture and Code Clarity.**
  - `ARCHITECTURE.md` matches the code, including the 401-only sign-out from #243.
  - `api ↔ custom-session` is the only service cycle. It exists only at runtime: the imports are type-only and the cycle is documented.
  - Settings sync is still spread across a 584-line service, 10 flat `utils/settings-sync-*` files, and `models/`.
  - 61 of the 71 structural findings are duplication. The largest clusters are `button-link` / `control/link` and the post-form toolbar controls.
- **Feedback Loops.** The required gate answers in about 1 minute and the full PR pipeline in about 4.6 minutes. Two problems:
  - 20 acceptance tests take 95% of browser-test time, in roughly 5-second steps. That matches `httpTimeoutWarningThreshold: 5000`; the cause is unverified.
  - PR previews share the staging API and auth services. There are no pre-commit hooks.
- **Change Safety.** L3 blocking is real and tested. But a PR can loosen the analyzer configuration that both snapshots use, and no CODEOWNERS file or required review protects it. There are no feature flags. The rollback rehearsal still covers only signed-out use.
- **Documentation.** The AGENTS.md readiness-history line lists only 3 of the 6 reports. AGENTS.md also ends with a ZEISS web-project automation block that does not apply to this project.

## Next priorities

1. Make the `lint / Lint` and `test / Test` checks required in the "Protect main" ruleset, and fail PR coverage when a metric drops below the base. This is a repository settings change plus a small workflow change.
2. Turn on `@typescript-eslint/no-explicit-any` and fix the 20 sites, starting with a typed `CustomSession.data`.
3. Find out whether the 5-second timeout-warning timer is slowing acceptance tests. Then add branch coverage for the gesture modifiers and the `api.ts` error and timeout paths.
