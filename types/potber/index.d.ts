// import Ember from 'ember';
import 'ember-source/types';
import 'ember-source/types/preview';

declare global {
  // // Prevents ESLint from "fixing" this via its auto-fix to turn it into a type
  // // alias (e.g. after running any Ember CLI generator)
  // // eslint-disable-next-line @typescript-eslint/no-empty-interface
  // interface Array<T> extends Ember.ArrayPrototypeExtensions<T> {}
  // // interface Function extends Ember.FunctionPrototypeExtensions {}

  type ControlSize =
    'square' | 'small' | 'medium' | 'large' | 'x-large' | 'auto' | 'max';
  type ControlVariant =
    | 'primary'
    | 'primary-transparent'
    | 'secondary'
    | 'secondary-transparent'
    | 'error';
  type ModalVariant = 'default' | 'success' | 'warning' | 'error';

  interface ContentParserMock {
    input: string;
    expected: string;
  }

  type IconSize = 'auto' | 'large' | 'medium';

  interface AppEnvironmentOptions {
    HOSTNAME: string;
    API_URL: string;
    IMGPOT_URL?: string;
    AUTH_ISSUER_URL: string;
    AUTH_CLIENT_ID?: string;
    MEME_HOST_URL: string;
    DEBUG?: boolean;
    version?: string;
    /** Ember application options that `config/environment.js` sets for tests. */
    rootElement?: string;
    autoboot?: boolean;
    LOG_ACTIVE_GENERATION?: boolean;
    LOG_VIEW_LOOKUPS?: boolean;
  }
  interface Window {
    APP?: AppEnvironmentOptions;
  }
}

export {};
