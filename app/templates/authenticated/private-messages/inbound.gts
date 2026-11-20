import type { TemplateOnlyComponent } from '@ember/component/template-only';
import { pageTitle } from 'ember-page-title';
import t from 'ember-intl/helpers/t';
import PrivateMessageList from 'potber-client/components/features/private-messages/list';
import NavPrivateMessageList from 'potber-client/components/nav/routes/private-messages/list';
import type PrivateMessagesInboundRoute from 'potber-client/routes/authenticated/private-messages/inbound';

interface Signature {
  Args: {
    model: Awaited<ReturnType<PrivateMessagesInboundRoute['model']>>;
    controller: unknown;
  };
}

export default <template>
  {{pageTitle (t 'route.private-messages.inbound.title')}}

  <NavPrivateMessageList @folder='Eingang' />

  <PrivateMessageList @messages={{@model}} />
</template> satisfies TemplateOnlyComponent<Signature>;
