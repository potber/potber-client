import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { NewPrivateMessage } from 'potber-client/services/api/models/private-message';
import ApiService from 'potber-client/services/api';

export interface PrivateMessagesCreateRouteModel {
  message: NewPrivateMessage;
}

export default class PrivateMessagesCreateRoute extends Route {
  @service declare api: ApiService;

  async model() {
    const message = new NewPrivateMessage(this.api);
    return { message };
  }
}
