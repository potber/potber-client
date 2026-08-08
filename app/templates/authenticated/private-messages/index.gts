import type { TemplateOnlyComponent } from '@ember/component/template-only';
import { pageTitle } from 'ember-page-title';
import t from 'ember-intl/helpers/t';

export default <template>
  {{pageTitle (t 'route.private-messages.title')}}
</template> satisfies TemplateOnlyComponent<{
  Args: { model: unknown; controller: unknown };
}>;
