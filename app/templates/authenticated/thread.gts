import type { TemplateOnlyComponent } from '@ember/component/template-only';
import { pageTitle } from 'ember-page-title';
import NotFound from 'potber-client/components/misc/error/not-found';
import NavThread from 'potber-client/components/nav/routes/thread';
import ThreadPage from 'potber-client/components/routes/thread/page';
import type ThreadController from 'potber-client/controllers/authenticated/thread';
import type { ThreadRouteModel } from 'potber-client/routes/authenticated/thread';

interface Signature {
  Args: {
    model: ThreadRouteModel;
    controller: ThreadController;
  };
}

export default <template>
  {{#unless @controller.isError}}
    {{pageTitle @controller.pageTitle}}

    <NavThread
      @threadId={{@model.threadId}}
      @thread={{@controller.currentOrPreviousThread}}
      @postId={{@model.postId}}
      @page={{@controller.currentPage}}
    />

    <ThreadPage
      @thread={{@controller.currentOrPreviousThread}}
      @lastReadPost={{@model.lastReadPost}}
      @loading={{@controller.showSkeletonPage}}
    />
  {{else}}
    {{pageTitle '404'}}
    <NotFound />
  {{/unless}}
</template> satisfies TemplateOnlyComponent<Signature>;
