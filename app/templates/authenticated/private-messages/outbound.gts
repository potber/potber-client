import type { TemplateOnlyComponent } from '@ember/component/template-only';
import { pageTitle } from 'ember-page-title';
import t from 'ember-intl/helpers/t';
import PrivateMessageList from 'potber-client/components/features/private-messages/list';
import NavPrivateMessageList from 'potber-client/components/nav/routes/private-messages/list';
import type PrivateMessagesOutboundRoute from 'potber-client/routes/authenticated/private-messages/outbound';

interface Signature {
  Args: {
    model: Awaited<ReturnType<PrivateMessagesOutboundRoute['model']>>;
    controller: unknown;
  };
}

export default <template>
  {{pageTitle (t 'route.private-messages.outbound.title')}}

  <NavPrivateMessageList @folder='Ausgang' />

  <PrivateMessageList @messages={{@model}} />
</template> satisfies TemplateOnlyComponent<Signature>;
