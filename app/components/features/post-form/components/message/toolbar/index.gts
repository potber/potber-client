import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import lt from 'ember-truth-helpers/helpers/lt';
import not from 'ember-truth-helpers/helpers/not';
import { t } from 'ember-intl';
import Menu from 'potber-client/components/common/control/menu';
import classNames from 'potber-client/helpers/class-names';
import postFormToolbarOverflow from 'potber-client/modifiers/post-form-toolbar-overflow';
import { Posts, Threads } from 'potber-client/services/api/types';
import styles from '../styles.module.css';
import PostFormMessageEmojiSelect from './controls/emoji-select';
import PostFormMessageImage from './controls/image';
import PostFormMessageLink from './controls/link';
import PostFormMessageList from './controls/list';
import PostFormMessageMemeSelect from './controls/meme-select';
import PostFormMessageSimpleInput from './controls/simple-input';
import PostFormMessageSimpleTag from './controls/simple-tag';

const ACTION_COUNT = 16;

interface Signature {
  post: Posts.Write | Threads.OpeningPost;
  textarea: HTMLTextAreaElement;
}

export default class PostFormMessageToolbar extends Component<Signature> {
  @tracked visibleActionCount = ACTION_COUNT - 1;
  @tracked isReady = false;

  styles = styles;

  get hasOverflow() {
    return this.visibleActionCount < ACTION_COUNT;
  }

  setVisibleActionCount = (count: number) => {
    this.visibleActionCount = count;
    this.isReady = true;
  };

