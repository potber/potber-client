import type { TemplateOnlyComponent } from '@ember/component/template-only';
import Container from 'potber-client/components/common/container';
import Quickstart from 'potber-client/components/features/quickstart';
import NavGeneric from 'potber-client/components/nav/routes/generic';
import type HomeRoute from 'potber-client/routes/authenticated/home';

interface Signature {
  Args: {
    model: Awaited<ReturnType<HomeRoute['model']>>;
    controller: unknown;
  };
}

export default <template>
  <NavGeneric @title='Home' />

  <Container @size='medium' class='home'>
    <h2 class='no-margin'>Hallo,
      {{@model.session.username}}!</h2>
    <Quickstart />
  </Container>
</template> satisfies TemplateOnlyComponent<Signature>;
