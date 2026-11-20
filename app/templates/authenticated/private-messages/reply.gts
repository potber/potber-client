import type { TemplateOnlyComponent } from '@ember/component/template-only';
import { pageTitle } from 'ember-page-title';
import t from 'ember-intl/helpers/t';
import PrivateMessageForm from 'potber-client/components/features/private-messages/form';
import NavPrivateMessageForm from 'potber-client/components/nav/routes/private-messages/form';
import type PrivateMessagesReplyRoute from 'potber-client/routes/authenticated/private-messages/reply';

interface Signature {
  Args: {
    model: Awaited<ReturnType<PrivateMessagesReplyRoute['model']>>;
    controller: unknown;
  };
}

export default <template>
  {{pageTitle (t 'route.private-messages.reply.title')}}

  <NavPrivateMessageForm
    @message={{@model.message}}
    @title={{t 'route.private-messages.reply.title'}}
  />

  <PrivateMessageForm @message={{@model.message}} />
</template> satisfies TemplateOnlyComponent<Signature>;
