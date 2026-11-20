import type { TemplateOnlyComponent } from '@ember/component/template-only';
import { pageTitle } from 'ember-page-title';
import NotFound from 'potber-client/components/misc/error/not-found';
import NavBoard from 'potber-client/components/nav/routes/board';
import BoardPage from 'potber-client/components/routes/board/page';
import type BoardController from 'potber-client/controllers/authenticated/board';
import type { BoardRouteModel } from 'potber-client/routes/authenticated/board';

interface Signature {
  Args: {
    model: BoardRouteModel | null;
    controller: BoardController;
  };
}

export default <template>
  {{#if @model}}
    {{pageTitle @controller.pageTitle}}
    <NavBoard @board={{@model.board}} />
    <BoardPage @board={{@model.board}} />
  {{else}}
    {{pageTitle '404'}}
    <NotFound />
  {{/if}}
</template> satisfies TemplateOnlyComponent<Signature>;
