import Component from '@glimmer/component';
import { service } from '@ember/service';
import { hash } from '@ember/helper';
import FaIcon from '@fortawesome/ember-fontawesome/components/fa-icon';
import type IntlService from 'ember-intl/services/intl';
import t from 'ember-intl/helpers/t';
import Portal from 'ember-stargate/components/portal';
import Button from 'potber-client/components/common/control/button';
import ControlLink from 'potber-client/components/common/control/link';
import Menu from 'potber-client/components/common/control/menu';
import MenuButton from 'potber-client/components/common/control/menu/button';
import MenuLink from 'potber-client/components/common/control/menu/link';
import MenuLinkExternal from 'potber-client/components/common/control/menu/link-external';
import RendererService from 'potber-client/services/renderer';
import ModalService from 'potber-client/services/modal';
import RouterService from '@ember/routing/router-service';
import CustomSession from 'potber-client/services/custom-session';
import { appConfig } from 'potber-client/config/app.config';
import MessagesService from 'potber-client/services/messages';
import ApiService from 'potber-client/services/api';
import type { Threads } from 'potber-client/services/api/types';
import ThreadStore from 'potber-client/services/stores/thread';
import BookmarkStore from 'potber-client/services/stores/bookmark';
import { getAnchorId } from 'potber-client/utils/misc';
import NavHeader from '../../component/header';

export interface Signature {
  Args: {
    threadId: string;
    thread?: Threads.Read;
    postId?: string;
    page?: number;
  };
}

export default class NavRoutesThreadComponent extends Component<Signature> {
  @service declare renderer: RendererService;
  @service declare modal: ModalService;
  @service declare router: RouterService;
  @service declare session: CustomSession;
  @service declare messages: MessagesService;
  @service declare api: ApiService;
  @service declare intl: IntlService;
  @service('stores/thread') declare threadStore: ThreadStore;
  @service('stores/bookmark') declare bookmarkStore: BookmarkStore;

  get isLoading() {
    return !this.args.thread;
  }

  get thread() {
    return this.args.thread;
  }

  get title() {
    return this.thread?.title ?? '';
  }

  get subtitle() {
    return this.intl.t('route.thread.subtitle', {
      currentPage: this.currentPage ?? '..',
      pagesCount: this.thread?.pagesCount ?? '..',
    });
  }

  get nextPageVisible() {
    if (!this.currentPage) return false;
    return this.thread && this.currentPage < this.thread.pagesCount;
  }

  get currentPage() {
    return this.args.page ?? this.thread?.page?.number;
  }

  get nextPage() {
    if (!this.currentPage) return;
    return this.currentPage + 1;
  }

  get previousPageVisible() {
    if (!this.currentPage) return false;
    return this.currentPage > 1;
  }

  get previousPage() {
    if (!this.currentPage) return;
    return this.currentPage - 1;
  }

  get lastPage() {
    return this.thread?.pagesCount;
  }

  get originalUrl() {
    return `${appConfig.forumUrl}thread.php?TID=${this.thread?.id}`;
  }

  get authenticated() {
    return this.session.isAuthenticated;
  }

  get loadedThread() {
    if (!this.thread) {
      throw new Error('Expected thread to be loaded.');
    }
    return this.thread;
  }

  get bookmark() {
    return this.bookmarkStore.all?.find(
      (bookmark) => bookmark.thread.id === this.thread?.id,
    );
  }

  deleteBookmark = async () => {
    if (!this.bookmark) return;
    await this.bookmark.delete();
    this.messages.showNotification(
      this.intl.t('route.thread.delete-bookmark-success'),
      'success',
    );
  };

  reload = async () => {
    this.renderer.showLoadingIndicator();
    this.renderer.preventNextScrollReset();
    this.threadStore.reload().finally(() => {
      this.threadStore.isReloading = false;
      this.renderer.hideLoadingIndicator();
      this.renderer.waitAndScrollToBottom();
    });
  };

  handleGoToPage = () => {
    this.modal.input({
      title: 'Gehe zu Seite...',
      text: `Gib eine Seite zwischen 1 und ${this.thread?.pagesCount} ein.`,
      icon: 'arrow-right',
      label: `Seite`,
      type: 'number',
      minLength: 1,
      maxLength: 5,
      min: 1,
      max: this.thread?.pagesCount,
      submitLabel: 'Los',
      onSubmit: (value) => {
        this.router.transitionTo('authenticated.thread', {
          queryParams: {
            TID: this.args.threadId,
            page: value,
          },
        });
        this.modal.close();
      },
    });
  };

  handleGoToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  handleGoToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  handleFocusPost = () => {
    const { postId } = this.args;
    if (!postId) return;
    const anchorId = getAnchorId(postId);
    this.renderer.scrollToElement(anchorId, { highlight: true });
  };

  <template>
    <Portal @target='top-nav'>
      <NavHeader
        @title={{this.title}}
        @subtitle={{this.subtitle}}
        @loading={{this.isLoading}}
      />
    </Portal>

    <Portal @target='bottom-nav'>
      {{#if this.thread}}
        {{#let this.loadedThread as |thread|}}
          <ControlLink
            @title='Zum Board'
            @size='square'
            @route='authenticated.board'
            @query={{hash BID=thread.boardId}}
            class='nav-element-left'
          ><FaIcon @icon='arrow-up' /></ControlLink>

          <div class='nav-element-center'>
            {{#if this.previousPageVisible}}
              <ControlLink
                @title='Vorherige Seite'
                @size='square'
                @route='authenticated.thread'
                @query={{hash
                  TID=@threadId
                  page=this.previousPage
                  PID=undefined
                  lastReadPost=undefined
                  scrollToBottom=undefined
                }}
              ><FaIcon @icon='chevron-left' /></ControlLink>
            {{else}}
              <span class='hidden control-size-square' />
            {{/if}}

            <Menu
              @position={{unless this.renderer.isDesktop 'top' 'bottom'}}
              @variant='primary-transparent'
              @icon='ellipsis'
            >
              {{#if this.bookmark}}
                <MenuButton
                  @text={{t 'route.thread.delete-bookmark'}}
                  @icon='bookmark'
                  @onClick={{this.deleteBookmark}}
                />
              {{/if}}
              <MenuLinkExternal
                @text='Original öffnen'
                @icon='up-right-from-square'
                @href={{this.originalUrl}}
                target='_blank'
              />
              <MenuLink
                @text='Zur ersten Seite'
                @icon='backward-step'
                @route='authenticated.thread'
                @query={{hash
                  TID=@threadId
                  page='1'
                  PID=undefined
                  lastReadPost=undefined
                  scrollToBottom=undefined
                }}
              />
              <MenuButton
                @text='Zur Seite...'
                @icon='magnifying-glass'
                @onClick={{this.handleGoToPage}}
              />
              <MenuLink
                @text='Zur letzten Seite'
                @icon='forward-step'
                @route='authenticated.thread'
                @query={{hash
                  TID=@threadId
                  page=this.lastPage
                  PID=undefined
                  lastReadPost=undefined
                  scrollToBottom=undefined
                }}
              />
              <MenuButton
                @text='Zum Seitenanfang'
                @icon='chevron-up'
                @onClick={{this.handleGoToTop}}
              />
              <MenuButton
                @text='Zum Seitenende'
                @icon='chevron-down'
                @onClick={{this.handleGoToBottom}}
              />
              {{#if @postId}}
                <MenuButton
                  @text='Verlinkten Post fokussieren'
                  @icon='arrows-to-dot'
                  @onClick={{this.handleFocusPost}}
                />
              {{/if}}
            </Menu>

            {{#if this.nextPageVisible}}
              <ControlLink
                @title='Nächste Seite'
                @size='square'
                @route='authenticated.thread'
                @query={{hash
                  TID=@threadId
                  page=this.nextPage
                  PID=undefined
                  lastReadPost=undefined
                  scrollToBottom=undefined
                }}
              ><FaIcon @icon='chevron-right' /></ControlLink>
            {{else}}
              <Button
                @size='square'
                @icon='rotate-right'
                @variant='primary-transparent'
                @onClick={{this.reload}}
                @busy={{this.threadStore.isReloading}}
              />
            {{/if}}
          </div>

          <ControlLink
            @title='Antworten'
            @size='square'
            @route='authenticated.post.create'
            @query={{hash TID=@threadId page=thread.pagesCount}}
            @disabled={{thread.isClosed}}
            class='nav-element-right'
          ><FaIcon
              @icon={{if thread.isClosed 'lock' 'comment'}}
            /></ControlLink>
        {{/let}}
      {{/if}}
    </Portal>
  </template>
}
