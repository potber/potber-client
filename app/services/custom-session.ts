import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import BaseSessionService from 'ember-simple-auth/services/session';
import { ApiError } from './api/error';
import type { Session } from './api/types/session';
import type ApiService from './api';

/**
 * Ember Simple Auth's persisted session data. The `authenticated` record comes from the
 * session cookie, so its values stay `unknown` until a reader checks them.
 */
export interface SessionData {
  authenticated: {
    authenticator: string;
    access_token?: unknown;
    [key: string]: unknown;
  };
}

export default class CustomSession extends BaseSessionService<SessionData> {
  @service declare api: ApiService;
  @tracked sessionData: Session | null = null;

  /**
   * The bearer token for forum and Imgpot requests, or `undefined` when signed out.
   * Read credentials here instead of reaching into Ember Simple Auth's session data.
   */
  get accessToken(): string | undefined {
    if (!this.isAuthenticated) return undefined;
    const token = this.data?.authenticated?.access_token;
    return typeof token === 'string' && token !== '' ? token : undefined;
  }

  async getSessionData() {
    if (!this.sessionData) {
      await this.update();
    }
    return this.sessionData;
  }

  /**
   * Reloads forum session data. Only HTTP 401 signs the user out. Other failures (network
   * errors, timeouts, 5xx, unexpected payloads) keep the user signed in and leave `sessionData`
   * as it was, which is `null` on first load. `ApiService` already logs and reports them.
   */
  async update() {
    if (!this.isAuthenticated) {
      this.sessionData = null;
    } else {
      try {
        this.sessionData = await this.api.getSession();
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 401) {
          this.invalidate();
        }
      }
    }
  }

  /**
   * Replaces Ember Simple Auth's post-sign-in redirect: the `auth.callback` route sends the
   * user to the home page after `authenticate()` resolves.
   */
  async handleAuthentication() {
    await this.update();
  }
}
