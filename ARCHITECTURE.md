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
| `deploy/`, `.nginx/`, `Dockerfile`             | Runtime configuration generation, static upload scripts, and the alternative nginx container deployment.                   |
| `.github/`, `.devcontainer/`                   | CI/release/preview workflows, dependency updates, and local container tooling.                                             |

`app/session-stores/application.js` configures the cookie-backed session store; `app/exceptions/` defines application exception types. `app/styles/` contains the conventional Ember stylesheet entrypoint alongside the shared styles in `app/assets/`. The instance-initializer directory is currently empty.

`vite.config.mjs`, `babel.config.mjs`, and `ember-cli-build.js` connect Vite, Embroider, Babel, and legacy Ember build integration. `dist/`, `tmp/`, and `node_modules/` are generated output or dependencies rather than authored source. `.logo/` holds repository branding; `.vscode/` contains editor settings. `.agents/skills/` contains project-local agent skills, with their sources recorded in `skills-lock.json`.

## Main flows

### Startup and configuration

The root HTML entrypoint attempts to load optional `/injected-config.js` before the vendor script, and creates the Ember application. `config/environment.js` supplies build-time defaults; `app/config/app.config.ts` and `auth.config.ts` prefer corresponding `window.APP` overrides. Configuration delivered to the browser is public, including any injected values.

`ApplicationRoute` loads German translations and calls `AppService.initialize()`. That service initializes settings, notifications/error handling, rendering, device behavior, session setup, and deployment-version checks. Session setup connects authenticated settings synchronization and user collections. `AppService` also checks `/version.json` when the app starts or returns to the foreground and navigates to load a changed deployed version.

### Authentication and forum requests

`auth.login` redirects to the configured issuer's `/authorize` endpoint using `response_type=token`. `auth.callback` reads the URL fragment and authenticates through `OAuth2Authenticator`, which extends Ember Simple Auth's implicit-grant authenticator. `CustomSession` loads forum session data; the parent `authenticated` route guards protected routes. The older `login` route redirects to `auth.login` for compatibility.

`authConfig.redirectUri` is the browser origin plus `/auth/callback`. Issuer/client settings and allowed redirects belong to the separate auth service as well as client configuration; changes must keep those contracts aligned.

Ordinary forum requests flow from routes, controllers, components, or model wrappers through endpoint methods exposed on `ApiService`. That service adds bearer credentials, serializes query parameters, applies timeout behavior, maps failures to notifications, and invalidates the session on HTTP 401. Endpoint return types describe expected JSON; the transport currently returns `any` and does not perform comprehensive runtime schema validation.

### Content rendering

`ContentParserService` transforms forum content using tag-specific parsers. Post parsing escapes raw angle brackets before processing BBCode, links, media, quotes, and other supported markup. Private messages have a separate HTML transformation path.

The rendering boundary remains distinct from parsing: post and private-message components pass generated HTML through `sanitizeHtml` in `app/utils/sanitize-html.ts` before `htmlSafe`. Preserve both the parser behavior and final sanitizer when adding markup support; parser output alone is not a trusted HTML contract.

### Preferences and encrypted synchronization

`SettingsService`, `LocalStorageService`, and `SocialsService` own preferences and local collections such as saved posts, favorite boards, and blocked users. `AppService` applies synchronized values to those services and refreshes affected UI/device behavior.

`SettingsSyncService` coordinates per-user encrypted payloads, recovery/unlock behavior, field clocks, revision conflicts, and collection merging. It uses Web Crypto for encryption, IndexedDB for key persistence, and localStorage for synchronization metadata/device identity. Its authenticated requests use a separate transport inside the service, not `ApiService.fetch`.

Persisted field names, payload versions, clocks, and remote revisions form compatibility boundaries. Keep validation, merge behavior, and unlock semantics consistent when changing them. The service currently contains several responsibilities in one module; this document describes that implementation rather than claiming an already-separated storage/crypto architecture.

## Boundaries and invariants

- This is a browser SPA with history-based routing, not an application server. Hosting must return the app shell for client routes. There is no server-side database or migration layer in this repository.
- Forum data and identity are external HTTP contracts. Browser models and TypeScript declarations do not establish server-side authorization or validate every incoming payload.
- Ember services hold shared state; routes/controllers coordinate navigation and view actions; components render and handle interaction. These are existing conventions, not mechanically enforced import boundaries.
- API endpoint modules and API model wrappers use the central forum transport. Settings sync, deployment-version checks, and other specialized integrations have their own requests; there is no universal single HTTP gateway.
- Browser storage, encrypted remote configuration, and backend-owned forum data have different owners and lifecycles. A local settings write is not necessarily a server-side forum mutation.
- There is no project-wide runtime schema validator, structural regression baseline, or product rollout-flag system configured. Do not infer those guarantees from a successful type check or build.

## Cross-cutting concerns

### Errors and observability

`MessagesService` provides application logs and notifications; `ExceptionHandler` installs global error handling. `ApiService` translates request failures and reports eligible errors through AppSignal. Reporting depends on configured AppSignal support and the user's error-reporting preference. Follow the existing reporting paths rather than emitting tokens or decrypted synchronization payloads into logs.

### Types and tests

TypeScript inherits strict settings from `@tsconfig/ember`, with local exceptions in `tsconfig.json`. Glint checks templates as well as TypeScript. ESLint applies Ember/QUnit conventions and code formatting; the separate Prettier script covers other file types.

Tests use QUnit and Ember helpers in the browser, with service substitutions and fixtures under `tests/`. Testem launches the browser after a Vite build. The dated readiness assessment records a coverage-output gap; coverage configuration alone does not prove instrumentation is working. See [AGENTS.md](AGENTS.md) for validation commands and [the assessment](AGENT_READY_ASSESSMENT.md) for the historical evidence.

### Deployment

GitHub Actions calls shared lint/test workflows. Staging and production releases depend on those checks. Static delivery uses Bunny Storage/Pull Zones with generated browser configuration; hashed assets are retained and entry/configuration files are uploaded last before cache purging. The nginx container is used by the Kubernetes preview path and remains an alternative deployment artifact.

Same-repository PR previews publish generated manifests to the separate infrastructure repository for Flux reconciliation; previews use distinct hostnames but shared staging API/auth services. Preview deployment and test verification are separate workflows. Deployment settings, required variables, and secrets are documented in [README.md](README.md#deploying).
