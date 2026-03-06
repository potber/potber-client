'use strict';
const EmberApp = require('ember-cli/lib/broccoli/ember-app');

const { compatBuild } = require('@embroider/compat');
const { buildOnce } = require('@embroider/vite');

module.exports = function (defaults) {
  const app = new EmberApp(defaults, {
    babel: {
      sourceMaps: 'inline',
      plugins: [
        ...require('ember-cli-code-coverage').buildBabelPlugin({
          embroider: true,
        }),
        '@babel/plugin-proposal-export-namespace-from',
      ],
    },
    'ember-cli-babel': { enableTypeScriptTransform: true },
  });

  return compatBuild(app, buildOnce);
};
