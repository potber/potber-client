import { defineConfig } from 'vite';
import { extensions, classicEmberSupport, ember } from '@embroider/vite';
import { loadTranslations } from '@ember-intl/vite';
import { babel } from '@rollup/plugin-babel';
import autoprefixer from 'autoprefixer';

const chunkGroups = [
  {
    name: 'vendor-katex',
    packages: ['/node_modules/katex/'],
  },
  {
    name: 'vendor-semver',
    packages: ['/node_modules/semver/'],
  },
  {
    name: 'vendor-intl',
    packages: [
      '/node_modules/ember-intl/',
      '/node_modules/@ember-intl/',
      '/node_modules/@formatjs/',
    ],
  },
  {
    name: 'vendor-auth',
    packages: ['/node_modules/ember-simple-auth/'],
  },
  {
    name: 'vendor-fontawesome',
    packages: ['/node_modules/@fortawesome/'],
  },
  {
    name: 'vendor-ember',
    packages: [
      '/node_modules/ember-source/',
      '/node_modules/ember-resolver/',
      '/node_modules/ember-load-initializers/',
      '/node_modules/@embroider/',
      '/node_modules/@ember/string/',
      '/node_modules/@glimmer/component/',
      '/node_modules/@glimmer/tracking/',
      '/node_modules/ember-modifier/',
      '/node_modules/@ember/render-modifiers/',
    ],
  },
  {
    name: 'vendor-reactivity',
    packages: [
      '/node_modules/tracked-built-ins/',
      '/node_modules/decorator-transforms/',
      '/node_modules/reactiveweb/',
      '/node_modules/ember-resources/',
    ],
  },
  {
    name: 'vendor-ember-ui',
    packages: [
      '/node_modules/ember-stargate/',
      '/node_modules/ember-page-title/',
    ],
  },
];

function manualChunks(id) {
  if (!id.includes('node_modules')) {
    return;
  }

  for (const chunkGroup of chunkGroups) {
    if (chunkGroup.packages.some((packagePath) => id.includes(packagePath))) {
      return chunkGroup.name;
    }
  }

  return;
}

export default defineConfig(({ mode }) => ({
  build: {
    chunkSizeWarningLimit: mode === 'production' ? 500 : 1700,
    sourcemap: mode !== 'production',
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  css: {
    modules: {
      generateScopedName: '[local]__[hash:base64:5]',
    },
    postcss: {
      plugins: [autoprefixer()],
    },
  },
  plugins: [
    classicEmberSupport(),
    ember(),
    loadTranslations(),
    babel({
      babelHelpers: 'runtime',
      extensions,
    }),
  ],
}));
