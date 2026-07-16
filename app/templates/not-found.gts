import type { TemplateOnlyComponent } from '@ember/component/template-only';
import NotFound from 'potber-client/components/misc/error/not-found';

export default <template>
  <NotFound />
</template> satisfies TemplateOnlyComponent<{
  Args: { model: unknown; controller: unknown };
}>;
