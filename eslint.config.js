'use strict';

const js = require('@eslint/js');
const globals = require('globals');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const emberPlugin = require('eslint-plugin-ember');
const emberParser = require('ember-eslint-parser');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');
const nodePlugin = require('eslint-plugin-n').default;
const qunitPlugin = require('eslint-plugin-qunit');

const sourceFiles = [
  'app/**/*.{js,ts,gjs,gts}',
  'public/**/*.js',
  'tests/**/*.{js,ts,gjs,gts}',
  'types/**/*.{ts,gts}',
];
const tsFiles = ['**/*.ts'];
const gjsFiles = ['**/*.gjs'];
const gtsFiles = ['**/*.gts'];
const testFiles = ['tests/**/*-test.{js,ts,gjs,gts}'];
const nodeScriptFiles = [
  '.prettierrc.js',
  '.template-lintrc.js',
  'ember-cli-build.js',
  'eslint.config.js',
  'postcss.config.js',
  'testem.js',
  'blueprints/*/index.js',
  'config/**/*.js',
  'lib/*/index.js',
  'server/**/*.js',
];
const nodeModuleFiles = ['*.mjs'];

const tsRecommended = tsPlugin.configs['flat/recommended'];
const tsCompatibilityRules = tsRecommended[1].rules;
const tsRecommendedRules = tsRecommended[2].rules;

const prettierRules = {
  ...prettierConfig.rules,
  'prettier/prettier': 'error',
  'arrow-body-style': 'off',
  'prefer-arrow-callback': 'off',
};

const nodeScriptConfig = nodePlugin.configs['flat/recommended-script'];
const nodeModuleConfig = nodePlugin.configs['flat/recommended-module'];

module.exports = [
  {
    name: 'potber/ignores',
    ignores: [
      'blueprints/*/files/**',
      'vendor/**',
      'dist/**',
      'tmp/**',
      'bower_components/**',
      'node_modules/**',
      'coverage/**',
      '.eslintcache',
      '.node_modules.ember-try/**',
      'bower.json.ember-try',
      'npm-shrinkwrap.json.ember-try',
      'package.json.ember-try',
      'package-lock.json.ember-try',
      'yarn.lock.ember-try',
    ],
  },
  js.configs.recommended,
  {
    name: 'potber/source',
    files: sourceFiles,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          legacyDecorators: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    plugins: {
      ember: emberPlugin,
    },
    rules: {
      ...emberPlugin.configs.recommended.rules,
      'ember/no-runloop': 'off',
    },
  },
  {
    name: 'potber/typescript',
    files: tsFiles,
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          legacyDecorators: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsCompatibilityRules,
      ...tsRecommendedRules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'none' }],
      'ember/no-at-ember-render-modifiers': 'off',
    },
  },
  {
    name: 'potber/gjs',
    files: gjsFiles,
    languageOptions: {
      parser: emberParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          legacyDecorators: true,
        },
      },
    },
    plugins: {
      ember: emberPlugin,
    },
    processor: 'ember/noop',
    rules: {
      ...emberPlugin.configs['recommended-gjs'].rules,
      'ember/no-at-ember-render-modifiers': 'off',
    },
  },
  {
    name: 'potber/gts',
    files: gtsFiles,
    languageOptions: {
      parser: emberParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          legacyDecorators: true,
        },
      },
    },
    plugins: {
      ember: emberPlugin,
      '@typescript-eslint': tsPlugin,
    },
    processor: 'ember/noop',
    rules: {
      ...emberPlugin.configs['recommended-gts'].rules,
      ...tsCompatibilityRules,
      ...tsRecommendedRules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'none' }],
      'ember/no-at-ember-render-modifiers': 'off',
    },
  },
  {
    name: 'potber/node-scripts',
    ...nodeScriptConfig,
    files: nodeScriptFiles,
    rules: {
      ...nodeScriptConfig.rules,
      'n/no-missing-require': 'off',
      'n/no-unpublished-require': 'off',
    },
  },
  {
    name: 'potber/node-modules',
    ...nodeModuleConfig,
    files: nodeModuleFiles,
  },
  {
    name: 'potber/tests',
    files: testFiles,
    plugins: {
      qunit: qunitPlugin,
    },
    rules: {
      ...qunitPlugin.configs.recommended.rules,
      'qunit/require-expect': 'off',
    },
  },
  {
    name: 'potber/prettier',
    files: ['**/*.{js,mjs,ts,gjs,gts}'],
    plugins: {
      prettier: prettierPlugin,
    },
    rules: prettierRules,
  },
];
