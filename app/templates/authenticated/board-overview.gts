import type { TemplateOnlyComponent } from '@ember/component/template-only';
import { pageTitle } from 'ember-page-title';
import NavBoardOverview from 'potber-client/components/nav/routes/board-overview';
import BoardOverviewCategory from 'potber-client/components/routes/board-overview/category';
import type BoardOverviewRoute from 'potber-client/routes/authenticated/board-overview';

interface Signature {
  Args: {
    model: Awaited<ReturnType<BoardOverviewRoute['model']>>;
    controller: unknown;
  };
}

export default <template>
  {{pageTitle 'Forenübersicht'}}

  <NavBoardOverview />

  {{#each @model as |category|}}
    <BoardOverviewCategory @category={{category}} />
  {{/each}}
</template> satisfies TemplateOnlyComponent<Signature>;
