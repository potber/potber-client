import Modifier from 'ember-modifier';

const ACTION_SELECTOR = '[data-toolbar-action]';
const OVERFLOW_SELECTOR = '[data-toolbar-overflow]';

interface PostFormToolbarOverflowSignature {
  Element: HTMLElement;
  Args: {
    Named: Record<string, never>;
    Positional: [(visibleActionCount: number) => void];
  };
}

export default class PostFormToolbarOverflowModifier extends Modifier<PostFormToolbarOverflowSignature> {
  private actionWidths: number[] = [];
  private overflowWidth = 0;
  private resizeObserver?: ResizeObserver;
  private measureFrame?: number;

  modify(
    element: PostFormToolbarOverflowSignature['Element'],
    [
      setVisibleActionCount,
    ]: PostFormToolbarOverflowSignature['Args']['Positional'],
  ) {
    this.cleanup();

    const scheduleMeasurement = () => {
      if (typeof this.measureFrame === 'number') return;

      this.measureFrame = requestAnimationFrame(() => {
        this.measureFrame = undefined;
        this.measure(element, setVisibleActionCount);
      });
    };

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(scheduleMeasurement);
      this.resizeObserver.observe(element);
    } else {
      window.addEventListener('resize', scheduleMeasurement);
    }

    scheduleMeasurement();

    return () => {
      window.removeEventListener('resize', scheduleMeasurement);
      this.cleanup();
    };
  }

  private measure(
    element: HTMLElement,
    setVisibleActionCount: (visibleActionCount: number) => void,
  ) {
    const actions = Array.from(
      element.querySelectorAll<HTMLElement>(ACTION_SELECTOR),
    );
    const overflow = element.querySelector<HTMLElement>(OVERFLOW_SELECTOR);
    const defaultActionWidth =
      parseFloat(
        getComputedStyle(element).getPropertyValue('--control-default-height'),
      ) || 45;

    this.actionWidths = actions.map((action, index) => {
      return (
        action.getBoundingClientRect().width ||
        action.querySelector('button')?.getBoundingClientRect().width ||
        this.actionWidths[index] ||
        defaultActionWidth
      );
    });
    const overflowControl = overflow?.querySelector('button');
    this.overflowWidth =
      overflowControl?.getBoundingClientRect().width ||
      overflowControl?.scrollWidth ||
      this.overflowWidth ||
      defaultActionWidth;

    const availableWidth =
      element.getBoundingClientRect().width || element.clientWidth;
    const gap = parseFloat(getComputedStyle(element).columnGap) || 0;
    const allActionsWidth =
      this.actionWidths.reduce((total, width) => total + width, 0) +
      gap * Math.max(0, this.actionWidths.length - 1);

    if (allActionsWidth <= availableWidth) {
      setVisibleActionCount(this.actionWidths.length);
      return;
    }

    let usedWidth = this.overflowWidth;
    let visibleActionCount = 0;

    for (const width of this.actionWidths) {
      const nextWidth = usedWidth + gap + width;
      if (nextWidth > availableWidth) break;

      usedWidth = nextWidth;
      visibleActionCount += 1;
    }

    setVisibleActionCount(visibleActionCount);
  }

  private cleanup() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;

    if (typeof this.measureFrame === 'number') {
      cancelAnimationFrame(this.measureFrame);
      this.measureFrame = undefined;
    }
  }
}
