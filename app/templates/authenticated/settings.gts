import type { TemplateOnlyComponent } from '@ember/component/template-only';
import { fn } from '@ember/helper';
import FaIcon from '@fortawesome/ember-fontawesome/components/fa-icon';
import { pageTitle } from 'ember-page-title';
import formatMessage from 'ember-intl/helpers/format-message';
import t from 'ember-intl/helpers/t';

import Blocklist from 'potber-client/components/features/blocklist';
import Container from 'potber-client/components/common/container';
import Button from 'potber-client/components/common/control/button';
import Dropdown from 'potber-client/components/common/control/dropdown';
import InfoButton from 'potber-client/components/common/control/info-button';
import ControlLink from 'potber-client/components/common/control/link';
import NavGeneric from 'potber-client/components/nav/routes/generic';
import type SettingsController from 'potber-client/controllers/authenticated/settings';
import type { SettingsRouteModel } from 'potber-client/routes/authenticated/settings';

interface Signature {
  Args: {
    controller: SettingsController;
    model: SettingsRouteModel;
  };
}

export default <template>
  {{pageTitle (t 'route.settings.title')}}

  <NavGeneric @title={{t 'route.settings.title'}} />

  <Container @size='medium'>

    <h3>{{t 'route.settings.category.appearance'}}</h3>

    <Dropdown
      @options={{@controller.config.themeOptions}}
      @default={{@controller.currentOptions.currentThemeOption}}
      @onSelect={{@controller.handleThemeSelect}}
      @size='max'
      @label={{t 'route.settings.theme.label'}}
    >
      <:info>
        <InfoButton
          @title={{t 'route.settings.theme.label'}}
          @text={{t 'route.settings.theme.info'}}
        />
      </:info>
    </Dropdown>

    <Dropdown
      @options={{@controller.config.sidebarLayoutOptions}}
      @default={{@controller.currentOptions.currentSidebarLayoutOption}}
      @onSelect={{@controller.handleSidebarLayoutSelect}}
      @size='max'
      @label={{t 'route.settings.sidebar.label'}}
    >
      <:info>
        <InfoButton
          @title={{t 'route.settings.sidebar.label'}}
          @text={{t 'route.settings.sidebar.info'}}
        />
      </:info>
    </Dropdown>

    <Dropdown
      @options={{@controller.config.fontSizeOptions}}
      @default={{@controller.currentOptions.currentFontSizeOption}}
      @onSelect={{@controller.handleFontSizeSelect}}
      @size='max'
      @label={{t 'route.settings.font-size.label'}}
    >
      <:info>
        <InfoButton
          @title={{t 'route.settings.font-size.label'}}
          @text={{t 'route.settings.font-size.info'}}
        />
      </:info>
    </Dropdown>

    <Dropdown
      @options={{@controller.config.darkenReadPostsOptions}}
      @default={{@controller.currentOptions.currentDarkenReadPostsOption}}
      @onSelect={{fn @controller.handleSettingSelect 'darkenReadPosts'}}
      @size='max'
      @label={{t 'route.settings.darken-read-posts.label'}}
    >
      <:info>
        <InfoButton
          @title={{t 'route.settings.darken-read-posts.label'}}
          @text={{t 'route.settings.darken-read-posts.info'}}
        />
      </:info>
    </Dropdown>

    <Dropdown
      @options={{@controller.config.hideGlobalAndAnnouncementThreadsOptions}}
      @default={{@controller.currentOptions.currentHideGlobalAndAnnouncementThreadsOption}}
      @onSelect={{fn
        @controller.handleSettingSelect
        'hideGlobalAndAnnouncementThreads'
      }}
      @size='max'
      @label={{t 'route.settings.hide-global-and-announcement-threads.label'}}
    >
      <:info>
        <InfoButton
          @title={{t
            'route.settings.hide-global-and-announcement-threads.label'
          }}
          @text={{t 'route.settings.hide-global-and-announcement-threads.info'}}
        />
      </:info>
    </Dropdown>

    <h3>{{t 'route.settings.category.network'}}</h3>

    <Dropdown
      @options={{@controller.config.avatarStyleOptions}}
      @default={{@controller.currentOptions.currentAvatarStyleOption}}
      @onSelect={{fn @controller.handleSettingSelect 'avatarStyle'}}
      @size='max'
      @label={{t 'route.settings.avatar-style.label'}}
    >
      <:info>
        <InfoButton
          @title={{t 'route.settings.avatar-style.label'}}
          @text={{t 'route.settings.avatar-style.info'}}
        />
      </:info>
    </Dropdown>

    <Dropdown
      @options={{@controller.config.autoRefreshSidebarOptions}}
      @default={{@controller.currentOptions.currentAutoRefreshSidebarOption}}
      @onSelect={{@controller.handleAutoRefreshSidebarSelect}}
      @size='max'
      @label={{t 'route.settings.auto-refresh-sidebar.label'}}
    >
      <:info>
        <InfoButton
          @title={{t 'route.settings.auto-refresh-sidebar.label'}}
          @text={{t 'route.settings.auto-refresh-sidebar.info'}}
        />
      </:info>
    </Dropdown>

    <h3>{{t 'route.settings.category.behavior'}}</h3>

    <Dropdown
      @options={{@controller.config.landingPageOptions}}
      @default={{@controller.currentOptions.currentLandingPageOption}}
      @onSelect={{fn @controller.handleSettingSelect 'landingPage'}}
      @size='max'
      @label={{t 'route.settings.landing-page.label'}}
    >
      <:info>
        <InfoButton
          @title={{t 'route.settings.landing-page.label'}}
          @text={{t 'route.settings.landing-page.info'}}
        />
      </:info>
    </Dropdown>

    <Dropdown
      @options={{@controller.config.transitionsOptions}}
      @default={{@controller.currentOptions.currentTransitionsOption}}
      @onSelect={{fn @controller.handleSettingSelect 'transitions'}}
      @size='max'
      @label={{t 'route.settings.transitions.label'}}
    >
      <:info>
        <InfoButton
          @title={{t 'route.settings.transitions.label'}}
          @text={{t 'route.settings.transitions.info'}}
        />
      </:info>
    </Dropdown>

    <Dropdown
      @options={{@controller.config.replaceForumUrlsOptions}}
      @default={{@controller.currentOptions.currentReplaceForumUrlsOption}}
      @onSelect={{fn @controller.handleSettingSelect 'replaceForumUrls'}}
      @size='max'
      @label={{t 'route.settings.replace-forum-urls.label'}}
    >
      <:info>
        <InfoButton
          @title={{t 'route.settings.replace-forum-urls.label'}}
          @text={{t 'route.settings.replace-forum-urls.info'}}
        />
      </:info>
    </Dropdown>

    <Dropdown
      @options={{@controller.config.goToBottomOfThreadPageOptions}}
      @default={{@controller.currentOptions.currentGoToBottomOfThreadPageOption}}
      @onSelect={{fn @controller.handleSettingSelect 'goToBottomOfThreadPage'}}
      @size='max'
      @label={{t 'route.settings.go-to-bottom-of-thread-page.label'}}
    >
      <:info>
        <InfoButton
          @title={{t 'route.settings.go-to-bottom-of-thread-page.label'}}
          @text={{t 'route.settings.go-to-bottom-of-thread-page.info'}}
        />
      </:info>
    </Dropdown>

    <Dropdown
      @options={{@controller.config.collapseQuotesOptions}}
      @default={{@controller.currentOptions.currentCollapseQuotesOption}}
      @onSelect={{fn @controller.handleSettingSelect 'collapseQuotes'}}
      @size='max'
      @label={{t 'route.settings.collapse-quotes.label'}}
    >
      <:info>
        <InfoButton
          @title={{t 'route.settings.collapse-quotes.label'}}
          @text={{t 'route.settings.collapse-quotes.info'}}
        />
      </:info>
    </Dropdown>

    <Dropdown
      @options={{@controller.config.gesturesOptions}}
      @default={{@controller.currentOptions.currentGesturesOption}}
      @onSelect={{@controller.handleGesturesSelect}}
      @size='max'
      @label={{t 'route.settings.enable-gestures.label'}}
    >
      <:info>
        <InfoButton
          @title={{t 'route.settings.enable-gestures.label'}}
          @text={{formatMessage
            'route.settings.enable-gestures.info'
            htmlSafe=true
          }}
        />
      </:info>
    </Dropdown>

    <div class='flex-row align-items-center'>
      <h3 class='margin-horizontal-x-small'>{{t 'feature.blocklist.title'}}</h3>
      <InfoButton
        @title={{t 'feature.blocklist.title'}}
        @text={{t 'feature.blocklist.description'}}
        @variant='secondary-transparent'
        @icon='info-circle'
      />
    </div>

    <Blocklist />

    <div class='flex-row align-items-center'>
      <h3 class='margin-horizontal-x-small'>
        {{t 'route.settings.category.sync'}}
      </h3>
      <InfoButton
        @title={{t 'route.settings.category.sync'}}
        @text={{t 'route.settings.sync.description'}}
        @variant='secondary-transparent'
        @icon='info-circle'
      />
    </div>
    <p>
      <strong>{{t 'route.settings.sync.status.label'}}:</strong>
      {{@controller.syncStatusLabel}}
    </p>

    {{#if @controller.settingsSync.lastError}}
      <p>{{t 'route.settings.sync.last-error'}}</p>
    {{/if}}

    <div class='settings-sync-actions margin-vertical-x-small'>
      {{#if @controller.syncIsDisabled}}
        <Button
          @text={{t 'route.settings.sync.enable'}}
          @icon='lock'
          @variant='primary'
          @size='large'
          @busy={{@controller.syncActionBusy}}
          @onClick={{@controller.handleEnableSync}}
          data-test-settings-sync-enable
        />
      {{else if @controller.syncIsLocked}}
        <Button
          @text={{t 'route.settings.sync.unlock.submit'}}
          @icon='key'
          @variant='primary'
          @size='large'
          @busy={{@controller.syncActionBusy}}
          @onClick={{@controller.handleUnlockSync}}
          data-test-settings-sync-unlock
        />
        <Button
          @text={{t 'route.settings.sync.delete.submit'}}
          @icon='trash'
          @variant='secondary'
          @size='large'
          @busy={{@controller.syncActionBusy}}
          @onClick={{@controller.handleDeleteSync}}
          data-test-settings-sync-delete
        />
      {{else if @controller.syncIsEnabled}}
        <Button
          @text={{t 'route.settings.sync.forget.submit'}}
          @icon='key'
          @variant='primary'
          @size='large'
          @busy={{@controller.syncActionBusy}}
          @onClick={{@controller.handleForgetSyncKey}}
          data-test-settings-sync-forget
        />
        <Button
          @text={{t 'route.settings.sync.delete.submit'}}
          @icon='trash'
          @variant='secondary'
          @size='large'
          @busy={{@controller.syncActionBusy}}
          @onClick={{@controller.handleDeleteSync}}
          data-test-settings-sync-delete
        />
      {{else if @controller.syncIsUnavailable}}
        <Button
          @text={{t 'route.settings.sync.retry'}}
          @icon='arrows-rotate'
          @variant='primary'
          @size='large'
          @busy={{@controller.syncActionBusy}}
          @onClick={{@controller.handleRetrySync}}
          data-test-settings-sync-retry
        />
      {{/if}}
    </div>

    <h3>{{t 'route.settings.category.advanced'}}</h3>

    <Dropdown
      @options={{@controller.config.debugOptions}}
      @default={{@controller.currentOptions.currentDebugOption}}
      @onSelect={{@controller.handleDebugSelect}}
      @size='max'
      @label={{t 'route.settings.debug.label'}}
    >
      <:info>
        <InfoButton
          @title={{t 'route.settings.debug.label'}}
          @text={{t 'route.settings.debug.info'}}
        />
      </:info>
    </Dropdown>

    <hr />

    <div class='settings-app-actions'>
      <Button
        @text={{t 'route.settings.refresh-app'}}
        @icon='arrows-rotate'
        @variant='primary'
        @size='large'
        @onClick={{@controller.handleRefreshApp}}
        data-test-refresh-app
      />

      <ControlLink @route='applog' @size='large' @variant='primary'>
        <FaIcon @icon='rectangle-list' />
        <p>{{t 'route.applog.title'}}</p>
      </ControlLink>

      <ControlLink @route='changelog' @size='large' @variant='primary'>
        <FaIcon @icon='star' @prefix='fas' />
        <p>{{t 'route.changelog.title'}}</p>
      </ControlLink>

      <ControlLink @route='about' @size='large' @variant='primary'>
        <FaIcon @icon='info-circle' @prefix='fas' />
        <p>{{t 'route.about.title'}}</p>
      </ControlLink>
    </div>

    <hr />

    <h3>{{t 'route.settings.session.title'}}</h3>
    {{#if @model.session}}
      <p class='no-margin'>{{t 'route.settings.session.user-id'}}:
        {{@model.session.userId}}</p>
      <p>{{t 'route.settings.session.username'}}:
        {{@model.session.username}}</p>
    {{/if}}
    <Button
      @text={{t 'route.settings.session.sign-out'}}
      @icon='right-from-bracket'
      @variant='primary'
      @size='large'
      @onClick={{@controller.handleSignOut}}
    />

  </Container>
</template> satisfies TemplateOnlyComponent<Signature>;
