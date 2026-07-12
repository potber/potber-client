import { service } from '@ember/service';
import Modifier from 'ember-modifier';
import RendererService from 'potber-client/services/renderer';
import { getAnchorId } from 'potber-client/utils/misc';

const QUOTE_HEADER_SELECTOR = 'a.quote-header';

interface QuoteNavigationSignature {
  Element: HTMLElement;
  Args: {
    Named: Record<string, never>;
    Positional: [];
  };
}

export default class QuoteNavigationModifier extends Modifier<QuoteNavigationSignature> {
  @service declare renderer: RendererService;

  modify(element: QuoteNavigationSignature['Element']) {
    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) {
        return;
      }

      const header = event.target.closest<HTMLAnchorElement>(
        QUOTE_HEADER_SELECTOR,
      );
      if (!header || !element.contains(header)) {
        return;
      }

      const postId = new URL(
        header.href,
        window.location.href,
      ).searchParams.get('PID');
      if (!postId) {
        return;
      }

      const post = document.getElementById(getAnchorId(postId));
      if (
        post &&
        this.renderer.scrollToElement(post, {
          highlight: true,
        })
      ) {
        event.preventDefault();
      }
    };

    element.addEventListener('click', handleClick);

    return () => {
      element.removeEventListener('click', handleClick);
    };
  }
}
