import Service, { service } from '@ember/service';
import { appsignal, appsignalEnabled } from 'potber-client/appsignal';
import MessagesService from './messages';
import { Exception } from 'potber-client/exceptions';
import SettingsService from './settings';

export default class ExceptionHandler extends Service {
  @service declare messages: MessagesService;
  @service declare settings: SettingsService;

  initialize() {
    window.onerror = this.handleError;
  }

  handleError = (
    _event: string | Event,
    _source?: string,
    _lineno?: number,
    _colno?: number,
    error?: Error,
  ) => {
    const shouldReport =
      error instanceof Error &&
      (!error.name.endsWith('Exception') ||
        (error as Exception).catchMe !== true);

    if (
      appsignalEnabled &&
      shouldReport &&
      this.settings.getSetting('appsignalErrorReporting')
    ) {
      appsignal.sendError(error, (span) => {
        span.setAction('window.onerror');
        if (_source) {
          span.setTags({
            source: _source,
          });
        }
      });
    }

    if (error?.name.endsWith('Exception')) {
      const exception = error as Exception;
      if (!exception.catchMe) return;
      this.messages.log(exception.message, { type: 'error', context: _source });
    }
  };
}
