import type { TemplateOnlyComponent } from '@ember/component/template-only';
import { pageTitle } from 'ember-page-title';
import SavedPosts from 'potber-client/components/features/bookmarks/saved-posts';
import NavBookmarks from 'potber-client/components/nav/routes/bookmarks';
import type SavedPostsRoute from 'potber-client/routes/authenticated/bookmarks/saved-posts';

interface Signature {
  Args: {
    model: Awaited<ReturnType<SavedPostsRoute['model']>>;
    controller: unknown;
  };
}

export default <template>
  {{pageTitle 'Gespeicherte Posts'}}

  <NavBookmarks @tab='Gespeicherte Posts' />

  <SavedPosts @savedPosts={{@model.savedPosts}} />
</template> satisfies TemplateOnlyComponent<Signature>;
