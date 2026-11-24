# Working on potber-client

Mobile-first Ember client for forum.mods.de. Use Node 24 from `.nvmrc` and npm with the committed lockfile.

## Commands

| Task                                  | Command                  |
| ------------------------------------- | ------------------------ |
| Install dependencies                  | `npm ci`                 |
| Develop with local API/auth           | `npm start`              |
| Develop with staging API/auth         | `npm run start:remote`   |
| Production build                      | `npm run build`          |
| ESLint and Glint template/type checks | `npm run lint`           |
| Browser tests (builds first)          | `npm test`               |
| Coverage run                          | `npm run test:coverage`  |
| All-file formatting check             | `npm run prettier:check` |

See `package.json` for additional scripts. Browser tests default to Chromium; `TESTEM_BROWSER` selects another installed Testem browser. See `testem.js` for launch configuration.

## Session startup

1. Confirm the checkout with `pwd`, `git status --short`, and `git log --oneline -10`; preserve existing work.
2. Read [ARCHITECTURE.md](ARCHITECTURE.md) before changing authentication, API boundaries, content rendering, persistence, or deployment.
3. When integrating upstream work, fetch `origin` and inspect divergence first. Follow the task's branch strategy; do not automatically merge or rebase a working branch during unrelated work.
4. For code changes, use `npm run lint:types` as an initial smoke check when dependencies are installed. Distinguish existing failures from regressions introduced by the task.

## Conventions

- Follow existing Ember routes/controllers/services and typed `.gts` component patterns. Keep component styles colocated when the surrounding feature uses CSS modules.
- Put ordinary forum API operations in `app/services/api/endpoints/` and expose them through `ApiService`; preserve its authentication, timeout, and error handling. Consult the architecture document for separate transports.
- Treat network and persisted JSON as untrusted data. Type annotations and assertions do not validate responses at runtime.
- Validate API responses by passing a Valibot schema from `app/services/api/schemas/` as the `fetch` `schema` option. See [Authentication and forum requests](ARCHITECTURE.md#authentication-and-forum-requests) when adding validation to an endpoint.
- Preserve final HTML sanitization before `htmlSafe`; include hostile-input cases when changing parsers or rendering boundaries.
- Keep user-facing translations in `translations/de-de.yaml` where the feature uses `ember-intl`.
- Preserve stored settings and synchronization payload compatibility; test old payloads and conflict behavior when changing their formats.
- Keep tests under `tests/` using the existing `*-test.ts` convention and QUnit/Ember helpers. Include `.gts` files when searching application code.

## Definition of done

- For application changes, run `npm run lint`, relevant browser tests, and `npm run build` when build/configuration behavior is affected. Run the full `npm test` suite before handing off broad behavioral changes.
- Run `npm run quality:check` for application changes. Fix new or worsened findings before handoff. For PRs targeting a branch other than `main`, pass its remote-tracking ref. See the [structural checks guide](docs/guides/quality-gates.md) for reporting and troubleshooting.
- Exercise changed user flows end-to-end in a browser when the change affects interaction, navigation, authentication, or rendering; report any unavailable backend or browser prerequisite.
- For documentation-only changes, check Markdown formatting and local link targets; application tests are unnecessary unless commands or runtime configuration also changed.
- Verify that coverage output actually exists before reporting coverage. Check for `coverage/coverage-summary.json` and `coverage/index.html` after the run.
- PR coverage fails when any metric falls below the target branch's coverage. When you change application code, add tests that cover it.
- Review the final diff and report checks run, remaining failures, and material limitations. Keep unrelated changes out of the patch.

## Documentation

- [README.md](README.md): setup, features, deployment configuration, and preview environments.
- [ARCHITECTURE.md](ARCHITECTURE.md): module map, data flow, and system boundaries.
- Readiness history: [original assessment](AGENT_READY_ASSESSMENT.md) and [reassessment at `dc6b5ef`](AGENT_READY_REASSESSMENT_2026-11-22.md), and [reassessment at `54b7937`](AGENT_READY_REASSESSMENT_2026-11-22_54b7937.md).

Create an ADR under `docs/adr/` only when a decision is costly to reverse, surprising without context, and involves a real trade-off. Record the context, decision, and rationale; create the directory with the first qualifying record.

## Known gotchas

- Vite builds the app; Ember CLI remains in the browser-test pipeline. The root `index.html` is the Vite entrypoint.
- `start:remote` uses shared staging services. Use test fixtures for automated behavior checks instead of assuming isolated backend state.
- OAuth callbacks use the current origin plus `/auth/callback`; changing hosts or client IDs also requires compatible redirect configuration in the separate auth service.
- ESLint's Prettier integration covers code files; `prettier:check` also checks Markdown, CSS, HTML, and JSON.

<!-- BEGIN ZEISS WEB AUTOMATION -->

## ZEISS web project automation

For a request to create, initialize, or scaffold a new ZEISS or work-related website or web application, use the `zeiss-project-bootstrap` skill before visual implementation.

For a material user-interface change in an existing ZEISS or work-related web project, use the `zeiss-beyond-web` skill before making visual decisions or writing UI styles.

Treat ZEISS Figma workspaces as read-only unless the user explicitly requests a specific Figma write operation. If the relevant Beyond source cannot be read, report the blocker before visual implementation.
<!-- END ZEISS WEB AUTOMATION -->
