import Route from '@ember/routing/route';
import { service } from '@ember/service';
import ApiService from 'potber-client/services/api';
import { BoardCategories } from 'potber-client/services/api/types';

export default class BoardOverviewRoute extends Route {
  @service declare api: ApiService;

  async model(): Promise<BoardCategories.Read[]> {
    return this.api.findAllBoardCategories();
  }
}
