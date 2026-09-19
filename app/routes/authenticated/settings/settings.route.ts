import { action } from '@ember/object';
import Route from '@ember/routing/route';
import { service } from '@ember/service';
import RendererService from 'potber-client/services/renderer';
import SessionService from 'potber-client/services/session';
import type { Session } from 'potber-client/services/api/types/session';

export interface SettingsRouteModel {
  session: Session | null;
}

export default class SettingsRoute extends Route {
  @service declare session: SessionService;
  @service declare renderer: RendererService;

  async model(): Promise<SettingsRouteModel> {
    if (!this.session.sessionData) await this.session.update();
    return { session: this.session.sessionData };
  }

  @action didTransition() {
    this.renderer.trySetScrollPosition();
  }
}
