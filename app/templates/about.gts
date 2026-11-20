import { hash } from '@ember/helper';
import type { TemplateOnlyComponent } from '@ember/component/template-only';
import FaIcon from '@fortawesome/ember-fontawesome/components/fa-icon';
import { pageTitle } from 'ember-page-title';
import Container from 'potber-client/components/common/container';
import ControlLink from 'potber-client/components/common/control/link';
import NavGeneric from 'potber-client/components/nav/routes/generic';
import type AboutController from 'potber-client/controllers/about';

interface Signature {
  Args: {
    model: unknown;
    controller: AboutController;
  };
}

export default <template>
  {{pageTitle 'Über die App'}}

  <NavGeneric @title='Über die App' @enableBackNavigation={{true}} />

  <Container>
    <h3>
      potber | Version
      {{@controller.version}}
    </h3>
    <p>
      entwickelt von
      <a
        href='https://www.spuxx.dev'
        target='_blank'
        rel='noopener noreferrer'
      >Ameisenfutter</a>
      &amp; weitergeführt von
      <a
        href='https://kristofdreier.de'
        target='_blank'
        rel='noopener noreferrer'
      >Zensiert</a>
    </p>

    <a
      class='button-link control-size-large control-variant-primary margin-vertical-x-small'
      href='https://my.mods.de/1268185'
      target='_blank'
      rel='noopener noreferrer'
    >
      <FaIcon @icon='user' />
      <p>Profil</p>
    </a>

    <a
      class='button-link control-size-large control-variant-primary margin-vertical-x-small'
      href='https://github.com/potber/potber-client'
      target='_blank'
      rel='noopener noreferrer'
    >
      <FaIcon @icon='github' @prefix='fab' />
      <p>GitHub</p>
    </a>

    <p class='text-center'><b>Feedback?</b><br />Schau doch mal im Thread
      vorbei. :)</p>

    <ControlLink
      @route='authenticated.thread'
      @query={{hash
        TID='219896'
        page=undefined
        PID=undefined
        lastReadPost=undefined
        scrollToBottom=undefined
      }}
      @size='large'
      @variant='primary'
    >
      <FaIcon @icon='table-list' />
      <p>Thread</p>
    </ControlLink>
  </Container>
</template> satisfies TemplateOnlyComponent<Signature>;
