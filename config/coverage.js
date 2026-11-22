const path = require('node:path');

module.exports = {
  reporters: ['lcov', 'html', 'text'],
  excludes: [
    '**/node_modules/**',
    'tests/**',
    'types/**',
    'config/**',
    '*.mjs',
  ],
  // Vite instruments source files in place, not an Ember namespace directory.
  modifyAssetLocation(root, relativePath) {
    if (relativePath.startsWith(`app${path.sep}`)) {
      return path.join(root, relativePath);
    }
  },
};
