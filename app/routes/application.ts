import Route from '@ember/routing/route';
import { service } from '@ember/service';
import SettingsService from 'potber-client/services/settings';
import {
  appsignal,
  appsignalEnabled,
  enableAppsignal,
} from 'potber-client/appsignal';
import AppService from 'potber-client/services/app';
import RendererService from 'potber-client/services/renderer';
import type { IntlService } from 'ember-intl';
import translationsForDeDe from 'virtual:ember-intl/translations/de-de';

export default class ApplicationRoute extends Route {
  @service declare app: AppService;
  @service declare renderer: RendererService;
  @service declare intl: IntlService;
  @service declare settings: SettingsService;

  beforeModel() {
    this.intl.addTranslations('de-de', translationsForDeDe);
    this.intl.setLocale(['de-de']);

    if (this.settings.getSetting('appsignalErrorReporting')) {
      enableAppsignal();
    }
  }

  async model() {
    try {
      await this.app.initialize();
      return {
        failure: false,
        failureReason: null,
      };
    } catch (error) {
      if (
        appsignalEnabled &&
        this.settings.getSetting('appsignalErrorReporting') &&
        (error instanceof Error || error instanceof ErrorEvent)
      ) {
        appsignal.sendError(error, (span) => {
          span.setAction('application.initialize');
        });
      }

      return {
        failure: true,
        error,
      };
    }
  }
}
