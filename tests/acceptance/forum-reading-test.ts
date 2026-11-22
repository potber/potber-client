import {
  click,
  currentURL,
  findAll,
  visit,
  waitFor,
  waitUntil,
} from '@ember/test-helpers';
import EphemeralSessionStore from 'ember-simple-auth/session-stores/ephemeral';
import { authenticateSession } from 'ember-simple-auth/test-support';
import type { IBookmark } from 'potber-client/services/api/models/bookmark';
import type { Boards, Posts, Threads } from 'potber-client/services/api/types';
import { LandingPage } from 'potber-client/services/settings';
import { setupApplicationTest } from 'potber-client/tests/helpers';
import { module, test } from 'qunit';

const boardLink = 'a[href^="/board?"][href*="BID=14"]';
const bookmarksPath = '/bookmarks/threads';
const bookmarkLink = '.bookmark-link[href*="TID=42"][href*="PID=101"]';
const threadLink = 'a[href^="/thread?"][href*="TID=42"]';

const openingPost: Posts.Read = {
  id: '101',
  message: 'The opening post',
  date: '2026-01-01T12:00:00Z',
  threadId: '42',
  boardId: '14',
  author: { id: '7', name: 'Thread Author' },
};
const latestPost: Posts.Read = {
  ...openingPost,
  id: '102',
  message: 'A post on page two',
};

const thread: Threads.Read = {
  id: '42',
  title: 'Weekend plans',
  boardId: '14',
  repliesCount: 1,
  hitsCount: 20,
  pagesCount: 2,
  isClosed: false,
  isSticky: false,
  isImportant: false,
  isAnnouncement: false,
  isGlobal: false,
  firstPost: openingPost,
  lastPost: latestPost,
};
const boardSummary: Boards.Summary = {
  id: '14',
  categoryId: '1',
  name: 'General discussion',
  description: 'Community discussion',
  threadsCount: 1,
  repliesCount: 1,
  lastPost: latestPost,
};
const board: Boards.Read = {
  ...boardSummary,
  page: {
    number: 1,
    stickiesCount: 0,
    globalsCount: 0,
    threadsCount: 1,
    threads: [thread],
  },
};

const bookmark: IBookmark = {
  id: '55',
  postId: '101',
  newPostsCount: 1,
  thread: { id: '42', title: 'Weekend plans', isClosed: false, pagesCount: 2 },
  board: { id: '14', name: 'General discussion' },
};

async function clickMenuAction(menu: string, label: string) {
  await click(menu);
  const action = findAll('menu[data-visible="true"] button.menu-item').find(
    (button) => button.textContent?.trim() === label,
  );
  if (!action) throw new Error(`Missing menu action: ${label}`);
  await click(action);
}

