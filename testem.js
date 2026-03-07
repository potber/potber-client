'use strict';

if (typeof module !== 'undefined') {
  const browser = process.env.TESTEM_BROWSER ?? 'chromium';
  const needsNoSandbox =
    typeof process.getuid === 'function' && process.getuid() === 0;

  module.exports = {
    test_page: 'tests/index.html?hidepassed',
    disable_watching: true,
    launch_in_ci: [browser],
    launch_in_dev: [browser],
    browser_start_timeout: 120,
    browser_args: {
      [browser]: {
        ci: [
          // --no-sandbox is needed when running Chrome inside a container
          needsNoSandbox ? '--no-sandbox' : null,
          '--headless',
          '--disable-dev-shm-usage',
          '--disable-software-rasterizer',
          '--mute-audio',
          '--remote-debugging-port=0',
          '--window-size=1440,900',
        ].filter(Boolean),
      },
    },
  };
}
