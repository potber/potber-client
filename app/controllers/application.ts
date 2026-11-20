import Controller from '@ember/controller';
import { service } from '@ember/service';
import CustomSession from 'potber-client/services/custom-session';
import RendererService from 'potber-client/services/renderer';
import type ApplicationRoute from 'potber-client/routes/application';

export default class ApplicationController extends Controller {
  declare model: Awaited<ReturnType<ApplicationRoute['model']>>;
  @service declare renderer: RendererService;
  @service declare session: CustomSession;

  get sidebarExpanded() {
    return this.renderer.sidebarExpanded;
  }

  get authenticated() {
    return this.session.isAuthenticated;
  }
}
