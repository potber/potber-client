import { installErrorHandler } from '@appsignal/ember';
import Appsignal from '@appsignal/javascript';
import Ember from 'ember';
import { appConfig } from 'potber-client/config/app.config';

export const appsignal = new Appsignal({
  key: appConfig.appsignal.frontendKey,
  namespace: 'frontend',
  revision: appConfig.appsignal.revision,
});

let emberErrorHandlerInstalled = false;

appsignal.addDecorator((span) => {
  span.setTags({
    app: appConfig.name,
    environment: appConfig.hostname,
    revision: appConfig.appsignal.revision,
    version: appConfig.version,
  });

  return span;
});

appsignal.demo();

export const appsignalEnabled = appConfig.appsignal.enabled;

export function enableAppsignal() {
  if (!appsignalEnabled || emberErrorHandlerInstalled) {
    return;
  }

  installErrorHandler(appsignal, Ember);
  emberErrorHandlerInstalled = true;
}
