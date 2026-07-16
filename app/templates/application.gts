import type { TemplateOnlyComponent } from '@ember/component/template-only';
import { pageTitle } from 'ember-page-title';
import t from 'ember-intl/helpers/t';
import LoadingIndicator from 'potber-client/components/misc/loading-indicator';
import StartupFailure from 'potber-client/components/misc/error/startup-failure';
import Modal from 'potber-client/components/modal';
import Nav from 'potber-client/components/nav';
import NotificationContainer from 'potber-client/components/notification-container';
import Sidebar from 'potber-client/components/sidebar';
import type ApplicationController from 'potber-client/controllers/application';
import type ApplicationRoute from 'potber-client/routes/application';

interface Signature {
  Args: {
    model: Awaited<ReturnType<ApplicationRoute['model']>>;
    controller: ApplicationController;
  };
}

export default <template>
  {{pageTitle (t 'app.name')}}

  {{#if @model.failure}}
    <StartupFailure @error={{@model.error}} />
  {{else}}
    <div id='page-content'>
      {{outlet}}
    </div>

    <LoadingIndicator />
    <Modal />

    <NotificationContainer @position='bottom' @zindex='99' />

    <Nav />

    {{#if @controller.authenticated}}
      <Sidebar />
    {{/if}}
  {{/if}}
</template> satisfies TemplateOnlyComponent<Signature>;
