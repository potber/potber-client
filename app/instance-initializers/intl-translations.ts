import type ApplicationInstance from '@ember/application/instance';
import type IntlService from 'ember-intl/services/intl';
import { load } from 'js-yaml';
import deDeTranslationsRaw from '../../translations/de-de.yaml?raw';

type TranslationJson = {
  [key: string]: string | TranslationJson;
};

const deDeTranslations = load(deDeTranslationsRaw) as TranslationJson;

export function initialize(appInstance: ApplicationInstance): void {
  const intl = appInstance.lookup('service:intl') as IntlService;
  intl.addTranslations('de-de', deDeTranslations);
}

export default {
  initialize,
  name: 'intl-translations',
};
