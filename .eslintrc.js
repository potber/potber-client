'use strict';

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    ecmaFeatures: {
      legacyDecorators: true,
    },
  },
  plugins: ['ember', '@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:ember/recommended',
    'plugin:prettier/recommended',
  ],
  env: {
    browser: true,
  },
  rules: {
    'ember/no-runloop': 'off',
  },
  overrides: [
    // ts files
    {
      files: ['**/*.ts'],
      extends: [
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { caughtErrors: 'none' },
        ],
        'ember/no-at-ember-render-modifiers': 'off',
        'ember/no-runloop': 'off',
        'no-undef': 'off',
      },
    },
    {
      files: ['**/*.gts'],
      parser: 'ember-eslint-parser',
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:ember/recommended',
        'plugin:ember/recommended-gts',
        'plugin:prettier/recommended',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { caughtErrors: 'none' },
        ],
        'ember/no-at-ember-render-modifiers': 'off',
        'ember/no-runloop': 'off',
        'no-undef': 'off',
      },
    },
    {
      files: ['**/*.gjs'],
      parser: 'ember-eslint-parser',
      extends: [
        'eslint:recommended',
        'plugin:ember/recommended',
        'plugin:ember/recommended-gjs',
        'plugin:prettier/recommended',
      ],
      rules: {
        'ember/no-at-ember-render-modifiers': 'off',
        'ember/no-runloop': 'off',
      },
    },
    // node files
    {
      files: [
        './.eslintrc.js',
        './.prettierrc.js',
        './.template-lintrc.js',
        './ember-cli-build.js',
        './testem.js',
        './blueprints/*/index.js',
        './config/**/*.js',
        './lib/*/index.js',
        './server/**/*.js',
        './postcss.config.js',
      ],
      parserOptions: {
        sourceType: 'script',
      },
      env: {
        browser: false,
        node: true,
      },
      plugins: ['node'],
      extends: ['plugin:node/recommended'],
      rules: {
        // this can be removed once the following is fixed
        // https://github.com/mysticatea/eslint-plugin-node/issues/77
        'node/no-missing-require': 'off',
        'node/no-unpublished-require': 'off',
      },
    },
    {
      // test files
      files: ['tests/**/*-test.{js,ts}'],
      extends: ['plugin:qunit/recommended'],
      rules: {
        'qunit/require-expect': 'off',
      },
    },
  ],
};
