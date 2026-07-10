import { modifier } from 'ember-modifier';
import { renderTexPlaceholders } from 'potber-client/services/content-parser/tex';

interface RenderTexSignature {
  Element: HTMLElement;
  Args: {
    Named: Record<string, never>;
    Positional: [string | null | undefined];
  };
}

export default modifier<RenderTexSignature>((element) => {
  void renderTexPlaceholders(element);
});
