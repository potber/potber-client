import eq from 'ember-truth-helpers/helpers/eq';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import type Post from 'potber-client/models/post';
import OverscrollContainer from 'potber-client/components/features/gestures/overscroll-container';
import UpdateScrollPosition from 'potber-client/components/misc/update-scroll-position';
import BoardPost from 'potber-client/components/board/post';
import isFinalElement from 'potber-client/helpers/is-final-element';
import { isPostSubtle as getIsPostSubtle } from 'potber-client/helpers/is-post-subtle';
import { Threads } from 'potber-client/services/api/types';
import DeviceManagerService from 'potber-client/services/device-manager';
import RendererService from 'potber-client/services/renderer';
import SettingsService, { Gestures } from 'potber-client/services/settings';
import ThreadStore from 'potber-client/services/stores/thread';
import SkeletonPost from '../skeleton-post';
import UnreadPostsSeparator from '../unread-posts-separator';

interface Signature {
  Args: {
    thread: Threads.Read | null;
    lastReadPost?: string;
    loading?: boolean;
  };
}

export default class ThreadPage extends Component<Signature> {
  @service declare deviceManager: DeviceManagerService;
  @service declare settings: SettingsService;
  @service declare renderer: RendererService;
  @service('stores/thread') declare threadStore: ThreadStore;

  get isDesktop() {
    return this.deviceManager.isDesktop;
  }

  get thread() {
    return this.args.thread;
  }

  get posts() {
    return this.thread?.page?.posts ?? [];
  }

  isPostSubtle = (post: Post) =>
    Boolean(
      getIsPostSubtle([
        post,
        this.args.lastReadPost ?? '',
        this.settings.getSetting('darkenReadPosts'),
      ]),
    );

  get disableOverscroll() {
    return (
      this.settings.getSetting('gestures') === Gestures.none ||
      this.settings.getSetting('gestures') === Gestures.onlySidebar
    );
  }

  handleOverscroll = () => {
    this.renderer.preventNextScrollReset();
    this.renderer.showLoadingIndicator();
    this.threadStore.reload()?.finally(() => {
      this.renderer.hideLoadingIndicator();
      this.renderer.waitAndScrollToBottom();
    });
  };

  <template>
    <div class='thread-page'>
      {{#unless @loading}}
        {{#if this.thread}}
          <OverscrollContainer
            @direction='up'
            @disabled={{this.disableOverscroll}}
            @onOverscroll={{this.handleOverscroll}}
          >
            {{#each this.posts key='id' as |post|}}
              <BoardPost
                @post={{post}}
                @thread={{this.thread}}
                @subtle={{this.isPostSubtle post}}
              />
              {{#if (eq @lastReadPost post.id)}}
                <UnreadPostsSeparator
                  @post={{post}}
                  @posts={{this.posts}}
                  @thread={{this.thread}}
                />
              {{/if}}
              {{#if (isFinalElement post this.posts)}}
                <UpdateScrollPosition />
              {{/if}}
            {{/each}}
          </OverscrollContainer>
        {{/if}}
      {{else}}
        <SkeletonPost />
        <SkeletonPost />
        <SkeletonPost />
        <SkeletonPost />
        <SkeletonPost />
        {{#if this.isDesktop}}
          <SkeletonPost />
          <SkeletonPost />
          <SkeletonPost />
          <SkeletonPost />
          <SkeletonPost />
        {{/if}}
      {{/unless}}
    </div>
  </template>
}
