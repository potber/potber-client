import { defineConfig } from 'vite';
import { extensions, classicEmberSupport, ember } from '@embroider/vite';
import { loadTranslations } from '@ember-intl/vite';
import { babel } from '@rollup/plugin-babel';
import autoprefixer from 'autoprefixer';

export default defineConfig(({ mode }) => ({
  build: {
    sourcemap: mode !== 'production',
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
