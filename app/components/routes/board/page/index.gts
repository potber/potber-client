import isFinalElement from 'potber-client/helpers/is-final-element';
import { service } from '@ember/service';
import RouterService from '@ember/routing/router-service';
import Component from '@glimmer/component';
import SettingsService, { Gestures } from 'potber-client/services/settings';
import styles from './styles.module.css';
import classNames from 'potber-client/helpers/class-names';
import UpdateScrollPositionComponent from 'potber-client/components/misc/update-scroll-position';
import OverscrollContainer from 'potber-client/components/features/gestures/overscroll-container';
import BoardItem from '../item';
import { Boards } from 'potber-client/services/api/types';

interface Signature {
  Args: {
    board: Boards.Read;
  };
}

export default class BoardPage extends Component<Signature> {
  @service declare router: RouterService;
  @service declare settings: SettingsService;

  styles = styles;

  get threads() {
    return this.args.board.page.threads;
  }

  get disableOverscroll() {
    return (
      this.settings.getSetting('gestures') === Gestures.none ||
      this.settings.getSetting('gestures') === Gestures.onlySidebar
    );
  }

  handleOverscroll = () => {
    this.router.refresh('authenticated.board');
  };

  <template>
    <div class={{classNames this 'page'}}>
      <OverscrollContainer
        @direction='down'
        @disabled={{this.disableOverscroll}}
        @onOverscroll={{this.handleOverscroll}}
      >
        {{#each this.threads as |thread|}}
          <BoardItem @thread={{thread}} />
          {{#if (isFinalElement thread this.threads)}}
            <UpdateScrollPositionComponent />
          {{/if}}
        {{/each}}
      </OverscrollContainer>
    </div>
  </template>
}
