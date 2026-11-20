import type { TOC } from '@ember/component/template-only';

interface Signature {
  Args: {
    error: unknown;
  };
}

const formatError = (error: unknown) => String(error);
const formatStack = (error: unknown) =>
  error instanceof Error ? error.stack : undefined;

const StartupFailure: TOC<Signature> = <template>
  <div class='error-container'>
    <h1>Verbindungsfehler</h1>

    <h3>potber konnte sich nicht mit dem Forum verbinden.</h3>
    <p>Bitte prüfe, ob Du mit dem Internet verbunden bist. Falls ja, melde bitte
      den folgenden Fehler:
    </p>

    <p class='subtitle'>{{formatError @error}}</p>
    <p class='subtitle'>
      Stack:
      {{formatStack @error}}
    </p>

  </div>
</template>;

export default StartupFailure;
