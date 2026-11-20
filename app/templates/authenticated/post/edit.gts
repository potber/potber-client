import type { TemplateOnlyComponent } from '@ember/component/template-only';
import { pageTitle } from 'ember-page-title';
import t from 'ember-intl/helpers/t';
import PostForm from 'potber-client/components/features/post-form';
import Reply from 'potber-client/components/features/post-form/reply';
import type PostEditController from 'potber-client/controllers/authenticated/post/edit';
import type { PostEditRouteModel } from 'potber-client/routes/authenticated/post/edit';

interface Signature {
  Args: {
    model: PostEditRouteModel;
    controller: PostEditController;
  };
}

export default <template>
  {{pageTitle (t 'route.post.edit.title')}}

  <PostForm
    @id='edit-post-form'
    @threadOrPost={{@model.post}}
    @navTitle={{t 'route.post.edit.title'}}
    @onSubmit={{@controller.handleSubmit}}
  >
    <Reply @formId='edit-post-form' @post={{@model.post}} />
  </PostForm>
</template> satisfies TemplateOnlyComponent<Signature>;
