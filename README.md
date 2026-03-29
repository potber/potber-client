<p align="center">
<img src="./.logo/440x196_round.png" alt="potber logo" height="200" />
</p>
<p align="center">
A mobile-first web client for the german internet forum <a href="https://forum.mods.de" target="_blank">forum.mods.de</a> built with <a href="https://emberjs.com/" target="_blank">ember.js</a>. If you're looking for potber-api, you can find it <a href="https://github.com/spuxx-dev/potber-api" target="_blank">here</a>.
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
- [Node.js 20](https://nodejs.org/) (with npm)
- [Ember CLI](https://cli.emberjs.com/release/)
- [potber-api](https://github.com/spuxx-dev/potber-api) - Without this web server, potber-client does not function.

### Installation

- `git clone https://github.com/potber/potber-client.git`
- `cd potber-client`
- `npm install`

### Running / Development

You can either run the application via a [Dev Container](https://code.visualstudio.com/docs/devcontainers/containers) or without. The advantage of using the dev container is that you do not need to setup or clone the `potber-auth` and `potber-api` repository. Similar as running the application via `npm run start:remote` except that `potber-auth` and `potber-api` are running locally via Docker.

#### Dev Container

You need to have Docker installed on your system and have the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) set up in VSCode. Open this repository in VSCode and click on `Reopen in container`. The dev container starts the client alongside containerized `potber-api` and `potber-auth` services. After finishing the setup, you can start the development server with `npm start` inside of the VSCode terminal. Visit the app at [http://localhost:4200](http://localhost:4200).

#### Without Dev Container

- Clone [potber-api](https://github.com/spuxx-dev/potber-api) and start up a local instance.
- Start up the development server with `npm start` (assuming you also have cloned `potber-api` and `potber-auth`). You can also run the client using the remote staging instances of `potber-api` and `potber-auth` via `npm run start:remote`.
- Visit the app at [http://localhost:4200](http://localhost:4200).

#### Linting

- `npm run lint`
- `npm run lint:fix`

#### Testing

- `npm run test`
- `npm run test:coverage`

#### Building

- `ember build` (development)
- `ember build --environment staging` (staging)
- `ember build --environment production` (production)

#### Deploying

The application can be deployed via [Docker](https://docker.com) using the repository's single [Dockerfile](Dockerfile).

- Build the image with `docker build -t potber-client .`
- Run it locally with `docker run --rm -p 8080:8080 potber-client`

#### PR Previews On Kubernetes

The repository also includes a pull request preview workflow for the Potber Kubernetes cluster. Each same-repository PR can be deployed to its own preview hostname like `https://pr-123.preview.potber.de`.

Required repository secrets:

- `INFRA_REPO_TOKEN`
  A token with write access to `potber/infrastructure` so the workflow can publish generated preview manifests.

Required repository variables:

- `PREVIEW_AUTH_CLIENT_ID`
  The dedicated preview OAuth client id from `potber-auth`

The workflow builds and pushes a PR-specific image to GHCR, writes a generated manifest into the infrastructure repository, and lets Flux deploy the preview into Kubernetes. On PR close it removes that generated manifest again so Flux prunes the preview resources.

Preview deployments are intentionally limited to pull requests from the same repository so the infrastructure repository token is never exposed to forked pull requests.

The cluster-side preview setup lives in the infrastructure repository under [`kubernetes/previews`](https://github.com/potber/infrastructure/tree/main/kubernetes/previews).

## Further Reading / Useful Links

- [ember.js](https://emberjs.com/) - The framework.
- [potber-api](https://github.com/spuxx-dev/potber-api) - The web server that potber-client utilizes.
- [GitHub Container Registry](https://github.com/potber/potber-client/pkgs/container/potber-client) - The published container image.

## Credit

- Credit goes to [fiskensen](https://instagram.com/fiskensen) for the [very cool whale animation](.logo/whale_animated_560x400.gif) that is used as a loading indicator and in the logo. Thank you!
