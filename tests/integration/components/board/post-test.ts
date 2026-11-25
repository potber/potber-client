import Service from '@ember/service';
import { click, render, type TestContext } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import PostComponent from 'potber-client/components/board/post';
import styles from 'potber-client/components/board/post/styles.module.css';
import type Post from 'potber-client/models/post';
import SettingsService, { AvatarStyle } from 'potber-client/services/settings';
import type SocialsService from 'potber-client/services/socials';
import { setupRenderingTest } from 'potber-client/tests/helpers';

interface Context extends TestContext {
  post: Post;
  PostComponent: typeof PostComponent;
}

function createPost(overrides: Partial<Post> = {}): Post {
  return {
    id: '100',
    author: { id: '200', name: 'Test author' },
    date: '2026-11-25T12:00:00.000Z',
    message: 'Post content',
    threadId: '300',
    boardId: '14',
    ...overrides,
  };
}

module('Integration | Component | Board | Post', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function (this: Context) {
    this.PostComponent = PostComponent;
  });

  test('shows a deleted, locked author and withholds forum-hidden content', async function (this: Context, assert) {
    this.post = createPost({
      author: { id: '200', locked: true },
      contentHidden: true,
    });

    await render<Context>(
      hbs`<this.PostComponent @post={{this.post}} @disableMenu={{true}} />`,
    );

    assert.dom('.post s').hasText('Gelöschte:r Nutzer:in');
    assert.dom('.post .subtitle').hasText('⚠ Inhalt versteckt');
    assert.dom(`.${styles['message']}`).doesNotExist();
    assert.dom('.post .menu-button').doesNotExist();
  });

  test('renders an avatar, title, icon, and edit details for a visible post', async function (this: Context, assert) {
    class TestSettings extends SettingsService {
      override load() {
        return { ...super.load(), avatarStyle: AvatarStyle.small };
      }
    }

    this.owner.register('service:settings', TestSettings);
    const avatarUrl =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    this.post = createPost({
      title: 'Post title',
      icon: '2',
      avatarUrl,
      editedCount: 2,
      lastEdit: {
        user: { id: '200', name: 'Test author' },
        date: '2026-11-25T12:15:00.000Z',
      },
    });

    await render<Context>(
      hbs`<this.PostComponent @post={{this.post}} @disableMenu={{true}} @subtle={{true}} />`,
    );

    assert.dom('.post .avatar img').hasAttribute('src', avatarUrl);
    assert.dom(`.${styles['title']}`).hasText('Post title');
    assert.dom('.post .post-icon').hasAttribute('alt', '2');
    assert.dom(`.${styles['message']}`).hasText('Post content');
    assert
      .dom(`.${styles['footer']}`)
      .includesText('2x bearbeitet, zuletzt von Test author');
    assert.dom(`.${styles['subtle-mask']}`).exists();
  });

  test('reveals a blocked post without unblocking its author', async function (this: Context, assert) {
    this.post = createPost();
    const socials = this.owner.lookup('service:socials') as SocialsService;
    socials.blockedUsers = [{ id: this.post.author.id, name: 'Test author' }];

    await render<Context>(
      hbs`<this.PostComponent @post={{this.post}} @disableMenu={{true}} />`,
    );

    const mask = `button.${styles['blocked-mask']}`;
    assert.dom(mask).exists();
    await click(mask);

    assert.dom(mask).doesNotExist();
    assert.dom(`.${styles['message']}`).hasText('Post content');
    assert.true(socials.isUserBlocked(this.post.author.id));
  });

  test('opens an author profile only after a successful lookup', async function (this: Context, assert) {
    this.post = createPost();
    const author = this.post.author;
    let lookupFails = true;

    class TestApi extends Service {
      async findUserById(id: string) {
        assert.strictEqual(id, author.id);
        if (lookupFails) throw new Error('Profile unavailable');
        return author;
      }
    }

    class TestModal extends Service {
      userProfile({ user }: { user: Post['author'] }) {
        assert.strictEqual(user, author);
        assert.step('opened profile');
      }
    }

    this.owner.register('service:api', TestApi);
    this.owner.register('service:modal', TestModal);

    await render<Context>(
      hbs`<this.PostComponent @post={{this.post}} @disableMenu={{true}} />`,
    );

    await click(`button.${styles['author']}`);
    assert.verifySteps([]);

    lookupFails = false;
    await click(`button.${styles['author']}`);
    assert.verifySteps(['opened profile']);
  });
});
