const TEX_REGEX = /\[tex.*?\]([\s\S]*?)\[\/tex\]/gi;
const TEX_PLACEHOLDER_SELECTOR = '[data-katex-source]';

type KatexModule = typeof import('katex').default;

let katexLoader: Promise<KatexModule> | undefined;

function encodeTexSource(content: string) {
  return encodeURIComponent(content);
}

function decodeTexSource(content: string) {
  return decodeURIComponent(content);
}

async function loadKatex(): Promise<KatexModule> {
  if (!katexLoader) {
    katexLoader = Promise.all([
      import('katex'),
      import('katex/dist/katex.min.css'),
    ]).then(([katexModule]) => katexModule.default);
  }

  return katexLoader;
}

/**
 * Parses [tex] tags. Does not support tag nesting.
 * @param input The input string.
 * @returns The output string.
 */
export function parseTex(input: string) {
  if (!TEX_REGEX.test(input)) return input;

  return input.replaceAll(TEX_REGEX, (_full, content: string) => {
    if (!content) return '';

    return `<span class="katex-placeholder" data-katex-source="${encodeTexSource(
      content,
    )}"></span>`;
  });
}

/**
 * Renders KaTeX placeholders inside an element.
 * @param element The root element containing placeholders.
 */
export async function renderTexPlaceholders(element: ParentNode) {
  const placeholders = element.querySelectorAll(TEX_PLACEHOLDER_SELECTOR);

  if (placeholders.length === 0) return;

  const katex = await loadKatex();

  for (const placeholder of placeholders) {
    if (!(placeholder instanceof HTMLElement)) continue;
    if (placeholder.dataset['katexRendered'] === 'true') continue;

    const encodedSource = placeholder.dataset['katexSource'];
    if (!encodedSource) continue;

    katex.render(decodeTexSource(encodedSource), placeholder, {
      throwOnError: false,
    });
    placeholder.dataset['katexRendered'] = 'true';
  }
}
