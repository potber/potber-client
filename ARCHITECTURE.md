# Architecture

## Overview

Potber provides a mobile-first interface to forum.mods.de: browsing boards and threads, writing posts, managing bookmarks and private messages, and personalizing the reading experience. This repository owns the browser application. Forum access and identity services live in separate projects; this client coordinates them with browser-local state and optional encrypted settings synchronization.

## Codemap

| Location                                       | Responsibility                                                                                                             |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `index.html`, `app/app.ts`                     | Vite HTML entrypoint, Ember application creation, styles, resolver, and initializers.                                      |
| `app/router.ts`, `app/routes/`                 | URL hierarchy, authentication transitions, and route model loading. `ApplicationRoute` starts application initialization.  |
| `app/controllers/`, `app/templates/`           | Route state/actions and route-level composition.                                                                           |
| `app/components/`                              | Typed template-tag components, grouped into features, route views, common controls, navigation, and modals.                |
| `app/services/`                                | Shared application state and coordination: API, session, settings, rendering, devices, notifications, and synchronization. |
| `app/services/api/`                            | Endpoint functions, response types, stateful API model wrappers, and `ApiError`.                                           |
| `app/models/`                                  | Additional client-side data models; this coexists with the API model wrappers.                                             |
| `app/services/content-parser/`                 | BBCode and private-message transformations called by `ContentParserService`.                                               |
| `app/modifiers/`, `app/helpers/`, `app/utils/` | DOM behaviors, template helpers, and utilities, including final HTML sanitization.                                         |
| `app/config/`, `app/assets/`, `app/polyfills/` | Browser configuration adapters, UI configuration, shared styles/themes, changelog data, and compatibility code.            |
| `app/authenticators/`                          | Ember Simple Auth authenticator integration.                                                                               |
| `config/`                                      | Build-time environment defaults, framework configuration, browser targets, PWA metadata, and coverage settings.            |
| `translations/`                                | German translation messages loaded through `ember-intl`.                                                                   |
| `types/`                                       | Ambient declarations, Glint registrations, and integration type shims.                                                     |
| `tests/`                                       | QUnit unit, integration, and acceptance tests, helpers, and fixtures.                                                      |
| `public/`                                      | Static images, icons, and other files served with the app.                                                                 |
| `deploy/`                                      | Runtime configuration generation, static upload scripts, and the PR preview Edge Script.                                   |
| `.github/`, `.devcontainer/`                   | CI/release/preview workflows, dependency updates, and local container tooling.                                             |

`app/session-stores/application.js` configures the cookie-backed session store; `app/exceptions/` defines application exception types. `app/styles/` contains the conventional Ember stylesheet entrypoint alongside the shared styles in `app/assets/`. The instance-initializer directory is currently empty.

`vite.config.mjs`, `babel.config.mjs`, and `ember-cli-build.js` connect Vite, Embroider, Babel, and legacy Ember build integration. `dist/`, `tmp/`, and `node_modules/` are generated output or dependencies rather than authored source. `.logo/` holds repository branding; `.vscode/` contains editor settings. `.agents/skills/` contains project-local agent skills, with their sources recorded in `skills-lock.json`.

## Main flows

### Startup and configuration

The root HTML entrypoint attempts to load optional `/injected-config.js` before the vendor script, and creates the Ember application. `config/environment.js` supplies build-time defaults; `app/config/app.config.ts` and `auth.config.ts` prefer corresponding `window.APP` overrides. Configuration delivered to the browser is public, including any injected values.

`ApplicationRoute` loads German translations and calls `AppService.initialize()`. That service initializes settings, notifications/error handling, rendering, device behavior, session setup, and deployment-version checks. Startup calls [SessionSetupService](app/services/session-setup.ts) without waiting for remote settings. The settings screen uses the same service when the user retries sync. `AppService` starts [DeploymentVersionService](app/services/deployment-version.ts), which checks `/version.json` on startup and when the app returns to the foreground. It navigates to load a changed deployment and handles manual refresh from settings. [ReleaseNoticeService](app/services/release-notice.ts) compares the running version with the last version seen on this device and shows the changelog notice after an upgrade.

### Authentication and forum requests

