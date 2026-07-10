import Modifier, { type NamedArgs, type PositionalArgs } from 'ember-modifier';
import { service } from '@ember/service';
import type { BlockedUser } from 'potber-client/services/socials';
import SocialsService from 'potber-client/services/socials';

const MANAGED_MASK_SELECTOR = '[data-blocked-quote-mask="true"]';

interface MaskBlockedQuotesSignature {
  Element: HTMLElement;
  Args: {
    Named: {
      className: string;
    };
    Positional: [];
  };
}

export default class MaskBlockedQuotesModifier extends Modifier<MaskBlockedQuotesSignature> {
  @service declare socials: SocialsService;

  modify(
    element: MaskBlockedQuotesSignature['Element'],
    _positional: PositionalArgs<MaskBlockedQuotesSignature>,
    named: NamedArgs<MaskBlockedQuotesSignature>,
  ) {
    const blockedUsers = this.socials.blockedUsers;

    this.removeManagedMasks(element);

    if (blockedUsers.length === 0) {
      return;
    }

    const quotes = element.querySelectorAll<HTMLElement>('span.quote');

    for (const quote of quotes) {
      const body = quote.querySelector<HTMLElement>('blockquote');
      const authorName = quote.getAttribute('data-author-name');

      if (
        !authorName ||
        !body ||
        !this.isUserBlocked(authorName, blockedUsers)
      ) {
        continue;
      }

      const mask = document.createElement('button');

      mask.type = 'button';
      mask.className = named.className;
      mask.dataset['blockedQuoteMask'] = 'true';
      mask.addEventListener('click', () => {
        mask.remove();
      });

      body.appendChild(mask);
    }
  }

  private isUserBlocked(authorName: string, blockedUsers: BlockedUser[]) {
    return blockedUsers.some((user) => {
      return user.id === authorName || user.name === authorName;
    });
  }

  private removeManagedMasks(element: HTMLElement) {
    const masks = element.querySelectorAll<HTMLElement>(MANAGED_MASK_SELECTOR);

    for (const mask of masks) {
      mask.remove();
    }
  }
}
