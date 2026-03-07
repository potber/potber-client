import { hash } from '@ember/helper';
import { on } from '@ember/modifier';
import didInsert from '@ember/render-modifiers/modifiers/did-insert';
import Component from '@glimmer/component';
import FaIcon from '@fortawesome/ember-fontawesome/components/fa-icon';
import { service } from '@ember/service';
import classNames from 'potber-client/helpers/class-names';
import styles from './styles.module.css';
import Avatar from 'potber-client/components/common/avatar';
import Menu from 'potber-client/components/common/control/menu';
import MenuButton from 'potber-client/components/common/control/menu/button';
import MenuLink from 'potber-client/components/common/control/menu/link';
import MenuLinkExternal from 'potber-client/components/common/control/menu/link-external';
import BoardIcon from 'potber-client/components/board/icon';
import ContentParserService from 'potber-client/services/content-parser';
import MessagesService from 'potber-client/services/messages';
import type Post from 'potber-client/models/post';
import type Thread from 'potber-client/models/thread';
import SettingsService, { AvatarStyle } from 'potber-client/services/settings';
import RendererService from 'potber-client/services/renderer';
import LocalStorageService from 'potber-client/services/local-storage';
import ModalService from 'potber-client/services/modal';
import CustomSession from 'potber-client/services/custom-session';
import { htmlSafe } from '@ember/template';
import { appConfig } from 'potber-client/config/app.config';
import ApiService from 'potber-client/services/api';
import type IntlService from 'ember-intl/services/intl';
import BookmarkStore from 'potber-client/services/stores/bookmark';
import { getAnchorId } from 'potber-client/utils/misc';
import SocialsService from 'potber-client/services/socials';

interface Signature {
  Args: {
    post: Post;
    thread?: Thread;
    subtle?: boolean;
    disableMenu?: boolean;
  };
}

export default class PostComponent extends Component<Signature> {
  styles = styles;

  @service declare contentParser: ContentParserService;
  @service declare messages: MessagesService;
  @service declare session: CustomSession;
  @service declare settings: SettingsService;
  @service declare renderer: RendererService;
  @service declare localStorage: LocalStorageService;
  @service declare modal: ModalService;
  @service declare api: ApiService;
  @service declare intl: IntlService;
  @service('stores/bookmark') declare bookmarkStore: BookmarkStore;
  @service declare socials: SocialsService;

  get elementId() {
    return getAnchorId(this.args.post.id);
  }

  get post() {
    return this.args.post;
  }

  get thread() {
    return this.args.thread;
  }

  get avatarUrl() {
    return this.post.avatarUrl ?? '';
  }

  get authorName() {
    return (
      this.post.author.name ?? this.intl.t('route.thread.post.deleted-user')
    );
  }

  get date() {
    return this.post.date
      ? new Date(this.post.date).toLocaleString()
      : new Date().toLocaleString();
  }

  get url() {
    return `${appConfig.forumUrl}thread.php?TID=${this.post.threadId}&PID=${this.post.id}#reply_${this.post.id}`;
  }

  get message() {
    if (typeof this.post.message === 'string') {
      const content = this.contentParser.parsePostContent(this.post.message, {
        groupId: this.post.author.groupId,
      });
      return htmlSafe(content);
    } else {
      return null;
    }
  }

  get showAvatar() {
    return Boolean(
      this.post.avatarUrl &&
        this.settings.getSetting('avatarStyle') === AvatarStyle.small,
    );
  }

  get hasTitleOrIcon() {
    return Boolean(this.post.title || this.post.icon);
  }

  showAuthorProfile = async () => {
    try {
      const user = await this.api.findUserById(this.post.author.id);
      this.modal.userProfile({ user });
    } catch (error: any) {
      // In case of an error, do not call the modal
      return;
    }
  };

  copyUrl = () => {
    if (this.args.disableMenu) return;
    navigator.clipboard.writeText(this.url);
    this.messages.showNotification(
      'Link in Zwischenablage kopiert.',
      'success',
    );
  };

  setBookmark = async () => {
    await this.api.createBookmark(this.post.id, this.post.threadId);
    this.messages.showNotification(
      this.intl.t('route.thread.create-bookmark-success'),
      'success',
    );
    this.bookmarkStore.reload();
  };

  savePost = async () => {
    try {
      const savedPosts = [
        ...((await this.localStorage.getSavedPosts()) as Post[]),
      ];
      if (savedPosts.find((post) => post.id === this.post.id)) {
        this.messages.showNotification(
          'Du hast diesen Post bereits gespeichert.',
          'error',
        );
        return;
      }
      savedPosts.push(this.post);
      this.localStorage.setSavedPosts(savedPosts);
      this.messages.showNotification('Post gespeichert', 'success');
    } catch (error) {
      this.messages.logErrorAndNotify(
        'Das hat leider nicht geklappt.',
        error,
        this.constructor.name,
      );
    }
  };

  report = () => {
    this.modal.input({
      title: 'Post melden',
      icon: 'triangle-exclamation',
      label:
        'Bitte gib einen Grund an, weshalb Du diesen Post an die Moderator:innen melden möchtest.',
      submitLabel: 'Melden',
      useTextarea: true,
      onSubmit: async (cause: string) => {
        try {
          await this.api.reportPost(this.post.id, { cause });
          this.messages.showNotification(
            this.intl.t('route.thread.report-post-success'),
            'success',
          );
        } catch (error) {
          // In case of an error do nothing so the user can potentially try again
        }
        this.modal.close();
      },
    });
  };

