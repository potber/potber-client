import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type Transition from '@ember/routing/transition';
import RendererService from 'potber-client/services/renderer';

/**
 * SlowRoute will display a loading indicator on all transitions and model reloads and
 * can be inherited from if a route's model hooks do not resolve immideately.
 * When overriding beforeModel(), remember to call super().
 */
export default class SlowRoute extends Route {
  @service declare renderer: RendererService;

  beforeModel(transition: Transition) {
    this.renderer.showLoadingIndicator();
    void transition.promise?.finally(() => {
      this.renderer.hideLoadingIndicator();
    });
  }
}
