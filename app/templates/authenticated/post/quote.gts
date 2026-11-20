import type { TemplateOnlyComponent } from '@ember/component/template-only';
import { pageTitle } from 'ember-page-title';
import t from 'ember-intl/helpers/t';
import PostForm from 'potber-client/components/features/post-form';
import Reply from 'potber-client/components/features/post-form/reply';
import RecentPosts from 'potber-client/components/routes/post/recent-posts';
import type PostQuoteController from 'potber-client/controllers/authenticated/post/quote';
import type { PostCreateRouteModel } from 'potber-client/routes/authenticated/post/create';

interface Signature {
  Args: {
    model: PostCreateRouteModel;
    controller: PostQuoteController;
  };
}

export default <template>
  {{pageTitle (t 'route.post.create.title')}}

  <PostForm
    @id='create-post-form'
    @threadOrPost={{@model.post}}
    @navTitle={{t 'route.post.create.title'}}
    @onSubmit={{@controller.handleSubmit}}
  >
    <Reply @formId='create-post-form' @post={{@model.post}} />
  </PostForm>

  <RecentPosts @threadState={{@model.threadState}} />
</template> satisfies TemplateOnlyComponent<Signature>;
