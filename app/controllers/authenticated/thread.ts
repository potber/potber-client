import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import type { ThreadRouteModel } from 'potber-client/routes/authenticated/thread';
import SettingsService from 'potber-client/services/settings';
import ThreadStore from 'potber-client/services/stores/thread';

export default class ThreadController extends Controller {
  @service('stores/thread' as any) declare threadStore: ThreadStore;
  @service declare settings: SettingsService;
  declare model: ThreadRouteModel;

  queryParams = ['TID', 'page', 'PID', 'lastReadPost', 'scrollToBottom'];
  @tracked TID = '';
  @tracked page = '';
  @tracked PID = '';
  @tracked lastReadPost = '';
  @tracked scrollToBottom = '';

  get showSkeletonPage() {
    return (
      this.settings.getSetting('transitions') === 'dynamic' &&
      this.threadStore.currentThreadState?.isLoading &&
      !this.threadStore.isReloading
    );
  }

  get currentOrPreviousThread() {
    return (
      this.threadStore.currentThread ?? this.threadStore.previousThread ?? null
    );
  }

  get currentPage() {
    return this.model.page ?? this.currentOrPreviousThread?.page?.number;
  }

  get pageTitle() {
    if (this.currentOrPreviousThread)
      return `${this.currentOrPreviousThread.title} [${
        this.currentPage ?? '..'
      }]`;
  }

  get isError() {
    return this.threadStore.currentThreadState?.isError;
  }
}
