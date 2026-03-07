import { defineConfig } from 'vite';
import { extensions, classicEmberSupport, ember } from '@embroider/vite';
import { loadTranslations } from '@ember-intl/vite';
import { babel } from '@rollup/plugin-babel';
import autoprefixer from 'autoprefixer';

function manualChunks(id) {
  if (!id.includes('node_modules')) {
    return;
  }

  if (id.includes('/node_modules/katex/')) {
    return 'vendor-katex';
  }

  if (id.includes('/node_modules/semver/')) {
    return 'vendor-semver';
  }

  if (
    id.includes('/node_modules/ember-intl/') ||
    id.includes('/node_modules/@formatjs/')
  ) {
    return 'vendor-intl';
  }

  if (id.includes('/node_modules/ember-simple-auth/')) {
    return 'vendor-auth';
  }

  if (id.includes('/node_modules/@fortawesome/')) {
    return 'vendor-fontawesome';
  }

  if (
    id.includes('/node_modules/ember-source/') ||
    id.includes('/node_modules/ember-resolver/') ||
    id.includes('/node_modules/ember-load-initializers/') ||
    id.includes('/node_modules/@embroider/') ||
    id.includes('/node_modules/@ember/') ||
    id.includes('/node_modules/@glimmer/') ||
    id.includes('/node_modules/tracked-built-ins/') ||
    id.includes('/node_modules/decorator-transforms/') ||
    id.includes('/node_modules/reactiveweb/') ||
    id.includes('/node_modules/ember-resources/') ||
    id.includes('/node_modules/ember-stargate/') ||
    id.includes('/node_modules/ember-page-title/')
  ) {
    return 'vendor-ember';
  }

  return;
}

export default defineConfig(({ mode }) => ({
  build: {
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
