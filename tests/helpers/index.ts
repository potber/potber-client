import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import {
  setupApplicationTest as upstreamSetupApplicationTest,
  setupRenderingTest as upstreamSetupRenderingTest,
  setupTest as upstreamSetupTest,
} from 'ember-qunit';
import type { SetupTestOptions } from 'ember-qunit';
import type Owner from '@ember/owner';
import type IntlService from 'ember-intl/services/intl';
import { authenticateSession } from 'ember-simple-auth/test-support';
import ModalService from 'potber-client/services/modal';
import translationsForDeDe from 'virtual:ember-intl/translations/de-de';

// This file exists to provide wrappers around ember-qunit's / ember-mocha's
// test setup functions. This way, you can easily extend the setup that is
// needed per test type.

interface ApplicationTestOptions extends SetupTestOptions {
  authenticate?: boolean;
}

function registerTranslations(context: { owner: Owner }): void {
  const intl = context.owner.lookup('service:intl') as IntlService;
  intl.addTranslations('de-de', translationsForDeDe);
  intl.setLocale(['de-de']);
}

function setupApplicationTest(
  hooks: NestedHooks,
  options?: ApplicationTestOptions,
) {
  upstreamSetupApplicationTest(hooks, options);

  hooks.beforeEach(async function () {
    registerTranslations(this);

    if (options?.authenticate) {
      await authenticateSession();
    }
  });
  //
  // This is also a good place to call test setup functions coming
  // from other addons:
  //
  // setupIntl(hooks); // ember-intl
  // setupMirage(hooks); // ember-cli-mirage
}

interface RenderingTestOptions extends SetupTestOptions {
  includeModals?: boolean;
}

function setupRenderingTest(
  hooks: NestedHooks,
  options?: RenderingTestOptions,
) {
  upstreamSetupRenderingTest(hooks, options);

  hooks.beforeEach(async function () {
    registerTranslations(this);

    if (options?.includeModals) {
      await render(hbs`<Modal />`);
      this.owner.register('service:modal', ModalService);
    }
  });
}

function setupTest(hooks: NestedHooks, options?: SetupTestOptions) {
  upstreamSetupTest(hooks, options);

  hooks.beforeEach(function () {
    registerTranslations(this);
  });
}

export { setupApplicationTest, setupRenderingTest, setupTest };
