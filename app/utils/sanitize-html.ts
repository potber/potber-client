import DOMPurify from 'dompurify';

const URL_ATTRIBUTES = ['href', 'src'] as const;
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

function parseAllowedUrl(value: string): URL | null {
  try {
    const url = new URL(value, window.location.origin);
    return ALLOWED_PROTOCOLS.has(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

function sanitizeUrls(fragment: DocumentFragment) {
  for (const element of fragment.querySelectorAll<HTMLElement>(
    '[href], [src]',
  )) {
    for (const attribute of URL_ATTRIBUTES) {
      if (!element.hasAttribute(attribute)) continue;

      const value = element.getAttribute(attribute);
      if (!value || !parseAllowedUrl(value)) {
        element.removeAttribute(attribute);
      }
    }

    if (element instanceof HTMLIFrameElement) {
      const src = element.getAttribute('src');
      const url = src ? parseAllowedUrl(src) : null;
      if (
        !url ||
        url.protocol !== 'https:' ||
        url.hostname !== 'www.youtube.com' ||
        !url.pathname.startsWith('/embed/')
      ) {
        element.remove();
      }
    }

    if (
      element instanceof HTMLAnchorElement &&
      element.target.toLowerCase() === '_blank'
    ) {
      element.rel = 'noopener noreferrer';
    }
  }
}

/**
 * Sanitizes parser-generated or upstream HTML immediately before it is marked
 * as trusted for rendering.
 */
export function sanitizeHtml(input: string): string {
  const fragment = DOMPurify.sanitize(input, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: [
      'allow',
      'autoplay',
      'controls',
      'frameborder',
      'loop',
      'muted',
      'playsinline',
      'target',
    ],
    ALLOW_UNKNOWN_PROTOCOLS: false,
    FORBID_ATTR: ['style'],
    FORBID_TAGS: ['embed', 'form', 'object', 'script', 'style'],
    RETURN_DOM_FRAGMENT: true,
    SANITIZE_NAMED_PROPS: true,
  });

  sanitizeUrls(fragment);

  const container = document.createElement('div');
  container.append(fragment);
  return container.innerHTML;
}
