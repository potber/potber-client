import { pageTitle } from 'ember-page-title';
import SavedPosts from 'potber-client/components/features/bookmarks/saved-posts';
import NavBookmarks from 'potber-client/components/nav/routes/bookmarks';

<template>
  {{pageTitle 'Gespeicherte Posts'}}

  <NavBookmarks @tab='Gespeicherte Posts' />

  <SavedPosts />
</template>