`auth.login` redirects to the configured issuer's `/authorize` endpoint using `response_type=token`. `auth.callback` reads the URL fragment and authenticates through `OAuth2Authenticator`, which extends Ember Simple Auth's implicit-grant authenticator. `CustomSession` loads forum session data; the parent `authenticated` route guards protected routes. The older `login` route redirects to `auth.login` for compatibility.

The OAuth redirect leaves the app, so the in-memory `attemptedTransition` is lost. Instead, the `authenticated` route's `requireAuthentication` call stores the requested URL as Ember Simple Auth's redirect target. The cookie store writes it to the `potber-session-redirectTarget` cookie, and the session service also keeps a copy in `sessionStorage`. After a successful callback, `auth.callback` reads and clears the target. It transitions there only when the target is a path in this app (no absolute or protocol-relative URL) that is not a sign-in route (`login`, `auth.*`). Otherwise it goes to `authenticated.home`. A failed callback goes to `auth.login` and keeps the target for the next attempt.

`authConfig.redirectUri` is the browser origin plus `/auth/callback`. Issuer/client settings and allowed redirects belong to the separate auth service as well as client configuration; changes must keep those contracts aligned.

Ordinary forum requests flow from routes, controllers, components, or model wrappers through endpoint methods exposed on `ApiService`. That service supplies the bearer token and invalidates the session on HTTP 401. [ForumTransport](app/services/forum-transport.ts) serializes requests, applies timeouts, validates responses, and maps failures to notifications.

`CustomSession` owns authentication state. Its `accessToken` getter is the only reader of Ember Simple Auth's stored credentials. `ApiService`, `ImgpotService`, and `SessionSetupService` (for settings sync) take the token from there. `CustomSession.update()` uses the shared forum transport directly and invalidates the session only on HTTP 401. The transport takes the bearer token as an argument and leaves session state to its callers. Invalidation reloads the app at the root URL. Other failures (network errors, timeouts, 5xx responses, payload validation errors) keep the user signed in and leave `sessionData` unchanged, so it stays `null` if it never loaded. Callers handle `null`: startup skips settings sync until the next launch, the home and settings pages render without the user's name, and `getSessionData()` retries while the data is missing. `CustomSession.handleAuthentication` only reloads session data; `auth.callback` owns the post-sign-in redirect.

The forum transport requires a Valibot response schema for every endpoint. Endpoints that return data require a matching body. Mutations that return no data validate an empty success response as `undefined`. Schema-backed calls infer the schema output type. Validation errors use the existing API error handling and report field paths without payload values. The [forum response decoder](app/services/api/response.ts) handles both success payloads and error responses. It validates recognized error fields before falling back to the HTTP status and status text. Settings sync, Imgpot, and the deployment version check validate responses at their own transport boundaries.

### Content rendering

`ContentParserService` transforms forum content using tag-specific parsers. Post parsing escapes raw angle brackets before processing BBCode, links, media, quotes, and other supported markup. Private messages have a separate HTML transformation path.

The rendering boundary remains distinct from parsing: post and private-message components pass generated HTML through `sanitizeHtml` in `app/utils/sanitize-html.ts` before `htmlSafe`. Preserve both the parser behavior and final sanitizer when adding markup support; parser output alone is not a trusted HTML contract.

### Preferences and encrypted synchronization

`SettingsService`, `LocalStorageService`, and `SocialsService` own preferences and local collections such as saved posts, favorite boards, and blocked users. Board views ask `LocalStorageService` to add or remove favorites by ID. Saved-post views use the same service to edit persisted post references. The service is the source for both collections, sends local edits to settings sync, and loads forum details for display. `SessionSetupService` gathers those collections for sync and applies synchronized values. [SettingsEffectsService](app/services/settings-effects.ts) applies theme, sidebar layout, font size, gestures, and debug mode after a manual edit or sync restoration. Startup also uses it to apply the saved debug preference. The renderer reads preferences through `SettingsService`, while rendering effects live outside that service. The Settings controller reads [its dropdown options](app/config/settings-options.ts) directly. The settings route loads the session model. [SettingsStorageService](app/services/settings-storage.ts) owns the local preference record. Local settings reads and sync restoration share the [normalization module](app/services/settings/normalize.ts), which supplies defaults for missing or invalid fields.

