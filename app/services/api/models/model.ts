import { tracked } from '@glimmer/tracking';
import ApiService from 'potber-client/services/api';

export interface IModel {
  delete: () => void;
}

export class Model {
  protected readonly api: ApiService;
  @tracked protected _isSaving = false;
  @tracked protected _isDeleted = false;

  get isSaving() {
    return this._isSaving;
  }

  get isDeleted() {
    return this._isDeleted;
  }

  /**
   * Marks the model as being in the process of sending a state to the server.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  save(...args: any[]) {
    this._isSaving = true;
  }

  /**
   * Marks the model as deleted.
   */
  delete() {
    this._isDeleted = true;
  }

  constructor(api: ApiService) {
    this.api = api;
  }
}
