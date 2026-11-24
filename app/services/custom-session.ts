import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import type CookiesService from 'ember-cookies/services/cookies';
import BaseSessionService from 'ember-simple-auth/services/session';
import { ApiError } from './api/error';
import type { Session } from './api/types/session';
import type ApiService from './api';

export default class CustomSession extends BaseSessionService {
  @service declare api: ApiService;
  @service declare cookies: CookiesService;
  @tracked sessionData: Session | null = null;
  declare data: any;
  declare isAuthenticated?: boolean;
  declare invalidate: () => Promise<void>;
  declare authenticate: (
    authenticator: string,
    hash: Record<string, string>,
  ) => Promise<void>;
  declare setup: () => Promise<void>;
  declare requireAuthentication: (transition: any, routeName: string) => void;
  declare transitionTo: (redirectTarget: any) => void;

  /**
   * The bearer token for forum and Imgpot requests, or `undefined` when signed out.
   * Read credentials here instead of reaching into Ember Simple Auth's session data.
   */
  get accessToken(): string | undefined {
    if (!this.isAuthenticated) return undefined;
    const token: unknown = this.data?.authenticated?.access_token;
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

  async handleAuthentication() {
    // Store session data
    await this.update();
    // We don't want the session service to redirect to a route automatically after
    // successful login, so we override this method.
    const attemptedTransition = this.data.attemptedTransition;
    const redirectTarget = this.cookies.read(
      'ember_simple_auth-redirectTarget',
    );
    if (attemptedTransition) {
      attemptedTransition.retry();
      this.data.attemptedTransition = null;
    } else if (redirectTarget) {
      this.transitionTo(redirectTarget);
      this.cookies.clear('ember_simple_auth-redirectTarget');
    }
  }
}