  get canEdit() {
    return this.session.sessionData?.userId === this.post.author.id;
  }

  get editingInfo() {
    if (this.post.editedCount && this.post.lastEdit) {
      return `${this.post.editedCount}x bearbeitet, zuletzt von ${
        this.post.lastEdit.user.name
      } am ${new Date(this.post.lastEdit.date).toLocaleString()}`;
    }
  }

  blockUser = () => {
    const username = this.post.author.name ?? 'Unbekannt';
    this.socials.blockUser(this.post.author.id, username);
    this.messages.showNotification(
      this.intl.t('feature.blocklist.blocked-user', {
        username,
      }),
      'success',
    );
  };

  unblockUser = () => {
    this.socials.unblockUser(this.post.author.id);
    this.messages.showNotification(
      this.intl.t('feature.blocklist.unblocked-user', {
        username: this.post.author.name,
      }),
      'success',
    );
  };

  get blocked() {
    return this.socials.isUserBlocked(this.post.author.id);
  }

  unblockPost = (event: MouseEvent) => {
    (event.target as HTMLButtonElement).remove();
  };

  checkForQuotesByBlockedUsers = (element: HTMLDivElement) => {
    const quotes = element.querySelectorAll(`span.quote`);
    for (const quote of quotes) {
      const body = quote.querySelector('blockquote');
      const authorName = quote.getAttribute('data-author-name');
      if (!authorName || !body) continue;
      const block = this.socials.isUserBlocked(authorName);
      if (block) {
        const mask = document.createElement('button');
        mask.className = this.styles['blocked-mask'] ?? '';
        mask.addEventListener('click', () => {
          mask.remove();
        });
        body.appendChild(mask);
      }
    }
  };

  <template>
    <div id={{this.elementId}} class='post'>
      {{#if @subtle}}
        <span class={{classNames this 'subtle-mask'}} />
      {{/if}}
      <div class={{classNames this 'header'}}>
        <div class={{classNames this 'details'}}>
          {{#if this.showAvatar}}
            <Avatar @src={{this.avatarUrl}} @userId={{this.post.author.id}} />
          {{/if}}
          <button
            type='button'
            class={{classNames this 'author'}}
            {{on 'click' this.showAuthorProfile}}
          >{{#unless this.post.author.locked}}
              <b>{{this.authorName}}</b>
            {{else}}
              <s><b>{{this.authorName}}</b></s><FaIcon @icon='lock' />
            {{/unless}}
          </button>
          <button
            type='button'
            class={{classNames this 'date'}}
            {{on 'click' this.copyUrl}}
          >{{this.date}}<FaIcon @icon='link' /></button>
        </div>
        {{#unless @disableMenu}}
          <Menu @position='auto' @variant='secondary-transparent'>
            <MenuLinkExternal
              @text='Original öffnen'
              @icon='up-right-from-square'
              @href={{this.url}}
              target='_blank'
            />
            {{#if this.blocked}}
              <MenuButton
                @text='Nutzer:in nicht mehr blocken'
                @icon='shield'
                @onClick={{this.unblockUser}}
              />
            {{else}}
              <MenuButton
                @text='Nutzer:in blocken'
                @icon='shield-halved'
                @onClick={{this.blockUser}}
              />
            {{/if}}
            <MenuButton
              @text='Post melden'
              @icon='triangle-exclamation'
              @onClick={{this.report}}
            />
            <MenuButton
              @text='Lesezeichen setzen'
              @icon='bookmark'
              @onClick={{this.setBookmark}}
            />
            <MenuButton
              @text='Post speichern'
              @icon='floppy-disk'
              @onClick={{this.savePost}}
            />
            {{#if this.thread}}
              <MenuLink
                @text='Zitieren'
                @icon='comment-dots'
                @route='authenticated.post.quote'
                @query={{hash
                  TID=this.post.threadId
                  page=this.thread.pagesCount
                  PID=this.post.id
                }}
              />
            {{/if}}
            {{#if this.canEdit}}
              <MenuLink
                @text='Bearbeiten'
                @icon='edit'
                @route='authenticated.post.edit'
                @query={{hash TID=this.post.threadId PID=this.post.id}}
              />
            {{/if}}
          </Menu>
        {{/unless}}
      </div>
      <div
        class={{classNames this 'body'}}
        {{didInsert this.checkForQuotesByBlockedUsers}}
      >
        {{#if this.post.contentHidden}}
          <p class='subtitle no-margin'>⚠ Inhalt versteckt</p>
        {{else}}
          {{#if this.hasTitleOrIcon}}
            <p class={{classNames this 'title'}}>
              {{#if this.post.icon}}
                <BoardIcon @icon={{this.post.icon}} />
              {{/if}}
              {{this.post.title}}
            </p>
          {{/if}}
          <p class={{classNames this 'message'}}>
            {{this.message}}
          </p>
        {{/if}}
        {{#if this.post.lastEdit}}
          <p class={{classNames this 'footer'}}>
            {{this.editingInfo}}
          </p>
        {{/if}}
        {{#if this.blocked}}
          <button
            class={{classNames this 'blocked-mask'}}
            {{on 'click' this.unblockPost}}
          />
        {{/if}}
      </div>
    </div>
  </template>
}
