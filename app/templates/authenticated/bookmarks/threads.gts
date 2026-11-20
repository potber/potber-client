import type { TemplateOnlyComponent } from '@ember/component/template-only';
import { pageTitle } from 'ember-page-title';
import Bookmarks from 'potber-client/components/features/bookmarks/threads';
import NavBookmarks from 'potber-client/components/nav/routes/bookmarks';
import type BookmarksRoute from 'potber-client/routes/authenticated/bookmarks/threads';

interface Signature {
  Args: {
    model: Awaited<ReturnType<BookmarksRoute['model']>>;
    controller: unknown;
  };
}

export default <template>
  {{pageTitle 'Lesezeichen'}}

  <NavBookmarks @tab='Lesezeichen' />

  <Bookmarks @bookmarks={{@model.bookmarks}} />
</template> satisfies TemplateOnlyComponent<Signature>;
