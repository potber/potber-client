import { installErrorHandler } from '@appsignal/ember';
import Appsignal from '@appsignal/javascript';
import { getOnerror, setOnerror } from '@ember/-internals/error-handling';
import { RSVP } from '@ember/-internals/runtime';
import { isTesting } from '@ember/debug';
import { appConfig } from 'potber-client/config/app.config';

type EmberErrorHandler = (error: unknown) => void;

const emberErrorHandling = {
  get onerror(): EmberErrorHandler | undefined {
    return getOnerror() as EmberErrorHandler | undefined;
  },
  set onerror(handler: EmberErrorHandler | undefined) {
    setOnerror(handler);
  },
  RSVP,
  get testing() {
    return isTesting();
  },
};

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

  installErrorHandler(appsignal, emberErrorHandling);
  emberErrorHandlerInstalled = true;
}
