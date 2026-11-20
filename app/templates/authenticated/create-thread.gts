import type { TemplateOnlyComponent } from '@ember/component/template-only';
import { pageTitle } from 'ember-page-title';
import t from 'ember-intl/helpers/t';
import PostForm from 'potber-client/components/features/post-form';
import NewThread from 'potber-client/components/features/post-form/new-thread';
import type CreateThreadController from 'potber-client/controllers/authenticated/create-thread';
import type { CreateThreadRouteModel } from 'potber-client/routes/authenticated/create-thread';

interface Signature {
  Args: {
    model: CreateThreadRouteModel;
    controller: CreateThreadController;
  };
}

export default <template>
  {{pageTitle (t 'route.create-thread.title')}}

  <PostForm
    @id='create-thread-form'
    @threadOrPost={{@model.thread}}
    @navTitle={{t 'route.create-thread.title'}}
    @navSubtitle={{@model.board.name}}
    @onSubmit={{@controller.handleSubmit}}
  >
    <NewThread @formId='create-thread-form' @thread={{@model.thread}} />
  </PostForm>
</template> satisfies TemplateOnlyComponent<Signature>;
