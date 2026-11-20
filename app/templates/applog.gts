import type { TemplateOnlyComponent } from '@ember/component/template-only';
import { pageTitle } from 'ember-page-title';
import Container from 'potber-client/components/common/container';
import NavGeneric from 'potber-client/components/nav/routes/generic';
import MessageItem from 'potber-client/components/routes/applog/message-item';
import type ApplogRoute from 'potber-client/routes/applog';

interface Signature {
  Args: {
    model: ReturnType<ApplogRoute['model']>;
    controller: unknown;
  };
}

export default <template>
  {{pageTitle 'Applog'}}

  <NavGeneric @title='Applog' @enableBackNavigation={{true}} />

  <Container @size='medium'>
    {{#each @model as |message|}}
      <MessageItem @message={{message}} />
    {{/each}}
  </Container>
</template> satisfies TemplateOnlyComponent<Signature>;