  <template>
    <div class={{classNames this 'toolbar-container'}}>
      <div
        class={{classNames this 'toolbar'}}
        role='toolbar'
        data-ready={{if this.isReady 'true' 'false'}}
        {{postFormToolbarOverflow this.setVisibleActionCount}}
      >
        <span
          class={{classNames this 'toolbar-action'}}
          data-toolbar-action='emojis'
          data-overflow={{if (lt this.visibleActionCount 1) 'true' 'false'}}
        >
          <PostFormMessageEmojiSelect @post={{@post}} @textarea={{@textarea}} />
        </span>
        <span
          class={{classNames this 'toolbar-action'}}
          data-toolbar-action='memes'
          data-overflow={{if (lt this.visibleActionCount 2) 'true' 'false'}}
        >
          <PostFormMessageMemeSelect @post={{@post}} @textarea={{@textarea}} />
        </span>
        <span
          class={{classNames this 'toolbar-action'}}
          data-toolbar-action='bold'
          data-overflow={{if (lt this.visibleActionCount 3) 'true' 'false'}}
        >
          <PostFormMessageSimpleTag
            @text={{t 'feature.post-form.message.toolbar.bold'}}
            @icon='bold'
            @opening='[b]'
            @closing='[/b]'
            @textarea={{@textarea}}
            @post={{@post}}
          />
        </span>
        <span
          class={{classNames this 'toolbar-action'}}
          data-toolbar-action='italic'
          data-overflow={{if (lt this.visibleActionCount 4) 'true' 'false'}}
        >
          <PostFormMessageSimpleTag
            @text={{t 'feature.post-form.message.toolbar.italic'}}
            @icon='italic'
            @opening='[i]'
            @closing='[/i]'
            @textarea={{@textarea}}
            @post={{@post}}
          />
        </span>
        <span
          class={{classNames this 'toolbar-action'}}
          data-toolbar-action='underline'
          data-overflow={{if (lt this.visibleActionCount 5) 'true' 'false'}}
        >
          <PostFormMessageSimpleTag
            @text={{t 'feature.post-form.message.toolbar.underline'}}
            @icon='underline'
            @opening='[u]'
            @closing='[/u]'
            @textarea={{@textarea}}
            @post={{@post}}
          />
        </span>
        <span
          class={{classNames this 'toolbar-action'}}
          data-toolbar-action='strikethrough'
          data-overflow={{if (lt this.visibleActionCount 6) 'true' 'false'}}
        >
          <PostFormMessageSimpleTag
            @text={{t 'feature.post-form.message.toolbar.strikethrough'}}
            @icon='strikethrough'
            @opening='[s]'
            @closing='[/s]'
            @textarea={{@textarea}}
            @post={{@post}}
          />
        </span>
        <span
          class={{classNames this 'toolbar-action'}}
          data-toolbar-action='mono'
          data-overflow={{if (lt this.visibleActionCount 7) 'true' 'false'}}
        >
          <PostFormMessageSimpleTag
            @text={{t 'feature.post-form.message.toolbar.mono'}}
            @icon='m'
            @opening='[m]'
            @closing='[/m]'
            @textarea={{@textarea}}
            @post={{@post}}
          />
        </span>
        <span
          class={{classNames this 'toolbar-action'}}
          data-toolbar-action='tex'
          data-overflow={{if (lt this.visibleActionCount 8) 'true' 'false'}}
        >
          <PostFormMessageSimpleTag
            @text={{t 'feature.post-form.message.toolbar.tex'}}
            @icon='t'
            @opening='[tex]'
            @closing='[/tex]'
            @textarea={{@textarea}}
            @post={{@post}}
          />
        </span>
        <span
          class={{classNames this 'toolbar-action'}}
          data-toolbar-action='trigger'
          data-overflow={{if (lt this.visibleActionCount 9) 'true' 'false'}}
        >
          <PostFormMessageSimpleTag
            @text={{t 'feature.post-form.message.toolbar.trigger'}}
            @icon='magnifying-glass-minus'
            @opening='[trigger]'
            @closing='[/trigger]'
            @textarea={{@textarea}}
            @post={{@post}}
          />
        </span>
        <span
          class={{classNames this 'toolbar-action'}}
          data-toolbar-action='link'
          data-overflow={{if (lt this.visibleActionCount 10) 'true' 'false'}}
        >
          <PostFormMessageLink @post={{@post}} @textarea={{@textarea}} />
        </span>
        <span
          class={{classNames this 'toolbar-action'}}
          data-toolbar-action='list'
          data-overflow={{if (lt this.visibleActionCount 11) 'true' 'false'}}
        >
          <PostFormMessageList @post={{@post}} @textarea={{@textarea}} />
        </span>
        <span
          class={{classNames this 'toolbar-action'}}
          data-toolbar-action='image'
          data-overflow={{if (lt this.visibleActionCount 12) 'true' 'false'}}
        >
          <PostFormMessageImage @post={{@post}} @textarea={{@textarea}} />
        </span>
        <span
          class={{classNames this 'toolbar-action'}}
          data-toolbar-action='video'
          data-overflow={{if (lt this.visibleActionCount 13) 'true' 'false'}}
        >
          <PostFormMessageSimpleInput
            @title={{t 'feature.post-form.message.toolbar.video.title'}}
            @icon='youtube'
            @label={{t 'feature.post-form.message.toolbar.video.label'}}
            @prefix='fab'
            @opening='[video]'
            @closing='[/video]'
            @type='url'
            @post={{@post}}
            @textarea={{@textarea}}
          />
        </span>
        <span
          class={{classNames this 'toolbar-action'}}
          data-toolbar-action='code'
          data-overflow={{if (lt this.visibleActionCount 14) 'true' 'false'}}
        >
          <PostFormMessageSimpleInput
            @title={{t 'feature.post-form.message.toolbar.code.title'}}
            @icon='code'
            @label={{t 'feature.post-form.message.toolbar.code.label'}}
            @opening='[code]'
            @closing='[/code]'
            @useTextarea={{true}}
            @post={{@post}}
            @textarea={{@textarea}}
          />
        </span>
        <span
          class={{classNames this 'toolbar-action'}}
          data-toolbar-action='quote'
          data-overflow={{if (lt this.visibleActionCount 15) 'true' 'false'}}
        >
          <PostFormMessageSimpleInput
            @title={{t 'feature.post-form.message.toolbar.quote.title'}}
            @icon='quote-right'
            @label={{t 'feature.post-form.message.toolbar.quote.label'}}
            @opening='[quote]'
            @closing='[/quote]'
            @useTextarea={{true}}
            @post={{@post}}
            @textarea={{@textarea}}
          />
        </span>
        <span
          class={{classNames this 'toolbar-action'}}
          data-toolbar-action='spoiler'
          data-overflow={{if (lt this.visibleActionCount 16) 'true' 'false'}}
        >
          <PostFormMessageSimpleInput
            @title={{t 'feature.post-form.message.toolbar.spoiler.title'}}
            @icon='eye-slash'
            @label={{t 'feature.post-form.message.toolbar.spoiler.label'}}
            @opening='[spoiler]'
            @closing='[/spoiler]'
            @useTextarea={{true}}
            @post={{@post}}
            @textarea={{@textarea}}
          />
        </span>

