# Staging session continuity across rollback and restore

This 25 November 2026 rehearsal followed the [earlier authenticated rehearsal](staging-rollback-rehearsal-2026-11-25.md). The earlier rehearsal started a fresh session on each build. This run established one session on the starting build and kept the same browser tab and context open across both deployment switches.

## Verification

The [staging browser probe](https://github.com/potber/potber-client/actions/runs/45711818930) used the dedicated staging account. It checked the served entry script and then navigated the same tab to a cache-busted staging home URL after each switch. The probe required the expected account greeting and a fresh successful response from the staging `/auth/session` endpoint on each build. It checked that both post-switch requests carried the original bearer credential without logging it.

| Phase          | Client commit | Staging deployment                                                                       | Served entry script |
| -------------- | ------------- | ---------------------------------------------------------------------------------------- | ------------------- |
| Starting build | `0eedf05`     | [Attempt 1](https://github.com/potber/potber-client/actions/runs/45711575826/attempts/1) | `main-BiRwFNnU.js`  |
| Rollback       | `c3c89e7`     | [Attempt 3](https://github.com/potber/potber-client/actions/runs/45601753164/attempts/3) | `main-Dt_m2G-K.js`  |
| Restore        | `0eedf05`     | [Attempt 2](https://github.com/potber/potber-client/actions/runs/45711575826/attempts/2) | `main-BiRwFNnU.js`  |

## Result

The existing session survived both switches. The probe made one login and three live session reads, one per build phase. After restoration, the served HTML, JavaScript entry, and injected configuration matched the starting files byte for byte. The API and auth configuration pointed to staging throughout. Both deployment reruns targeted the GitHub `test` environment.
