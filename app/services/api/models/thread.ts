import { Model } from './model';
import { Threads } from '../types';
import ApiService from 'potber-client/services/api';

export class WritableThread extends Model implements Threads.Create {
  boardId!: string;
  title!: string;
  tags: string[] = [];
  openingPost: Threads.OpeningPost = {
    title: '',
    message: '',
    icon: '0',
  };

  constructor(api: ApiService, init: Threads.Create) {
    super(api);
    Object.assign(this, init);
  }

  /**
   * Saves the thread to the server.
   */
  async save(): Promise<Threads.Read> {
    super.save();
    this._isSaving = true;
    try {
      const createdThread = await this.api.createThread(this, {
        timeoutWarning: true,
      });
      this._isSaving = false;
      return createdThread;
    } catch (error) {
      this._isSaving = false;
      throw error;
    }
  }
}