        <span
          class={{classNames this 'overflow-menu'}}
          data-toolbar-overflow
          data-empty={{if (not this.hasOverflow) 'true' 'false'}}
        >
          <Menu
            @position='bottom-left'
            @variant='primary-transparent'
            @icon='ellipsis'
            @title={{t 'feature.post-form.message.toolbar.more'}}
          >
            {{#if (lt this.visibleActionCount 4)}}
              <span class={{classNames this 'menu-section'}}>{{t
                  'feature.post-form.message.toolbar.group.basic'
                }}</span>
              {{#if (lt this.visibleActionCount 1)}}
                <PostFormMessageEmojiSelect
                  @post={{@post}}
                  @textarea={{@textarea}}
                  @menuItem={{true}}
                />
              {{/if}}
              {{#if (lt this.visibleActionCount 2)}}
                <PostFormMessageMemeSelect
                  @post={{@post}}
                  @textarea={{@textarea}}
                  @menuItem={{true}}
                />
              {{/if}}
              {{#if (lt this.visibleActionCount 3)}}
                <PostFormMessageSimpleTag
                  @text={{t 'feature.post-form.message.toolbar.bold'}}
                  @icon='bold'
                  @opening='[b]'
                  @closing='[/b]'
                  @textarea={{@textarea}}
                  @post={{@post}}
                  @menuItem={{true}}
                />
              {{/if}}
              {{#if (lt this.visibleActionCount 4)}}
                <PostFormMessageSimpleTag
                  @text={{t 'feature.post-form.message.toolbar.italic'}}
                  @icon='italic'
                  @opening='[i]'
                  @closing='[/i]'
                  @textarea={{@textarea}}
                  @post={{@post}}
                  @menuItem={{true}}
                />
              {{/if}}
            {{/if}}

            {{#if (lt this.visibleActionCount 10)}}
              <span class={{classNames this 'menu-section'}}>{{t
                  'feature.post-form.message.toolbar.group.text'
                }}</span>
              {{#if (lt this.visibleActionCount 5)}}
                <PostFormMessageSimpleTag
                  @text={{t 'feature.post-form.message.toolbar.underline'}}
                  @icon='underline'
                  @opening='[u]'
                  @closing='[/u]'
                  @textarea={{@textarea}}
                  @post={{@post}}
                  @menuItem={{true}}
                />
              {{/if}}
              {{#if (lt this.visibleActionCount 6)}}
                <PostFormMessageSimpleTag
                  @text={{t 'feature.post-form.message.toolbar.strikethrough'}}
                  @icon='strikethrough'
                  @opening='[s]'
                  @closing='[/s]'
                  @textarea={{@textarea}}
                  @post={{@post}}
                  @menuItem={{true}}
                />
              {{/if}}
              {{#if (lt this.visibleActionCount 7)}}
                <PostFormMessageSimpleTag
                  @text={{t 'feature.post-form.message.toolbar.mono'}}
                  @icon='m'
                  @opening='[m]'
                  @closing='[/m]'
                  @textarea={{@textarea}}
                  @post={{@post}}
                  @menuItem={{true}}
                />
              {{/if}}
              {{#if (lt this.visibleActionCount 8)}}
                <PostFormMessageSimpleTag
                  @text={{t 'feature.post-form.message.toolbar.tex'}}
                  @icon='t'
                  @opening='[tex]'
                  @closing='[/tex]'
                  @textarea={{@textarea}}
                  @post={{@post}}
                  @menuItem={{true}}
                />
              {{/if}}
              {{#if (lt this.visibleActionCount 10)}}
                <PostFormMessageLink
                  @post={{@post}}
                  @textarea={{@textarea}}
                  @menuItem={{true}}
                />
              {{/if}}
            {{/if}}

            {{#if (lt this.visibleActionCount 16)}}
              <span class={{classNames this 'menu-section'}}>{{t
                  'feature.post-form.message.toolbar.group.structure'
                }}</span>
              {{#if (lt this.visibleActionCount 11)}}
                <PostFormMessageList
                  @post={{@post}}
                  @textarea={{@textarea}}
                  @menuItem={{true}}
                />
              {{/if}}
              {{#if (lt this.visibleActionCount 15)}}
                <PostFormMessageSimpleInput
                  @title={{t 'feature.post-form.message.toolbar.quote.title'}}
                  @icon='quote-right'
                  @label={{t 'feature.post-form.message.toolbar.quote.label'}}
                  @opening='[quote]'
                  @closing='[/quote]'
                  @useTextarea={{true}}
                  @post={{@post}}
                  @textarea={{@textarea}}
                  @menuItem={{true}}
                />
              {{/if}}
              {{#if (lt this.visibleActionCount 14)}}
                <PostFormMessageSimpleInput
                  @title={{t 'feature.post-form.message.toolbar.code.title'}}
                  @icon='code'
                  @label={{t 'feature.post-form.message.toolbar.code.label'}}
                  @opening='[code]'
                  @closing='[/code]'
                  @useTextarea={{true}}
                  @post={{@post}}
                  @textarea={{@textarea}}
                  @menuItem={{true}}
                />
              {{/if}}
              {{#if (lt this.visibleActionCount 16)}}
                <PostFormMessageSimpleInput
                  @title={{t 'feature.post-form.message.toolbar.spoiler.title'}}
                  @icon='eye-slash'
                  @label={{t 'feature.post-form.message.toolbar.spoiler.label'}}
                  @opening='[spoiler]'
                  @closing='[/spoiler]'
                  @useTextarea={{true}}
                  @post={{@post}}
                  @textarea={{@textarea}}
                  @menuItem={{true}}
                />
              {{/if}}
            {{/if}}

            {{#if (lt this.visibleActionCount 13)}}
              <span class={{classNames this 'menu-section'}}>{{t
                  'feature.post-form.message.toolbar.group.media'
                }}</span>
              {{#if (lt this.visibleActionCount 12)}}
                <PostFormMessageImage
                  @post={{@post}}
                  @textarea={{@textarea}}
                  @menuItem={{true}}
                />
              {{/if}}
              <PostFormMessageSimpleInput
                @title={{t 'feature.post-form.message.toolbar.video.title'}}
                @icon='youtube'
                @label={{t 'feature.post-form.message.toolbar.video.label'}}
                @prefix='fab'
                @opening='[video]'
                @closing='[/video]'
                @type='url'
                @post={{@post}}
                @textarea={{@textarea}}
                @menuItem={{true}}
              />
            {{/if}}

            {{#if (lt this.visibleActionCount 9)}}
              <span class={{classNames this 'menu-section'}}>{{t
                  'feature.post-form.message.toolbar.group.special'
                }}</span>
              <PostFormMessageSimpleTag
                @text={{t 'feature.post-form.message.toolbar.trigger'}}
                @icon='magnifying-glass-minus'
                @opening='[trigger]'
                @closing='[/trigger]'
                @textarea={{@textarea}}
                @post={{@post}}
                @menuItem={{true}}
              />
            {{/if}}
          </Menu>
        </span>
      </div>
    </div>
  </template>
}
