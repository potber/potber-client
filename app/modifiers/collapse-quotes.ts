import Modifier, { type NamedArgs, type PositionalArgs } from 'ember-modifier';
import { service } from '@ember/service';
import type IntlService from 'ember-intl/services/intl';
import RendererService from 'potber-client/services/renderer';

const COLLAPSED_CLASS = 'quote-collapsed';
const WITH_HEADER_CLASS = 'quote-has-header';
const TOGGLE_CLASS = 'quote-collapse-toggle';
const MANAGED_TOGGLE_SELECTOR = '[data-quote-collapse-toggle="true"]';

interface CollapseQuotesSignature {
  Element: HTMLElement;
  Args: {
    Named: {
      enabled: boolean;
    };
    Positional: [];
  };
}

export default class CollapseQuotesModifier extends Modifier<CollapseQuotesSignature> {
  @service declare intl: IntlService;
  @service declare renderer: RendererService;

  modify(
    element: CollapseQuotesSignature['Element'],
    _positional: PositionalArgs<CollapseQuotesSignature>,
    named: NamedArgs<CollapseQuotesSignature>,
  ) {
    this.resetQuotes(element);

    if (!named.enabled) {
      return;
    }

    const quotes = element.querySelectorAll<HTMLElement>('span.quote');

    for (const quote of quotes) {
      const body = quote.querySelector<HTMLElement>('blockquote');
      const header = quote.querySelector<HTMLElement>('.quote-header');
      const authorName = quote.getAttribute('data-author-name');

      if (!body || !header || !authorName) {
        continue;
      }

      const toggle = document.createElement('button');

      toggle.type = 'button';
      toggle.className = TOGGLE_CLASS;
      toggle.dataset['quoteCollapseToggle'] = 'true';
      toggle.addEventListener('click', (event) => {
        this.renderer.createClickRipple(event);
        event.preventDefault();
        event.stopPropagation();

        quote.classList.toggle(COLLAPSED_CLASS);
        this.updateToggle(toggle, quote, authorName);
      });

      quote.classList.add(WITH_HEADER_CLASS);
      quote.classList.add(COLLAPSED_CLASS);
      this.updateToggle(toggle, quote, authorName);
      quote.append(toggle);
    }
  }

  private getToggleLabel(authorName: string, collapsed: boolean) {
    const action = collapsed ? 'expand' : 'collapse';

    return this.intl.t(
      `component.board.post.quote-collapse.with-author.${action}`,
      {
        authorName,
      },
    );
  }

  private updateToggle(
    toggle: HTMLButtonElement,
    quote: HTMLElement,
    authorName: string,
  ) {
    const collapsed = quote.classList.contains(COLLAPSED_CLASS);
    const label = this.getToggleLabel(authorName, collapsed);

    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
  }

  private resetQuotes(element: HTMLElement) {
    const quotes = element.querySelectorAll<HTMLElement>('span.quote');

    for (const quote of quotes) {
      quote.classList.remove(COLLAPSED_CLASS);
      quote.classList.remove(WITH_HEADER_CLASS);
    }

    const toggles = element.querySelectorAll<HTMLElement>(
      MANAGED_TOGGLE_SELECTOR,
    );

    for (const toggle of toggles) {
      toggle.remove();
    }
  }
}
