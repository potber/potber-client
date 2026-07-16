import type { TemplateOnlyComponent } from '@ember/component/template-only';
import { pageTitle } from 'ember-page-title';
import Container from 'potber-client/components/common/container';
import NavGeneric from 'potber-client/components/nav/routes/generic';
import ChangelogItem from 'potber-client/components/routes/changelog/changelog-item';
import type ChangelogRoute from 'potber-client/routes/changelog';

interface Signature {
  Args: {
    model: ReturnType<ChangelogRoute['model']>;
    controller: unknown;
  };
}

export default <template>
  {{pageTitle 'Changelog'}}

  <NavGeneric @title='Changelog' @enableBackNavigation={{true}} />

  <Container @size='huge' class='changelog'>
    {{#each @model as |changelogItem|}}
      <ChangelogItem @item={{changelogItem}} />
    {{/each}}
  </Container>
</template> satisfies TemplateOnlyComponent<Signature>;
