import type { TemplateOnlyComponent } from '@ember/component/template-only';
import { pageTitle } from 'ember-page-title';
import PrivateMessageView from 'potber-client/components/features/private-messages/view';
import NavPrivateMessageView from 'potber-client/components/nav/routes/private-messages/view';
import type { PrivateMessagesViewRouteModel } from 'potber-client/routes/authenticated/private-messages/view';

interface Signature {
  Args: {
    model: PrivateMessagesViewRouteModel;
    controller: unknown;
  };
}

export default <template>
  {{pageTitle @model.message.title}}

  <NavPrivateMessageView @message={{@model.message}} />

  <PrivateMessageView @message={{@model.message}} />
</template> satisfies TemplateOnlyComponent<Signature>;
