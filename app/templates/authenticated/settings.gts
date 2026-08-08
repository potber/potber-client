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
      @default={{@model.currentThemeOption}}
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
      @default={{@model.currentSidebarLayoutOption}}
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
      @default={{@model.currentFontSizeOption}}
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
      @default={{@model.currentDarkenReadPostsOption}}
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
      @default={{@model.currentHideGlobalAndAnnouncementThreadsOption}}
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
      @default={{@model.currentAvatarStyleOption}}
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
      @default={{@model.currentAutoRefreshSidebarOption}}
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

    <Dropdown
      @options={{@controller.config.appsignalErrorReportingOptions}}
      @default={{@model.currentAppsignalErrorReportingOption}}
      @onSelect={{@controller.handleAppsignalErrorReportingSelect}}
      @size='max'
      @label={{t 'route.settings.appsignal-error-reporting.label'}}
    >
      <:info>
        <InfoButton
          @title={{t 'route.settings.appsignal-error-reporting.label'}}
          @text={{t 'route.settings.appsignal-error-reporting.info'}}
        />
      </:info>
    </Dropdown>

    <h3>{{t 'route.settings.category.behavior'}}</h3>

    <Dropdown
      @options={{@controller.config.landingPageOptions}}
      @default={{@model.currentLandingPageOption}}
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
      @default={{@model.currentTransitionsOption}}
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
      @default={{@model.currentReplaceForumUrlsOption}}
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
      @default={{@model.currentGoToBottomOfThreadPageOption}}
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
      @default={{@model.currentCollapseQuotesOption}}
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
      @default={{@model.currentGesturesOption}}
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

    <h3>{{t 'route.settings.category.advanced'}}</h3>

    <Dropdown
      @options={{@controller.config.debugOptions}}
      @default={{@model.currentDebugOption}}
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

    <Button
      @text={{t 'route.settings.refresh-app'}}
      @icon='arrows-rotate'
      @variant='primary'
      @size='large'
      @onClick={{@controller.handleRefreshApp}}
      class='margin-auto margin-vertical-x-small'
      data-test-refresh-app
    />

    <hr />

    <ControlLink
      @route='applog'
      @size='large'
      @variant='primary'
      class='margin-auto margin-vertical-x-small'
    >
      <FaIcon @icon='rectangle-list' />
      <p>{{t 'route.applog.title'}}</p>
    </ControlLink>

    <ControlLink
      @route='changelog'
      @size='large'
      @variant='primary'
      class='margin-auto margin-vertical-x-small'
    >
      <FaIcon @icon='star' @prefix='fas' />
      <p>{{t 'route.changelog.title'}}</p>
    </ControlLink>

    <ControlLink
      @route='about'
      @size='large'
      @variant='primary'
      class='margin-auto margin-vertical-x-small'
    >
      <FaIcon @icon='info-circle' @prefix='fas' />
      <p>{{t 'route.about.title'}}</p>
    </ControlLink>

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
