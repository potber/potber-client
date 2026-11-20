import type { TemplateOnlyComponent } from '@ember/component/template-only';
import { pageTitle } from 'ember-page-title';
import t from 'ember-intl/helpers/t';
import PrivateMessageList from 'potber-client/components/features/private-messages/list';
import NavPrivateMessageList from 'potber-client/components/nav/routes/private-messages/list';
import type PrivateMessagesSystemRoute from 'potber-client/routes/authenticated/private-messages/system';

interface Signature {
  Args: {
    model: Awaited<ReturnType<PrivateMessagesSystemRoute['model']>>;
    controller: unknown;
  };
}

export default <template>
  {{pageTitle (t 'route.private-messages.system.title')}}

  <NavPrivateMessageList @folder='System' />

  <PrivateMessageList @messages={{@model}} />
</template> satisfies TemplateOnlyComponent<Signature>;