`SettingsSyncService` coordinates per-user encrypted payloads, recovery/unlock behavior, field clocks, revision conflicts, and collection merging. It uses Web Crypto for encryption, IndexedDB for key persistence, and localStorage for synchronization metadata/device identity. The [settings sync transport](app/utils/settings-sync-transport.ts) handles authenticated requests to `/user-configuration`. The [recovery overwrite module](app/utils/settings-sync-recovery-overwrite.ts) prepares revision-checked recovery writes and retries once after a conflict. The [settings sync envelope module](app/utils/settings-sync-envelope.ts) assembles field clocks, serializes and encrypts outgoing payloads, and decrypts and validates incoming payloads.

The [sync preference mapping](app/utils/settings-sync-preferences.ts) translates preferences to the v1 `settings.*` fields and normalizes decoded values. The [metadata reader](app/utils/settings-sync-metadata-storage.ts) validates the local field-clock map before merge. Missing or malformed records are treated as absent. The [sync clock module](app/utils/settings-sync-clocks.ts) owns timestamp ordering and metadata construction. Persisted field names, payload versions, clocks, and remote revisions form compatibility boundaries. Keep validation, merge behavior, and unlock semantics consistent when changing them. Local storage and sync recovery share the [blocked-user](app/models/blocked-user.ts) and [saved-post reference](app/models/post.ts) schemas. Local reads retain valid entries in partially malformed collections. Encrypted recovery requires every entry to be valid.

## Boundaries and invariants

- This is a browser SPA with history-based routing, not an application server. Hosting must return the app shell for client routes. There is no server-side database or migration layer in this repository.
- Forum data and identity are external HTTP contracts. Browser models and TypeScript declarations do not establish server-side authorization or validate every incoming payload.
- Ember services hold shared state; routes/controllers coordinate navigation and view actions; components render and handle interaction. These are existing conventions, not mechanically enforced import boundaries.
- API endpoint modules and API model wrappers use the central forum transport. Settings sync, deployment-version checks, and other specialized integrations have their own requests; there is no universal single HTTP gateway.
- Browser storage, encrypted remote configuration, and backend-owned forum data have different owners and lifecycles. A local settings write is not necessarily a server-side forum mutation.

## Cross-cutting concerns

### Errors and observability

`MessagesService` provides application logs and notifications; `ExceptionHandler` installs global error handling. `ApiService` logs request failures locally and shows the configured notifications. Keep tokens and decrypted synchronization payloads out of logs.

### Types and tests

TypeScript inherits strict settings from `@tsconfig/ember`, with local exceptions in `tsconfig.json`. Glint checks templates as well as TypeScript. ESLint applies Ember and QUnit conventions. PR lint also runs the configured Prettier check across supported project files.

Tests use QUnit and Ember helpers in the browser, with service substitutions and fixtures under `tests/`. Testem launches the browser after a Vite build. See [AGENTS.md](AGENTS.md) for local verification commands.

### Deployment

Pull requests run shared lint and the repository's [browser coverage workflow](.github/workflows/pr-coverage.yml). The coverage job runs the suite on the exact base SHA and proposed merge in parallel, reports percentage-point changes and configured floors in the Actions summary, and uploads the complete `coverage-report` artifact. It fails when any metric falls below the configured floor or below the base SHA's coverage. The coverage gate's own tests (`npm run test:tooling`) run in the structural check. GitHub requires `lint / Lint`, `test / Test`, and the separate [structural check](docs/guides/quality-gates.md) for merges into `main`. Staging and production releases use the shared lint and coverage workflows.

Static delivery uses Bunny Storage/Pull Zones with generated browser configuration; hashed assets are retained and entry/configuration files are uploaded last before cache purging.

Same-repository PR previews are uploaded to a folder per PR in a shared preview Storage Zone, and an Edge Script maps `pr-<number>.preview.potber.de` to that folder; previews use distinct hostnames but shared staging API/auth services. Preview deployment and test verification are separate workflows. Deployment settings, required variables, and secrets are documented in [README.md](README.md#deploying).
