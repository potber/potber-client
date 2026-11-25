# Agent-ready reassessment of potber-client

**84.60/100, Agent-Assisted.** The score rose **1.20 points** from the [83.40 reassessment](AGENT_READY_REASSESSMENT_2026-11-25_b3834d5.md) and is 0.40 points below the Agent-Ready threshold of 85.

Assessed on 25 November 2026 against merged main at [`e7187fc`](https://github.com/potber/potber-client/commit/e7187fc).

| Dimension                 |   Weight |  Previous |   Current |  Weighted |
| ------------------------- | -------: | --------: | --------: | --------: |
| Type Safety               |      20% |        89 |        89 |     17.80 |
| Test Foundation           |      15% |        78 |        80 |     12.00 |
| Documentation & Context   |      15% |        79 |        82 |     12.30 |
| Code Clarity              |      15% |        90 |        90 |     13.50 |
| Architecture Clarity      |      15% |        75 |        76 |     11.40 |
| Feedback Loops            |      10% |        90 |        92 |      9.20 |
| Consistency & Conventions |       5% |        79 |        79 |      3.95 |
| Change Safety             |       5% |        87 |        89 |      4.45 |
| **Total**                 | **100%** | **83.40** | **84.60** | **84.60** |

## Verification

- All 253 Chromium tests and 13 tooling tests passed. ESLint, Glint, and Prettier passed. The PR documentation checker resolved all 107 local links it checked.
- The [recorded live staging run](https://github.com/potber/potber-client/actions/runs/45597366642) verified that a session survived reload after one login and two staging API session reads, with no retries. The assessment reused that evidence.
- The structural gate remained L3. Findings fell from 53 to 52 with zero new or worsened findings. GitHub required lint, tests, the structural check, and code-owner approval on owned paths.
- Coverage reports were generated in HTML, JSON, and LCOV.

| Coverage   | Previous | Current |
| ---------- | -------: | ------: |
| Statements |   79.85% |  80.20% |
| Branches   |   70.20% |  70.71% |
| Functions  |   76.39% |  76.46% |
| Lines      |   80.72% |  80.99% |

## Remaining gaps

1. Independent code-owner review is unavailable when the sole team member authors a gate change. Document the approval constraint in the [quality gates guide](docs/guides/quality-gates.md).
2. The [rollback rehearsal](docs/guides/staging-rollback-rehearsal-2026-11-23.md) covered signed-out behavior. An authenticated staging rollback rehearsal would extend that evidence.
3. Settings sync still has a 585-line orchestrator and nine utility modules. Recent tests cover recovery conflicts, remote deletion, and missing field clocks.
4. The Chromium startup timeout has a bounded CI retry. Its underlying cause remains unconfirmed.
