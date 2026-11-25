'use strict';

if (typeof module !== 'undefined') {
  const browser = process.env.TESTEM_BROWSER ?? 'chromium';
  const needsNoSandbox =
    process.env.CI === 'true' ||
    (typeof process.getuid === 'function' && process.getuid() === 0);

  module.exports = {
    test_page: 'tests/index.html?hidepassed',
    disable_watching: true,
    launch_in_ci: [browser],
    launch_in_dev: [browser],
    browser_start_timeout: 120,
    browser_args: {
      [browser]: {
        ci: [
          // Chromium needs --no-sandbox in CI and in our root-run devcontainer.
          needsNoSandbox ? '--no-sandbox' : null,
          '--headless',
          '--disable-dev-shm-usage',
          '--disable-software-rasterizer',
          '--mute-audio',
          '--remote-debugging-port=0',
          '--window-size=1440,900',
          // On GitHub runners, about 6% of cold launches lose the first page load
          // when the separate network-service process crashes. Testem then times
          // out. Running the service in the browser process avoids that crash.
          '--enable-features=NetworkServiceInProcess2',
        ].filter(Boolean),
      },
    },
  };
}
