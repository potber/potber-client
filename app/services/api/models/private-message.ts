import { Model } from './model';
import { PrivateMessages } from '../types';
import ApiService from 'potber-client/services/api';
import type {
  PrivateMessageFolder,
  RecipientOrSender,
} from '../types/private-messages';
import { tracked } from '@glimmer/tracking';

interface PrivateMessageDependencies {
  api: ApiService;
  refreshUnread?: () => void | Promise<void>;
}

export class PrivateMessage extends Model implements PrivateMessages.Read {
  id!: string;
  title!: string;
  date!: string;
  @tracked folder!: PrivateMessageFolder;
  @tracked unread!: boolean;
  important!: boolean;
  recipient?: RecipientOrSender;
  sender?: RecipientOrSender;
  content?: string;
  private readonly refreshUnread?: () => void | Promise<void>;

  constructor(
    init: PrivateMessages.Read,
    dependencies: PrivateMessageDependencies,
  ) {
    super(dependencies.api);
    this.refreshUnread = dependencies.refreshUnread;
    Object.assign(this, init);
  }

  /**
   * Marks the private message as read.
   */
  async markAsUnread(): Promise<void> {
    await this.api.markPrivateMessageAsUnread(this.id);
    this.unread = true;
    await this.refreshUnread?.();
  }

  async moveToFolder(folder: PrivateMessageFolder): Promise<void> {
    await this.api.movePrivateMessageToFolder(this.id, folder);
    this.folder = folder;
  }

  /**
   * Deletes the private message.
   */
  async delete(): Promise<void> {
    await this.api.deletePrivateMessage(this.id);
    super.delete();
  }
}

export class NewPrivateMessage extends Model implements PrivateMessages.Create {
  title = '';
  content = '';
  recipientName = '';
  saveCopy = true;

  constructor(api: ApiService, init?: Partial<PrivateMessages.Create>) {
    super(api);
    if (init) Object.assign(this, init);
  }

  /**
   * Sends the private message.
   */
  async save(): Promise<void> {
    super.save();
    try {
      await this.api.createPrivateMessage(this, { timeoutWarning: true });
      this._isSaving = false;
    } catch (error) {
      this._isSaving = false;
      throw error;
    }
  }
}
