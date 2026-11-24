import ButtonLink from 'potber-client/components/common/button-link';
import type { Signature as ButtonLinkSignature } from 'potber-client/components/common/button-link';
import type { TOC } from '@ember/component/template-only';

interface Signature extends Omit<ButtonLinkSignature, 'Args'> {
  Args: Omit<ButtonLinkSignature['Args'], 'disabledClass'>;
}

const ControlLink: TOC<Signature> = <template>
  <ButtonLink
    @route={{@route}}
    @model={{@model}}
    @query={{@query}}
    @size={{@size}}
    @variant={{@variant}}
    @disabled={{@disabled}}
    @disabledClass='button-link-disabled'
    @iconSize={{@iconSize}}
    @onClick={{@onClick}}
    ...attributes
  >
    {{yield}}
  </ButtonLink>
</template>;

export default ControlLink;
