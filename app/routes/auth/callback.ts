import Route from '@ember/routing/route';
import RouterService from '@ember/routing/router-service';
import { service } from '@ember/service';
import type IntlService from 'ember-intl/services/intl';
import CustomSession from 'potber-client/services/custom-session';
import MessagesService from 'potber-client/services/messages';

/** Routes that start or finish sign-in; returning to them after sign-in would loop. */
const SIGN_IN_ROUTES = ['login', 'auth'];

export default class AuthCallbackRoute extends Route {
  @service declare session: CustomSession;
  @service declare messages: MessagesService;
  @service declare router: RouterService;
  @service declare intl: IntlService;

  async beforeModel() {
    try {
      const params = new URLSearchParams(
        window.location.hash.startsWith('#')
          ? window.location.hash.substring(1)
          : window.location.hash,
      );
      const hash: Record<string, string> = {};
      for (const entry of params.entries()) {
        const [key, value] = entry;
        hash[key] = value;
      }
      await this.session.authenticate('authenticator:oauth2', hash);
      const redirectTarget = this.takeRedirectTarget();
      if (redirectTarget) {
        this.router.transitionTo(redirectTarget);
      } else {
        this.router.transitionTo('authenticated.home');
      }
    } catch (error) {
      this.messages.logErrorAndNotify(
        this.intl.t('error.unknown'),
        error,
        this.constructor.name,
      );
      this.router.transitionTo('auth.login');
    }
  }

  /**
   * Reads and clears the URL that `requireAuthentication` stored before the OAuth redirect.
   * Returns it only when it is a path inside this app and not a sign-in route.
   */
  private takeRedirectTarget(): string | null {
    const target = this.session.getRedirectTarget();
    this.session.clearRedirectTarget();
    if (!target) return null;

    // Reject absolute and protocol-relative URLs (`//host`, and `/\host`, which browsers treat alike).
    if (!target.startsWith('/') || /^\/[/\\]/.test(target)) return null;
    const { origin } = window.location;
    if (new URL(target, origin).origin !== origin) return null;

    let routeName: string | undefined;
    try {
      routeName = this.router.recognize(target)?.name;
    } catch {
      return null;
    }
    if (!routeName) return null;
    const isSignInRoute = SIGN_IN_ROUTES.some(
      (name) => routeName === name || routeName.startsWith(`${name}.`),
    );
    return isSignInRoute ? null : target;
  }
}
