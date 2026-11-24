type Point = readonly [x: number, y: number];

export function dispatchDrag(element: HTMLElement, start: Point, end: Point) {
  const phases = ['start', 'move', 'end'] as const;
  phases.forEach((phase, index) => {
    const [clientX, clientY] = phase === 'start' ? start : end;
    const options = { bubbles: true, cancelable: true };
    let event: Event;
    if ('ontouchstart' in window) {
      const touch = new Touch({
        identifier: 1,
        target: element,
        clientX,
        clientY,
      });
      const touches = phase === 'end' ? [] : [touch];
      event = new TouchEvent(`touch${phase}`, {
        ...options,
        touches,
        targetTouches: touches,
        changedTouches: [touch],
      });
    } else {
      const pointerPhase = { start: 'down', move: 'move', end: 'up' }[phase];
      event = new PointerEvent(`pointer${pointerPhase}`, {
        ...options,
        pointerId: 1,
        pointerType: 'mouse',
        clientX,
        clientY,
        buttons: phase === 'end' ? 0 : 1,
      });
    }
    // Drive distance thresholds without classifying the drag as a fast swipe.
    Object.defineProperty(event, 'timeStamp', { value: 100 + index * 300 });
    element.dispatchEvent(event);
  });
}
