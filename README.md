<p align="center">
<img src="./.logo/440x196_round.png" alt="potber logo" height="200" />
</p>
<p align="center">
A mobile-first web client for the german internet forum <a href="https://forum.mods.de" target="_blank">forum.mods.de</a> built with <a href="https://emberjs.com/" target="_blank">ember.js</a>. If you're looking for potber-api, you can find it <a href="https://github.com/potber/potber-api" target="_blank">here</a>.
</p>

![Production Builds](https://github.com/potber/potber-client/actions/workflows/production.yml/badge.svg)
![Staging Builds](https://github.com/potber/potber-client/actions/workflows/staging.yml/badge.svg)
![Latest Release](https://img.shields.io/github/v/release/potber/potber-client)
![License](https://img.shields.io/github/license/potber/potber-client)

## Table of contents

- [How to use](#how-to-use)
- [Core features](#core-features)
  - [Browser support](#browser-support)
  - [Standalone mode (PWA)](#standalone-mode-pwa)
  - [BBCode parser](#bbcode-parser)
  - [Gestures](#gestures)
  - [Themes](#themes)
- [How to develop or build the app](#how-to-develop-or-build-the-app)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running / Development](#running--development)
    - [Linting](#linting)
    - [Testing](#testing)
    - [Building](#building)
    - [Deploying](#deploying)
- [Further Reading / Useful Links](#further-reading--useful-links)

## How to use

Visit https://www.potber.de (or https://test.potber.de for the staging environment) to use the app.

## Core features

### Browser support

Potber supports the following browsers. Other browser might work, but are not supported. The app might still behave and display differently on different devices.

- Chrome >= 108
- Chrome for Android >= 108
- Firefox >= 107
- Firefox for Android >= 107
- Safari on iOS >= 16.1

### Standalone mode (PWA)

The app supports standalone mode ([PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)). In standalone mode, the website behaves almost exactly like an app. Whether your browser supports standalone mode and how to enable it highly depends on your browser. Android Chrome offers an option to "Install app" in your website settings, while iOS Safari has an option to "Add website to home screen". If you're having trouble, maybe [this article](https://web.dev/learn/pwa/installation/) can be of help.

### BBCode parser

The application includes a functioning and fully custom BBCode parser written in TypeScript. It is able to parse most of the board's BBCode without errors and is being continuously worked on. You can find it [here](app/services/content-parser.ts).

### Gestures

The app includes basic support for gestures. Gestures support can be enabled in the settings. When doing so, the app will disable some of your browser's native gestures (like pull to refresh). You might still run into issues in case your device adds native gestures on top of that. For example, some Android devices use horizontal swipes for navigating the OS.

The following gestures have been implemented so far:

- Swipe horizontally from the edge of your screen to show the sidebar. Swipe the other direction to close the sidebar.
- Swipe down on any board page to refresh that page. You need to be scrolled all the way to the top of the page first.
- Swipe up on any thread page to refresh that page. You need to be scrolled all the way to the bottom of the page first.

### Themes

You can customize the application's appearance via the available themes. Additionally, feel free to create your own theme and suggest adding it to the app. The individual steps might depend on your browser, but this is roughly how you do it:

1. Open the application on a desktop device. Make sure you have the 'default' theme selected as it'll make the process easier.
2. Right-click anywhere in the application and hit `Inspect` (or `Untersuchen` in German). What you see now is the inspector panel. In the panel, look for the `styles` container. It looks roughly like this:

```css
element {
  ...
}

:root {
  ...
}
...
```

3. Scroll down in that container until you see a section called `html, html *`
4. You can now change any of the default theme's variables.
5. Send me a copy of the entire section and tell me how the theme should be called. 🙂

If you feel skilled enough, you can also create a PR of course. Themes are located [here](app/assets/styles/themes/). All themes will be merged with the default theme, so you only need to provide variables you want to override.

## How to develop or build the app

### Prerequisites

You will need the following things properly installed on your computer.

- [Git](https://git-scm.com/)
- [Node.js 24](https://nodejs.org/) (with npm; see `.nvmrc`)
- [Ember CLI](https://cli.emberjs.com/release/)
- [potber-api](https://github.com/potber/potber-api) - Without this web server, potber-client does not function.

### Installation

- `git clone https://github.com/potber/potber-client.git`
- `cd potber-client`
- `npm install`

### Running / Development

You can either run the application via a [Dev Container](https://code.visualstudio.com/docs/devcontainers/containers) or without. The advantage of using the dev container is that you do not need to setup or clone the `potber-auth` and `potber-api` repository. Similar as running the application via `npm run start:remote` except that `potber-auth` and `potber-api` are running locally via Docker.

#### Dev Container

You need to have Docker installed on your system and have the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) set up in VSCode. Open this repository in VSCode and click on `Reopen in container`. The dev container starts the client alongside containerized `potber-api` and `potber-auth` services. After finishing the setup, you can start the development server with `npm start` inside of the VSCode terminal. Visit the app at [http://localhost:4200](http://localhost:4200).

#### Without Dev Container

- Clone [potber-api](https://github.com/potber/potber-api) and start up a local instance.
- Start up the development server with `npm start` (assuming you also have cloned `potber-api` and `potber-auth`). You can also run the client using the remote staging instances of `potber-api` and `potber-auth` via `npm run start:remote`.
- Visit the app at [http://localhost:4200](http://localhost:4200).

#### Linting

- `npm run lint`
- `npm run lint:fix`
- `npm run quality:check` — check for structural regressions against the merge base. See the [structural checks guide](docs/guides/quality-gates.md).

After `npm ci`, the pre-commit hook formats staged files and runs Glint and the browser suite. Install Chromium or set `TESTEM_BROWSER` to another installed Testem browser before committing.

#### Testing

- `npm run test`
- `npm run test:coverage`

#### Building

- `npx vite build --mode development` (local development configuration)
- `npm run build` (production build; deployment workflows inject environment-specific configuration)

#### Deploying

The app is served as static files from a [Bunny](https://bunny.net) Storage Zone behind a Pull Zone. The [deploy_static](.github/workflows/deploy_static.yml) workflow builds the app, renders `injected-config.js` from the [template](deploy/injected-config.js.template) and uploads `dist/`. Pushes to `main` deploy the `test` GitHub Environment, `v*` tags deploy `production`.

- Uploads never delete files, so a browser holding an old `index.html` still finds its hashed assets. Clean up old files in `assets/` now and then.
- `injected-config.js`, `index.html` and `version.json` are uploaded last, then the Pull Zone cache is purged.
- The deploy is skipped while `BUNNY_STORAGE_ZONE` is unset in the environment.

Bunny setup per environment:

1. Create a Storage Zone and a Pull Zone with the Storage Zone as origin, and add the custom hostname to the Pull Zone.
2. For client-side routes, set the Storage Zone's 404 file path to `/index.html` and enable rewriting 404 to 200.
3. Add Edge Rules to the Pull Zone that set `Cache-Control: public, max-age=31536000, immutable` for URLs matching `*/assets/*` and `Cache-Control: no-cache` for all others.

Settings of the GitHub Environments `test`, `production` and `preview`:

| Kind     | Name                                           | Notes                                                                                |
| -------- | ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| Variable | `BUNNY_STORAGE_ZONE`                           | Storage Zone name                                                                    |
| Variable | `BUNNY_PULL_ZONE_ID`                           | Numeric Pull Zone ID                                                                 |
| Variable | `BUNNY_STORAGE_HOSTNAME`                       | Optional, defaults to `storage.bunnycdn.com` (Falkenstein)                           |
| Variable | `API_URL`, `AUTH_ISSUER_URL`, `AUTH_CLIENT_ID` | Required                                                                             |
| Variable | `IMGPOT_URL`, `MEME_HOST_URL`                  | Optional; empty values fall back to the build-time config in `config/environment.js` |
| Secret   | `BUNNY_STORAGE_PASSWORD`                       | Storage Zone password                                                                |
| Secret   | `BUNNYNET_API_KEY`                             | Account API key for the cache purge; can also be a repository secret                 |

If the `production` environment has deployment branch rules, allow `v*` tags.

To check the deploy scripts locally:

- `API_URL=https://test-api.potber.de deploy/render-injected-config.sh /tmp/injected-config.js`
- `DRY_RUN=1 BUNNY_STORAGE_ZONE=x deploy/upload-to-bunny-storage.sh dist` (prints the upload order)

For release recovery, follow the [client rollback runbook](docs/guides/client-release-rollback.md).

#### PR Previews

Each same-repository PR is deployed to its own hostname like `https://pr-123.preview.potber.de` by the [pull-request-preview](.github/workflows/pull-request-preview.yml) workflow. It runs [deploy_static](.github/workflows/deploy_static.yml) with the GitHub Environment `preview` and uploads the build into the folder `pr-123/` of one shared Storage Zone. When the PR is closed, the folder is deleted. Dependabot and fork PRs get no preview, since they have no access to the secrets.

Bunny setup:

1. A Storage Zone (`potber-preview`) and a Pull Zone with the Storage Zone as origin and the wildcard hostname `*.preview.potber.de`. Enable the hostname under the Pull Zone's Vary Cache settings, otherwise all previews share one cache and serve each other's files.
2. An Edge Script (middleware) linked to the Pull Zone with the content of [deploy/preview-edge-script.ts](deploy/preview-edge-script.ts). It maps the hostname to the PR's folder and answers paths without a file extension with that PR's `index.html`, so the Storage Zone needs no 404 settings.
3. The same Edge Rules for `Cache-Control` as above.

The `preview` environment takes the same settings as `test` and `production`, with `API_URL`, `AUTH_ISSUER_URL` pointing at the test instances and `AUTH_CLIENT_ID` set to the dedicated preview OAuth client from `potber-auth`. Allow all branches in its deployment branch rules.

## Further Reading / Useful Links

- [Agent instructions](AGENTS.md) - Project conventions and verification commands.
- [Architecture](ARCHITECTURE.md) - Module map, data flow, and system boundaries.
- [ember.js](https://emberjs.com/) - The framework.
- [potber-api](https://github.com/potber/potber-api) - The web server that potber-client utilizes.

## Credit

- Credit goes to [fiskensen](https://instagram.com/fiskensen) for the [very cool whale animation](.logo/whale_animated_560x400.gif) that is used as a loading indicator and in the logo. Thank you!