module('Acceptance | Reading the forum', function (hooks) {
  setupApplicationTest(hooks);

  let originalFetch: typeof fetch;
  let originalOnError: typeof window.onerror;
  let storedValues: Map<string, string | null>;

  let startupRefreshed: boolean;
  let bookmarks: IBookmark[];

  hooks.beforeEach(async function () {
    startupRefreshed = false;
    bookmarks = [];
    this.owner.register('session-store:application', EphemeralSessionStore);
    originalOnError = window.onerror;
    storedValues = new Map(
      [
        'potber-settings',
        'potber-boardFavorites',
        'potber-savedPosts',
        'potber-lastEncountedVersion',
      ].map((key) => [key, localStorage.getItem(key)]),
    );
    localStorage.removeItem('potber-boardFavorites');
    localStorage.removeItem('potber-savedPosts');
    localStorage.removeItem('potber-lastEncountedVersion');
    localStorage.setItem(
      'potber-settings',
      JSON.stringify({
        landingPage: LandingPage.home,
        autoRefreshSidebar: false,
        appsignalErrorReporting: false,
      }),
    );

    originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const request = new Request(input, init);
      const { pathname, searchParams } = new URL(request.url);

      switch (`${request.method} ${pathname}`) {
        case 'GET /auth/session':
          return Response.json({
            userId: '9',
            username: 'Test User',
            avatarUrl: '',
            cookie: '',
            iat: 0,
            exp: 0,
          });
        case 'GET /bookmarks':
          return Response.json(bookmarks);
        case 'POST /bookmarks': {
          const payload = await request.json();
          if (payload.threadId !== '42' || payload.postId !== '101') {
            throw new Error('Bookmark request targeted a different post');
          }
          bookmarks = [bookmark];
          return Response.json(bookmark, { status: 201 });
        }
        case 'DELETE /bookmarks/55':
          bookmarks = bookmarks.filter(({ id }) => id !== '55');
          return new Response(null, { status: 204 });
        case 'GET /privateMessages':
          startupRefreshed = true;
          return Response.json([]);
        case 'GET /version.json':
        case 'GET /user-configuration':
          return new Response(null, { status: 404 });
        case 'GET /boardCategories':
          return Response.json([
            {
              id: '1',
              name: 'Community',
              description: '',
              boards: [boardSummary],
            },
          ]);
        case 'GET /posts/101':
          if (searchParams.get('threadId') !== '42') {
            throw new Error('Saved post was requested from a different thread');
          }
          return Response.json(openingPost);
        case 'GET /boards/14':
          return Response.json(board);
        case 'GET /threads/42': {
          const number =
            searchParams.get('postId') === '101' ||
            searchParams.get('page') === '1'
              ? 1
              : 2;
          const post = number === 2 ? latestPost : openingPost;
          return Response.json({
            ...thread,
            page: { number, offset: number - 1, postCount: 1, posts: [post] },
          } satisfies Threads.Read);
        }
        default:
          throw new Error(
            `Unexpected reading test request: ${request.method} ${pathname}`,
          );
      }
    };
    await authenticateSession({ access_token: 'reading-test-token' });
  });

  hooks.afterEach(async function () {
    // Let the thread's scroll positioning frame run before Ember destroys its owner.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    window.fetch = originalFetch;
    window.onerror = originalOnError;
    for (const [key, value] of storedValues) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
  });

  test('opens a board and reads a thread from the board overview', async function (assert) {
    await visit('/board-overview');
    await waitUntil(() => startupRefreshed);
    const category = findAll('button').find(
      (button) => button.textContent?.trim() === 'Community',
    );
    if (!category) throw new Error('Community category missing');
    await click(category);
    assert.dom(boardLink).includesText('General discussion');
    await click(boardLink);
    assert.true(currentURL().startsWith('/board?'));
    assert.dom(threadLink).includesText('Weekend plans');
    await click(threadLink);
    await waitFor('#post-102');
    assert.true(currentURL().startsWith('/thread?'));
    assert.dom('#post-102').includesText('A post on page two');
  });

  test('moves between thread pages and shows the posts for each page', async function (assert) {
    await visit('/thread?TID=42&page=1');
    await waitUntil(() => startupRefreshed);
    // CI has seen `visit` settle before the first page rendered; wait like the page changes below.
    await waitFor('#post-101');
    assert.dom('#post-101').includesText('The opening post');

    const pageControls = '.nav-element-center > a[href^="/thread?"]';
    await click(`${pageControls}[href*="page=2"]`);
    await waitFor('#post-102');

    const page = new URL(currentURL(), window.location.origin);
    assert.strictEqual(page.searchParams.get('page'), '2');
    assert.dom('#post-102').includesText('A post on page two');
    assert.dom('#post-101').doesNotExist();

    await click(`${pageControls}[href*="page=1"]`);
    await waitFor('#post-101');
    assert.dom('#post-101').includesText('The opening post');
    assert.dom('#post-102').doesNotExist();
  });

  test('resumes a bookmarked thread at the last-read post and links to the unread page', async function (assert) {
    bookmarks = [bookmark];
    await visit('/board?BID=14');
    await waitUntil(() => startupRefreshed);
    const resumeLink = `${threadLink}[href*="lastReadPost=101"]`;
    await waitFor(resumeLink);
    await click(resumeLink);

    const unreadLink = '#post-101 + span a[title="Zur nächsten Seite"]';
    await waitFor(unreadLink);
    const page = new URL(currentURL(), window.location.origin);
    assert.strictEqual(page.searchParams.get('PID'), '101');
    assert.strictEqual(page.searchParams.get('lastReadPost'), '101');
    assert.dom(unreadLink).hasText('Neue Posts auf der nächsten Seite');
    assert.dom('#post-102').doesNotExist();

    await click(unreadLink);
    await waitFor('#post-102');
    assert.dom('#post-102').includesText('A post on page two');
  });

  test('bookmarking a post adds the thread at that post to bookmarks', async function (assert) {
    await visit(bookmarksPath);
    await waitUntil(() => startupRefreshed);
    assert.dom(bookmarkLink).doesNotExist();

    await visit('/thread?TID=42&page=1');
    await clickMenuAction('#post-101 .menu-button', 'Lesezeichen setzen');
    await visit(bookmarksPath);

    assert.dom(bookmarkLink).includesText('Weekend plans');
  });

  test('removing a bookmark clears it from the list and keeps it removed', async function (assert) {
    bookmarks = [bookmark];
    await visit(bookmarksPath);
    await waitUntil(() => startupRefreshed);
    assert.dom(bookmarkLink).includesText('Weekend plans');

    await clickMenuAction('.bookmark .menu-button', 'Lesezeichen entfernen');
    assert.dom(bookmarkLink).doesNotExist();

    await visit('/board-overview');
    await visit(bookmarksPath);
    assert.dom(bookmarkLink).doesNotExist();
    assert.dom().includesText('Du hast keine Lesezeichen gespeichert.');
  });

  test('a saved post is still available after leaving and revisiting saved posts', async function (assert) {
    const savedPostsPath = '/bookmarks/saved-posts';
    await visit(bookmarksPath);
    await waitUntil(() => startupRefreshed);
    await click(`a[href="${savedPostsPath}"]`);
    assert.dom().includesText('Du hast keine Posts gespeichert.');

    await visit('/thread?TID=42&page=1');
    await clickMenuAction('#post-101 .menu-button', 'Post speichern');
    await visit(bookmarksPath);
    await click(`a[href="${savedPostsPath}"]`);
    assert.dom(bookmarkLink).includesText('The opening post');

    await click(`a[href="${bookmarksPath}"]`);
    assert.strictEqual(currentURL(), bookmarksPath);
    await click(`a[href="${savedPostsPath}"]`);
    assert.strictEqual(currentURL(), savedPostsPath);
    assert.dom(bookmarkLink).includesText('The opening post');
  });

  test('removing a saved post keeps it out of the saved posts list', async function (assert) {
    localStorage.setItem(
      'potber-savedPosts',
      JSON.stringify([{ id: '101', threadId: '42' }]),
    );
    const savedPostsPath = '/bookmarks/saved-posts';
    await visit(bookmarksPath);
    await waitUntil(() => startupRefreshed);
    await click(`a[href="${savedPostsPath}"]`);
    assert.dom(bookmarkLink).includesText('The opening post');

    await clickMenuAction(
      '.bookmark .menu-button',
      'Gespeicherten Post entfernen',
    );
    await visit(bookmarksPath);
    await visit(savedPostsPath);

    assert.dom(bookmarkLink).doesNotExist();
    assert.dom().includesText('Du hast keine Posts gespeichert.');
    assert.strictEqual(localStorage.getItem('potber-savedPosts'), '[]');
  });

  test('adding and removing a board favorite updates Home and persisted favorites', async function (assert) {
    const favorite = `.home .quickstart-item ${boardLink}`;
    await visit('/board?BID=14');
    await waitUntil(() => startupRefreshed);
    await clickMenuAction(
      '.nav-element-center .menu-button',
      'Zu Favoriten hinzufügen',
    );
    await visit('/home');
    await waitFor(favorite);
    assert.dom(favorite).includesText('General discussion');
    assert.strictEqual(localStorage.getItem('potber-boardFavorites'), '14');

    await clickMenuAction(
      '.home .quickstart-item .menu-button',
      'Favorit entfernen',
    );
    await visit('/board-overview');
    await visit('/home');
    assert.dom(favorite).doesNotExist();
    assert.strictEqual(localStorage.getItem('potber-boardFavorites'), '');
  });
});
