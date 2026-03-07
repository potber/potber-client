import Application from 'potber-client/app';
import ENV from 'potber-client/config/environment';
import * as QUnit from 'qunit';
import {
  forceModulesToBeLoaded,
  sendCoverage,
} from 'ember-cli-code-coverage/test-support';
import { setApplication } from '@ember/test-helpers';
import { setup } from 'qunit-dom';
import { start as startTests } from 'ember-qunit';

const testWindow = window as Window & {
  __coverage__?: unknown;
  __webpack_require__?: unknown;
  requirejs?: {
    entries?: Record<string, unknown>;
  };
};

function shouldForceModulesToBeLoaded() {
  return (
    typeof testWindow.__webpack_require__ !== 'undefined' ||
    typeof testWindow.requirejs?.entries !== 'undefined'
  );
}

export function start() {
  setApplication(Application.create(ENV.APP as any));

  QUnit.config.maxDepth = 12;
  QUnit.dump.maxDepth = 12;

  setup(QUnit.assert);

  QUnit.done(async function () {
    if (!testWindow.__coverage__) {
      return;
    }

    if (shouldForceModulesToBeLoaded()) {
      forceModulesToBeLoaded();
    }

    await sendCoverage();
  });

  startTests();
}
